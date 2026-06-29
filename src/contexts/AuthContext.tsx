import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { REFERRALS_PER_UNLOCK } from "@/config/lockedCategories";
import { siteConfig } from "@/seo/siteConfig";
import { Capacitor } from "@capacitor/core";
import { clearGuestMemoryCache } from "@/services/progressService";
import { toast } from "@/hooks/use-toast";

// Wraps a promise with a timeout so auth operations don't hang indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
        ),
    ]);
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
    isPremium: boolean;
    subscriptionStatus?: string;
    subscriptionId?: string;
    subscriptionPeriodEnd?: string;
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
        whatsappConsent?: boolean
    ) => Promise<{ error?: string }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signInWithGoogle: (referralCode?: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
    refreshProfile: () => Promise<void>;
    updateProfileSettings: (
        phone: string,
        phoneConsent: boolean,
        emailConsent: boolean,
        whatsappConsent: boolean,
        phoneVerified?: boolean,
        firstName?: string,
        lastName?: string
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
    const initialSessionHandled = useRef(false);

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
                        .select("referral_code, phone, phone_consent, email_consent, whatsapp_consent, phone_verified, first_name, last_name, subscription_status, subscription_id, subscription_period_end")
                        .eq("id", uid)
                        .maybeSingle(),
                    supabase.rpc("get_valid_referrals", { referrer_id: uid }),
                ]),
                6000,
                "Profile fetch"
            );

            const [profileResult, countResult] = result;
            const profile = profileResult.status === "fulfilled" ? (profileResult.value.data as any) : null;
            const count = countResult.status === "fulfilled" ? countResult.value.data : 0;

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
                isPremium,
                subscriptionStatus: profile?.subscription_status || "inactive",
                subscriptionId: profile?.subscription_id || "",
                subscriptionPeriodEnd: profile?.subscription_period_end || "",
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

        const handleSession = async (session: Session | null) => {
            if (session?.user) {
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
                const appUser = await fetchProfileData(session.user.id, session.user.email);
                if (!cancelled) setUser(appUser);
            } else {
                if (!cancelled) setUser(makeGuestUser());
            }
        };

        // Wrap the entire init in a hard timeout so mobile never hangs
        const initAuth = async () => {
            try {
                const { data: { session } } = await withTimeout(
                    supabase.auth.getSession(),
                    5000,
                    "getSession"
                );
                if (cancelled) return;
                await handleSession(session);
            } catch (err) {
                console.warn("Auth init failed (timeout or error):", err);
            } finally {
                if (!cancelled) {
                    initialSessionHandled.current = true;
                    stopLoading();
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: Session | null) => {
                // Skip the first INITIAL_SESSION event — already handled by initAuth above
                if (!initialSessionHandled.current) return;
                await handleSession(session);
            }
        );

        // Safety net: if everything is somehow still stuck after 3 seconds,
        // force-stop loading. Uses ref to avoid stale closure.
        const safetyTimeout = setTimeout(() => {
            if (isLoadingRef.current) {
                console.warn("Auth safety timeout fired — forcing loading=false");
                initialSessionHandled.current = true;
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
        whatsappConsent?: boolean
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
                    if (emailConsent !== undefined || phoneConsent !== undefined || phone !== undefined || whatsappConsent !== undefined) {
                        const { error: updateError } = await supabase.from("profiles")
                            .update({
                                email_consent: emailConsent,
                                phone: phone,
                                phone_consent: phoneConsent,
                                whatsapp_consent: whatsappConsent
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
        lastName?: string
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

            const { error } = await supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", user.id);

            if (error) throw error;
            
            await refreshProfile();
            return {};
        } catch (err: any) {
            console.error("Failed to update profile settings:", err);
            return { error: err.message || "Failed to update profile settings." };
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


