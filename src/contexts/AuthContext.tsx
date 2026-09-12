import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { REFERRALS_PER_UNLOCK } from "@/config/lockedCategories";
import { siteConfig } from "@/seo/siteConfig";
import { Capacitor } from "@capacitor/core";
import { clearGuestMemoryCache } from "@/services/progressService";
import { toast } from "@/hooks/use-toast";
import { isUserMode, type UserMode } from "@/config/userMode";
import { broadcastUserMode } from "@/hooks/useUserMode";
import {
    claimStudentCode,
    clearPendingStudentCodeClaim,
    readPendingStudentCodeClaim,
} from "@/services/institutionService";

// Wraps a promise with a timeout so auth operations don't hang indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}

function getProfileSaveErrorMessage(error: any): string {
    const message = typeof error?.message === "string" ? error.message : "";

    if (error?.code === "PGRST116" || /no rows|profile record/i.test(message)) {
        return "Your profile record could not be found. Please sign out, sign back in, and try again.";
    }
    if (error?.code === "42501" || /row-level security|permission denied/i.test(message)) {
        return "You do not have permission to update this profile. Please sign in again and try once more.";
    }
    if (/timed out|network|fetch/i.test(message)) {
        return "We could not reach the server. Check your connection and try again.";
    }

    return message || "Your changes could not be saved. Please try again.";
}

// ---------- types ----------
export interface AppUser {
    id: string;          // Supabase auth uid OR guest UUID
    email?: string;
    isGuest: boolean;
    referralCode?: string; // My code (only for logged-in users)
    unlockCount: number;   // How many valid referrals I have (0 for guests)
    phone?: string;
    phoneConsent?: boolean;
    emailConsent?: boolean;
    phoneVerified?: boolean;
    whatsappConsent?: boolean;
    firstName?: string;
    lastName?: string;
    degree?: string;
    academicYear?: string;
    hasLinkedCollege?: boolean;
    isPremium: boolean;
    subscriptionStatus?: string;
    subscriptionId?: string;
    subscriptionPeriodEnd?: string;
    userMode?: UserMode;
}

interface AuthContextType {
    user: AppUser;
    isLoading: boolean;
    signUp: (
        email: string,
        password: string,
        referralCode?: string,
        emailConsent?: boolean,
        phone?: string,
        phoneConsent?: boolean,
        whatsappConsent?: boolean,
        userMode?: UserMode
    ) => Promise<{ error?: string }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signInWithGoogle: (referralCode?: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
    refreshProfile: () => Promise<void>;
    updateUserMode: (mode: UserMode) => Promise<void>;
    updateProfileSettings: (
        phone: string,
        phoneConsent: boolean,
        emailConsent: boolean,
        whatsappConsent: boolean,
        phoneVerified?: boolean,
        firstName?: string,
        lastName?: string,
        degree?: string,
        academicYear?: string
    ) => Promise<{ error?: string }>;
    sendPhoneVerificationOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
    confirmPhoneVerificationOTP: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
}

const GUEST_KEY = "quiz_guest_id";

function getOrCreateGuestId(): string {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
        id = "guest_" + crypto.randomUUID();
        localStorage.setItem(GUEST_KEY, id);
    }
    return id;
}

function makeGuestUser(): AppUser {
    return {
        id: getOrCreateGuestId(),
        isGuest: true,
        unlockCount: 0,
        isPremium: false
    };
}

// ---------- context ----------
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser>(makeGuestUser());
    const [isLoading, setIsLoading] = useState(true);
    const isLoadingRef = useRef(true); // mirror for use in timeout closures
    // Helper: stop loading and update the ref mirror
    const stopLoading = useCallback(() => {
        isLoadingRef.current = false;
        setIsLoading(false);
    }, []);

    // Fetch extra profile data (referral code, unlock count)
    // Both queries run in PARALLEL with a 6s hard timeout to prevent mobile hangs
    const fetchProfileData = async (uid: string, email?: string): Promise<AppUser> => {
        if (!supabase) return { id: uid, email, isGuest: false, unlockCount: 0, isPremium: false };

        // Generate a deterministic fallback code from user ID
        // (used when profiles table doesn't exist yet)
        const fallbackCode = uid.replace(/-/g, "").slice(0, 6).toUpperCase();
        const fallbackUser: AppUser = { id: uid, email, isGuest: false, referralCode: fallbackCode, unlockCount: 0, isPremium: false };

        try {
            // Run both queries in parallel with a hard timeout
            const result = await withTimeout(
                Promise.allSettled([
                    supabase
                        .from("profiles")
                        .select("referral_code, phone, phone_consent, email_consent, whatsapp_consent, phone_verified, first_name, last_name, degree, academic_year, subscription_status, subscription_id, subscription_period_end, user_mode")
                        .eq("id", uid)
                        .maybeSingle(),
                    supabase.rpc("get_valid_referrals", { referrer_id: uid }),
                    supabase
                        .from("institution_members")
                        .select("institution_id")
                        .eq("user_id", uid)
                        .eq("role", "student")
                        .maybeSingle(),
                ]),
                6000,
                "Profile fetch"
            );

            const [profileResult, countResult, membershipResult] = result;
            const profile = profileResult.status === "fulfilled" ? (profileResult.value.data as any) : null;
            const count = countResult.status === "fulfilled" ? countResult.value.data : 0;
            const membership = membershipResult.status === "fulfilled" ? membershipResult.value.data : null;

            const isPremium = profile?.subscription_status === "active";

            return {
                id: uid,
                email,
                isGuest: false,
                referralCode: profile?.referral_code || fallbackCode,
                unlockCount: count || 0,
                phone: profile?.phone || "",
                phoneConsent: profile?.phone_consent ?? false,
                emailConsent: profile?.email_consent ?? false,
                phoneVerified: profile?.phone_verified ?? false,
                whatsappConsent: profile?.whatsapp_consent ?? false,
                firstName: profile?.first_name || "",
                lastName: profile?.last_name || "",
                degree: profile?.degree || "",
                academicYear: profile?.academic_year || "",
                hasLinkedCollege: !!membership,
                isPremium,
                subscriptionStatus: profile?.subscription_status || "inactive",
                subscriptionId: profile?.subscription_id || "",
                subscriptionPeriodEnd: profile?.subscription_period_end || "",
                userMode: isUserMode(profile?.user_mode) ? profile.user_mode : undefined,
            };
        } catch (err) {
            console.warn("Failed to load profile (timeout or error):", err);
            return fallbackUser;
        }
    };

    const refreshProfile = async () => {
        if (!user.isGuest && supabase) {
            const updated = await fetchProfileData(user.id, user.email);
            setUser(updated);
        }
    };

    // On mount, check for an existing Supabase session
    useEffect(() => {
        if (!isSupabaseConfigured() || !supabase) {
            stopLoading();
            return;
        }

        let cancelled = false;

        const handleDeepLink = async (urlStr: string) => {
            try {
                console.log("Processing deep link URL:", urlStr);
                const url = new URL(urlStr);
                
                // 1. PKCE flow code exchange
                const code = url.searchParams.get("code");
                if (code) {
                    console.log("Exchanging auth code for session...");
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error("Error exchanging code for session:", error.message);
                        toast({
                            title: "Authentication Failed",
                            description: error.message,
                            variant: "destructive"
                        });
                    } else {
                        console.log("Successfully logged in via deep link code!");
                    }
                    return;
                }

                // 2. Implicit flow session setup (hash params)
                if (url.hash) {
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    const accessToken = hashParams.get("access_token");
                    const refreshToken = hashParams.get("refresh_token");
                    if (accessToken && refreshToken) {
                        console.log("Setting session from hash parameters...");
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (error) {
                            console.error("Error setting session from hash:", error.message);
                            toast({
                                title: "Authentication Failed",
                                description: error.message,
                                variant: "destructive"
                            });
                        } else {
                            console.log("Successfully logged in via deep link hash!");
                        }
                    }
                }
            } catch (err: any) {
                console.error("Failed to handle deep link:", err);
            }
        };

        let sessionVersion = 0;

        const handleSession = async (session: Session, version: number) => {
            if (session.user) {
                const pendingCode = localStorage.getItem("pending_referral_code");
                if (pendingCode) {
                    try {
                        const { data: refSuccess } = await supabase.rpc("set_referrer", { code: pendingCode });
                        if (refSuccess) {
                            console.log("Pending referral code applied successfully!");
                        }
                    } catch (e) {
                        console.warn("Failed to apply pending referral code:", e);
                    } finally {
                        localStorage.removeItem("pending_referral_code");
                    }
                }
                const pendingStudentCode = readPendingStudentCodeClaim();
                if (pendingStudentCode) {
                    try {
                        const institutionName = await claimStudentCode(pendingStudentCode, session.user.id);
                        clearPendingStudentCodeClaim();
                        toast({
                            title: "College linked",
                            description: `You are now linked to ${institutionName}.`,
                        });
                    } catch (error: any) {
                        // Keep the code in local storage so the student can correct their
                        // college selection or code from Profile Settings after signing in.
                        toast({
                            title: "College code was not accepted",
                            description: error?.message || "Check the selected college and code, then try again in Profile Settings.",
                            variant: "destructive",
                        });
                    }
                }
                const appUser = await fetchProfileData(session.user.id, session.user.email);
                if (!cancelled && version === sessionVersion) setUser(appUser);
            }
        };

        // Supabase awaits auth callbacks while holding its auth lock. Keep this
        // callback synchronous: database/RPC calls here can deadlock sign-in.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: string, session: Session | null) => {
                if (event === "TOKEN_REFRESHED") return;
                const version = ++sessionVersion;
                if (!session?.user) {
                    setUser(makeGuestUser());
                    stopLoading();
                    return;
                }

                // The authenticated user is available immediately. Enrichment
                // runs after the callback returns and Supabase releases its lock.
                setUser((current) => current.id === session.user.id && !current.isGuest
                    ? current
                    : {
                        id: session.user.id,
                        email: session.user.email,
                        isGuest: false,
                        unlockCount: 0,
                        isPremium: false,
                    });
                stopLoading();
                setTimeout(() => {
                    if (!cancelled && version === sessionVersion) {
                        void handleSession(session, version);
                    }
                }, 0);
            }
        );

        // Safety net: if everything is somehow still stuck after 3 seconds,
        // force-stop loading. Uses ref to avoid stale closure.
        const safetyTimeout = setTimeout(() => {
            if (isLoadingRef.current) {
                console.warn("Auth safety timeout fired — forcing loading=false");
                stopLoading();
            }
        }, 3000);

        let appListener: any;
        if (Capacitor.isNativePlatform()) {
            import("@capacitor/app").then(({ App }) => {
                App.addListener("appUrlOpen", (event) => {
                    handleDeepLink(event.url);
                }).then((listener) => {
                    appListener = listener;
                });
            }).catch((err) => {
                console.error("Failed to load Capacitor App plugin:", err);
            });
        }

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
            if (appListener) {
                appListener.remove();
            }
        };
    }, []);

    // --- Sign Up ---
    const signUp = useCallback(async (
        email: string,
        password: string,
        referralCode?: string,
        emailConsent?: boolean,
        phone?: string,
        phoneConsent?: boolean,
        whatsappConsent?: boolean,
        userMode?: UserMode
    ): Promise<{ error?: string }> => {
        if (!supabase) return { error: "Supabase is not configured" };

        let data: any, error: any;
        try {
            const isNative = Capacitor.isNativePlatform();
            const redirectTo = isNative
                ? "com.truthswipe.app://callback"
                : window.location.origin;

            const result = await withTimeout(
                supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectTo,
                        data: {
                            phone: phone,
                            phone_consent: phoneConsent,
                            email_consent: emailConsent,
                            whatsapp_consent: whatsappConsent,
                            referred_by_code: referralCode,
                            user_mode: userMode,
                        }
                    }
                }),
                10000,
                "Sign up"
            );
            data = result.data;
            error = result.error;
        } catch (err: any) {
            return { error: err?.message || "An unexpected error occurred during signup." };
        }

        if (error) return { error: error.message };
        if (!data.user) return { error: "Signup succeeded but no user returned" };

        // Fire-and-forget: save email consent + referrer in the background.
        // Don't block the UI — the user sees success immediately.
        const updateProfile = async (retries = 3) => {
            if (!supabase || !data.user) return;
            for (let i = 0; i < retries; i++) {
                try {
                    if (emailConsent !== undefined || phoneConsent !== undefined || phone !== undefined || whatsappConsent !== undefined || userMode !== undefined) {
                        const { error: updateError } = await supabase.from("profiles")
                            .update({
                                email_consent: emailConsent,
                                phone: phone,
                                phone_consent: phoneConsent,
                                whatsapp_consent: whatsappConsent,
                                ...(userMode ? { user_mode: userMode } : {})
                            })
                            .eq("id", data.user.id);
                        
                        if (!updateError) {
                            if (referralCode) {
                                await supabase.rpc("set_referrer", { code: referralCode });
                            }
                            break;
                        }
                    } else if (referralCode) {
                        await supabase.rpc("set_referrer", { code: referralCode });
                        break;
                    } else {
                        break;
                    }
                } catch (err) {
                    console.warn(`Profile update retry ${i + 1} failed:`, err);
                }
                // Wait before retrying (shorter delay)
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        };

        // Run profile update completely in the background — don't block the modal
        updateProfile().catch(() => {});

        // Clear local storage and guest memory cache so that the new user starts fresh
        localStorage.removeItem("quiz_practiced_questions");
        clearGuestMemoryCache();

        // Apply the chosen mode locally straight away — the profile write above
        // is fire-and-forget, and the catalog should not wait on it.
        if (userMode) broadcastUserMode(userMode);

        return {};
    }, [user]);

    // --- Sign In ---
    const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
        if (!supabase) return { error: "Supabase is not configured" };

        let data: any, error: any;
        try {
            const result = await withTimeout(
                supabase.auth.signInWithPassword({ email, password }),
                10000,
                "Sign in"
            );
            data = result.data;
            error = result.error;
        } catch (err: any) {
            return { error: err?.message || "An unexpected error occurred during login." };
        }

        if (error) return { error: error.message };
        if (!data.user) return { error: "Login succeeded but no user returned" };

        // Clear local storage and guest memory cache so that the new user starts fresh
        localStorage.removeItem("quiz_practiced_questions");
        clearGuestMemoryCache();

        return {};
    }, [user]);

    // --- Sign Out ---
    const signOut = useCallback(async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        setUser(makeGuestUser());
    }, []);

    // --- Sign In With Google (OAuth) ---
    const signInWithGoogle = useCallback(async (refCode?: string): Promise<{ error?: string }> => {
        if (!supabase) return { error: "Supabase is not configured" };

        try {
            if (refCode) {
                localStorage.setItem("pending_referral_code", refCode);
            }

            // Clear local storage and guest memory cache so that the new user starts fresh
            localStorage.removeItem("quiz_practiced_questions");
            clearGuestMemoryCache();

            const isNative = Capacitor.isNativePlatform();
            const redirectTo = isNative
                ? "com.truthswipe.app://callback"
                : window.location.origin;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                    queryParams: {
                        prompt: "select_account"
                    },
                    data: refCode ? { referred_by_code: refCode } : undefined
                } as any
            });
            
            if (error) return { error: error.message };
            return {};
        } catch (err: any) {
            return { error: err?.message || "An unexpected error occurred during Google sign in." };
        }
    }, []);

    // --- Apply Referral Code (Post-signup) ---
    const applyReferralCode = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
        if (!supabase || user.isGuest) return { success: false, message: "Must be logged in" };

        try {
            const { data, error } = await supabase.rpc("set_referrer", { code });
            if (error) throw error;
            if (data === true) {
                return { success: true, message: "Referral applied!" };
            } else {
                return { success: false, message: "Invalid code or you already have a referrer." };
            }
        } catch (err: any) {
            return { success: false, message: err.message || "Failed to apply code" };
        }
    }, [user]);

    // --- Update Profile Settings (Phone, Consents and Name) ---
    const updateProfileSettings = useCallback(async (
        phone: string,
        phoneConsent: boolean,
        emailConsent: boolean,
        whatsappConsent: boolean,
        phoneVerified?: boolean,
        firstName?: string,
        lastName?: string,
        degree?: string,
        academicYear?: string
    ): Promise<{ error?: string }> => {
        if (!supabase || user.isGuest) return { error: "Must be logged in" };

        try {
            const updatePayload: any = {
                phone,
                phone_consent: phoneConsent,
                email_consent: emailConsent,
                whatsapp_consent: whatsappConsent,
            };
            if (phoneVerified !== undefined) {
                updatePayload.phone_verified = phoneVerified;
            }
            if (firstName !== undefined) {
                updatePayload.first_name = firstName;
            }
            if (lastName !== undefined) {
                updatePayload.last_name = lastName;
            }
            if (degree !== undefined) updatePayload.degree = degree.trim();
            if (academicYear !== undefined) updatePayload.academic_year = academicYear.trim();

            // Request the updated row back. Without `.select()`, PostgREST reports
            // a successful update even if RLS (or a missing profile) matches zero rows.
            const { data, error } = await supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", user.id)
                .select("id")
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                throw { code: "PGRST116", message: "No profile record was updated." };
            }
            
            await refreshProfile();
            return {};
        } catch (err: any) {
            console.error("Failed to update profile settings:", err);
            return { error: getProfileSaveErrorMessage(err) };
        }
    }, [user, refreshProfile]);

    // --- Send Phone Verification OTP (Real + Simulated Fallback) ---
    const sendPhoneVerificationOTP = useCallback(async (phone: string): Promise<{ success: boolean; error?: string }> => {
        if (!supabase || user.isGuest) return { success: false, error: "Must be logged in" };

        try {
            // 1. Try real Supabase auth phone update
            const { error } = await supabase.auth.updateUser({ phone });
            
            if (error) {
                // If it fails because SMS is not configured, fall back to mock verification.
                const errMsg = error.message.toLowerCase();
                const isConfigError = errMsg.includes("sms") || 
                                     errMsg.includes("provider") || 
                                     errMsg.includes("credentials") || 
                                     errMsg.includes("not configured") ||
                                     errMsg.includes("not activated");
                
                if (isConfigError) {
                    console.info("Supabase SMS provider not configured, falling back to simulated OTP flow.");
                    throw new Error("MOCK_FALLBACK");
                }
                
                throw error;
            }

            return { success: true };
        } catch (err: any) {
            if (err.message === "MOCK_FALLBACK") {
                // Generate a 6-digit OTP code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                sessionStorage.setItem("mock_otp_" + phone, code);
                
                toast({
                    title: "🧪 Dev Mode OTP Simulator",
                    description: `SMS OTP code sent to ${phone}: ${code}. Use this to verify.`,
                });
                
                return { success: true };
            }
            console.error("Failed to send phone OTP:", err);
            return { success: false, error: err.message || "Failed to send verification code." };
        }
    }, [user]);

    // --- Confirm Phone Verification OTP ---
    const confirmPhoneVerificationOTP = useCallback(async (phone: string, token: string): Promise<{ success: boolean; error?: string }> => {
        if (!supabase || user.isGuest) return { success: false, error: "Must be logged in" };

        try {
            const mockCode = sessionStorage.getItem("mock_otp_" + phone);
            
            if (mockCode) {
                if (token === mockCode) {
                    sessionStorage.removeItem("mock_otp_" + phone);
                    
                    // Persist to profiles
                    const { error } = await supabase
                        .from("profiles")
                        .update({
                            phone,
                            phone_verified: true
                        })
                        .eq("id", user.id);
                    
                    if (error) throw error;
                    
                    await refreshProfile();
                    return { success: true };
                } else {
                    return { success: false, error: "Invalid verification code." };
                }
            }

            // Real Supabase OTP verification
            const { error } = await supabase.auth.verifyOtp({
                phone,
                token,
                type: 'phone_change'
            });

            if (error) throw error;

            // Persist verified phone status to profiles table
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    phone,
                    phone_verified: true
                })
                .eq("id", user.id);

            if (profileError) throw profileError;

            await refreshProfile();
            return { success: true };
        } catch (err: any) {
            console.error("Failed to verify phone OTP:", err);
            return { success: false, error: err.message || "Verification failed." };
        }
    }, [user, refreshProfile]);

    // --- User mode (Student / Professional) ---
    const updateUserMode = useCallback(async (mode: UserMode): Promise<void> => {
        // Local first: switching modes should feel instant and must keep working
        // for guests and offline users, who have no profile row to write to.
        broadcastUserMode(mode);
        setUser((prev) => ({ ...prev, userMode: mode }));

        if (!supabase || user.isGuest) return;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ user_mode: mode })
                .eq("id", user.id);
            if (error) throw error;
        } catch (err) {
            // The local switch stands; it will re-sync on the next profile write.
            console.warn("Could not persist user_mode to profile:", err);
        }
    }, [user.id, user.isGuest]);

    // The account is the source of truth once a profile has loaded, so a user
    // signing in on a new device gets the mode they chose, not this device's.
    useEffect(() => {
        if (!user.isGuest && user.userMode) {
            broadcastUserMode(user.userMode);
        }
    }, [user.isGuest, user.userMode]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            signUp,
            signIn,
            signInWithGoogle,
            signOut,
            applyReferralCode,
            refreshProfile,
            updateUserMode,
            updateProfileSettings,
            sendPhoneVerificationOTP,
            confirmPhoneVerificationOTP
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside AuthProvider");
    return ctx;
}


