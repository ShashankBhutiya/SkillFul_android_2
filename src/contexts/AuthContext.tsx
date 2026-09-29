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
import { isInterviewSubscriptionActive, type SubscriptionTier } from "@/config/subscriptionTiers";
import {
    claimStudentCode,
    clearPendingStudentCodeClaim,
    formatStudentCodeClaimError,
    getLinkedInstitution,
    readPendingStudentCodeClaim,
    type LinkedInstitution,
} from "@/services/institutionService";

// Wraps a promise with a timeout so auth operations don't hang indefinitely
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
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
    const details = typeof error?.details === "string" ? error.details : "";

    if (error?.code === "PGRST116" || /no rows|profile record/i.test(message)) {
        return "Your profile record could not be found. Please sign out, sign back in, and try again.";
    }
    if (error?.code === "42501" || /row-level security|permission denied/i.test(message)) {
        return "You do not have permission to update this profile. Please sign in again and try once more.";
    }
    if (/timed out|abort/i.test(`${message} ${details}`)) {
        return "The profile save timed out. Check your connection and try again.";
    }
    if (/network|failed to fetch|fetch failed/i.test(`${message} ${details}`)) {
        return "The profile save could not connect to the server. Check your connection and try again.";
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
    linkedCollege?: LinkedInstitution | null;
    isPremium: boolean;
    subscriptionStatus?: string;
    subscriptionId?: string;
    subscriptionPeriodEnd?: string;
    subscriptionTier?: SubscriptionTier;
    hasInterviewAccess?: boolean;
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
    ) => Promise<{ error?: string; session?: Session | null; user?: User | null }>;
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
        firstName?: string,
        lastName?: string,
        degree?: string,
        academicYear?: string
    ) => Promise<{ error?: string }>;
}

export const TRIAL_DURATION_DAYS = 30;
export const GUEST_TRIAL_START_KEY = "skillful_guest_trial_start";

/**
 * Checks whether a subscription or free trial is currently active and unexpired.
 */
export function isSubscriptionActive(
    status?: string | null,
    periodEnd?: string | null
): boolean {
    if (!status) return false;
    const validStatuses = ["active", "trialing"];
    if (!validStatuses.includes(status)) return false;

    if (periodEnd) {
        const endMs = new Date(periodEnd).getTime();
        if (!isNaN(endMs) && endMs <= Date.now()) {
            return false;
        }
    }
    return true;
}

/**
 * Retrieves the 30-day free trial state for guest users.
 */
export function getGuestTrialState(): {
    isPremium: boolean;
    subscriptionStatus: string;
    subscriptionPeriodEnd: string;
} {
    let startStr: string | null = null;
    try {
        startStr = localStorage.getItem(GUEST_TRIAL_START_KEY);
        if (!startStr) {
            startStr = new Date().toISOString();
            localStorage.setItem(GUEST_TRIAL_START_KEY, startStr);
        }
    } catch {
        startStr = new Date().toISOString();
    }

    const startTime = new Date(startStr).getTime();
    const durationMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const endTime = (isNaN(startTime) ? Date.now() : startTime) + durationMs;
    const isPremium = Date.now() < endTime;
    return {
        isPremium,
        subscriptionStatus: isPremium ? "trialing" : "expired",
        subscriptionPeriodEnd: new Date(endTime).toISOString(),
    };
}

const GUEST_KEY = "quiz_guest_id";

function getOrCreateGuestId(): string {
    let id: string | null = null;
    try {
        id = localStorage.getItem(GUEST_KEY);
        if (!id) {
            id = "guest_" + crypto.randomUUID();
            localStorage.setItem(GUEST_KEY, id);
        }
    } catch {
        id = "guest_" + crypto.randomUUID();
    }
    return id;
}

function makeGuestUser(): AppUser {
    const trial = getGuestTrialState();
    return {
        id: getOrCreateGuestId(),
        isGuest: true,
        unlockCount: 0,
        isPremium: trial.isPremium,
        subscriptionStatus: trial.subscriptionStatus,
        subscriptionPeriodEnd: trial.subscriptionPeriodEnd,
    };
}

// ---------- context ----------
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser>(makeGuestUser());
    const userRef = useRef(user);
    const [isLoading, setIsLoading] = useState(true);
    const isLoadingRef = useRef(true); // mirror for use in timeout closures
    // Helper: stop loading and update the ref mirror
    const stopLoading = useCallback(() => {
        isLoadingRef.current = false;
        setIsLoading(false);
    }, []);

    // Fetch extra profile data (referral code, unlock count)
    // Both queries run in PARALLEL with a 6s hard timeout to prevent mobile hangs
    const fetchProfileData = async (uid: string, email?: string, previous?: AppUser): Promise<AppUser> => {
        if (!supabase) return { id: uid, email, isGuest: false, unlockCount: 0, isPremium: false };

        // Generate a deterministic fallback code from user ID
        // (used when profiles table doesn't exist yet)
        const fallbackCode = uid.replace(/-/g, "").slice(0, 6).toUpperCase();
        // A refresh is enrichment, not a reason to blank data that is already on
        // screen. Preserve the last confirmed state when an individual request
        // fails or the whole profile fetch times out.
        const fallbackUser: AppUser = previous?.id === uid && !previous.isGuest
            ? { ...previous, email: email ?? previous.email }
            : { id: uid, email, isGuest: false, referralCode: fallbackCode, unlockCount: 0, isPremium: false };

        try {
            // Run both queries in parallel with a hard timeout
            const result = await withTimeout(
                Promise.allSettled([
                    supabase
                        .from("profiles")
                        .select("referral_code, phone, phone_consent, email_consent, whatsapp_consent, phone_verified, first_name, last_name, degree, academic_year, subscription_status, subscription_id, subscription_period_end, subscription_tier, user_mode")
                        .eq("id", uid)
                        .maybeSingle(),
                    supabase.rpc("get_valid_referrals", { referrer_id: uid }),
                    supabase
                        .from("institution_members")
                        .select("institution_id")
                        .eq("user_id", uid)
                        .eq("role", "student")
                        .maybeSingle(),
                    getLinkedInstitution(),
                ]),
                3500,
                "Profile fetch"
            );

            const [profileResult, countResult, membershipResult, linkedCollegeResult] = result;
            const profile = profileResult.status === "fulfilled" && !profileResult.value.error
                ? (profileResult.value.data as any)
                : undefined;
            const count = countResult.status === "fulfilled" && !countResult.value.error
                ? countResult.value.data
                : fallbackUser.unlockCount;
            const membershipKnown = membershipResult.status === "fulfilled" && !membershipResult.value.error;
            const membership = membershipKnown ? membershipResult.value.data : undefined;
            const linkedCollege = linkedCollegeResult.status === "fulfilled"
                ? linkedCollegeResult.value
                : undefined;

            const membershipCollege = membership?.institution_id ? {
                id: membership.institution_id,
                name: "Linked college",
                city: null,
                rollNumber: null,
            } : null;
            const resolvedCollege = linkedCollege ?? membershipCollege;
            const hasLinkedCollege = resolvedCollege
                ? true
                : membershipKnown
                    ? false
                    : fallbackUser.hasLinkedCollege;

            let resolvedStatus = profile?.subscription_status || "inactive";
            let resolvedPeriodEnd = profile?.subscription_period_end || "";

            // Option A: If an existing registered user has no subscription status or is inactive with no period end,
            // initialize their 30-day trial starting now.
            if (profile && (!profile.subscription_status || profile.subscription_status === "inactive") && !profile.subscription_period_end) {
                resolvedStatus = "trialing";
                resolvedPeriodEnd = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
                if (supabase && typeof (supabase as any).from === "function") {
                    try {
                        const table = supabase.from("profiles");
                        if (table && typeof table.update === "function") {
                            table
                                .update({
                                    subscription_status: "trialing",
                                    subscription_period_end: resolvedPeriodEnd,
                                })
                                .eq("id", uid)
                                .then(({ error }: any) => {
                                    if (error) console.warn("Could not set trial for existing user:", error);
                                });
                        }
                    } catch (e) {
                        console.warn("Error updating user trial:", e);
                    }
                }
            }

            const isPremium = isSubscriptionActive(resolvedStatus, resolvedPeriodEnd);
            const subscriptionTier: SubscriptionTier = profile?.subscription_tier === "interview" ? "interview" : "basic";
            const hasInterviewAccess = isInterviewSubscriptionActive(
                resolvedStatus,
                resolvedPeriodEnd,
                subscriptionTier,
            );

            return {
                ...fallbackUser,
                referralCode: profile ? (profile.referral_code || fallbackCode) : fallbackUser.referralCode,
                unlockCount: count || 0,
                ...(profile ? {
                    phone: profile.phone || "",
                    phoneConsent: profile.phone_consent ?? false,
                    emailConsent: profile.email_consent ?? false,
                    phoneVerified: profile.phone_verified ?? false,
                    whatsappConsent: profile.whatsapp_consent ?? false,
                    firstName: profile.first_name ?? fallbackUser.firstName ?? "",
                    lastName: profile.last_name ?? fallbackUser.lastName ?? "",
                    degree: profile.degree ?? fallbackUser.degree ?? "",
                    academicYear: profile.academic_year ?? fallbackUser.academicYear ?? "",
                    isPremium,
                    subscriptionStatus: isPremium ? resolvedStatus : (resolvedStatus === "trialing" ? "expired" : resolvedStatus),
                    subscriptionId: profile.subscription_id || "",
                    subscriptionPeriodEnd: resolvedPeriodEnd,
                    subscriptionTier,
                    hasInterviewAccess,
                    userMode: isUserMode(profile.user_mode) ? profile.user_mode : fallbackUser.userMode,
                } : {}),
                hasLinkedCollege,
                linkedCollege: resolvedCollege ?? (membershipKnown ? null : fallbackUser.linkedCollege),
            };
        } catch (err) {
            console.warn("Failed to load profile (timeout or error):", err);
            return fallbackUser;
        }
    };

    const refreshProfile = async () => {
        const current = userRef.current;
        if (!current.isGuest && supabase) {
            const updated = await fetchProfileData(current.id, current.email, current);
            userRef.current = updated;
            setUser(updated);
        }
    };

    useEffect(() => {
        userRef.current = user;
    }, [user]);

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
                        // Invalid or spent codes cannot succeed on a later sign-in. Keep
                        // pending claims only when the request may have failed temporarily.
                        const studentCodeError = formatStudentCodeClaimError(error);
                        if (/invalid for the selected college|already linked to another college|roll number/i.test(error?.message || "")) {
                            clearPendingStudentCodeClaim();
                        }
                        toast({
                            title: "College code was not accepted",
                            description: studentCodeError,
                            variant: "destructive",
                        });
                    }
                }
                const appUser = await fetchProfileData(
                    session.user.id,
                    session.user.email,
                    userRef.current.id === session.user.id ? userRef.current : undefined,
                );
                if (!cancelled && version === sessionVersion) {
                    userRef.current = appUser;
                    setUser(appUser);
                    stopLoading();
                }
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

        const initializeSession = async () => {
            const initialVersion = sessionVersion;
            try {
                const { data, error } = await withTimeout(
                    supabase.auth.getSession(),
                    3000,
                    "Get session"
                );
                if (error) throw error;
                // A newer auth event wins over this startup snapshot.
                if (cancelled || initialVersion !== sessionVersion) return;

                const session = data.session;
                const version = ++sessionVersion;
                if (!session?.user) {
                    if (!cancelled) {
                        setUser(makeGuestUser());
                        stopLoading();
                    }
                    return;
                }

                if (!cancelled) {
                    setUser({
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
            } catch (error: any) {
                console.error("Failed to initialize auth session:", error);
                if (!cancelled) stopLoading();
            }
        };

        void initializeSession();

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
    ): Promise<{ error?: string; session?: Session | null; user?: User | null }> => {
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
                4500,
                "Sign up"
            );
            data = result.data;
            error = result.error;
        } catch (err: any) {
            const isTimeout = /timed out/i.test(err?.message || "");
            return {
                error: isTimeout
                    ? "Sign-up request timed out. Please check your connection and try again."
                    : (err?.message || "An unexpected error occurred during signup.")
            };
        }

        if (error) return { error: error.message };
        if (!data.user) return { error: "Signup succeeded but no user returned" };

        // If a session was returned (auto-confirm or email verification disabled),
        // make user immediately active and stop loading so the UI is unblocked instantly.
        if (data.session?.user) {
            setUser((current) => current.id === data.session.user.id && !current.isGuest
                ? current
                : {
                    id: data.session.user.id,
                    email: data.session.user.email,
                    isGuest: false,
                    unlockCount: 0,
                    isPremium: false,
                });
            stopLoading();
        }

        // Fire-and-forget: save email consent + referrer in the background.
        // Don't block the UI — the user sees success immediately.
        const updateProfile = async (retries = 2) => {
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
                await new Promise((resolve) => setTimeout(resolve, 300));
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

        return { session: data.session, user: data.user };
    }, [user]);

    // --- Sign In ---
    const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
        if (!supabase) return { error: "Supabase is not configured" };

        let data: any, error: any;
        try {
            const result = await withTimeout(
                supabase.auth.signInWithPassword({ email, password }),
                5000,
                "Sign in"
            );
            data = result.data;
            error = result.error;
        } catch (err: any) {
            const isTimeout = /timed out/i.test(err?.message || "");
            return {
                error: isTimeout
                    ? "Sign-in timed out. Please check your connection and try again."
                    : (err?.message || "An unexpected error occurred during login.")
            };
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
                : `${window.location.origin}/auth/callback`;

            const result = await withTimeout(
                supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo,
                        queryParams: {
                            prompt: "select_account"
                        },
                        data: refCode ? { referred_by_code: refCode } : undefined
                    } as any
                }),
                6000,
                "Google sign in"
            );

            if (result.error) return { error: result.error.message };
            return {};
        } catch (err: any) {
            const isTimeout = /timed out/i.test(err?.message || "");
            return {
                error: isTimeout
                    ? "Google sign-in timed out. Please check your connection and try again."
                    : (err?.message || "An unexpected error occurred during Google sign in.")
            };
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
            const saveProfile = () => supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", user.id)
                .select("id, phone, phone_consent, email_consent, whatsapp_consent, phone_verified, first_name, last_name, degree, academic_year")
                .maybeSingle();
            let { data, error } = await saveProfile();
            // Repeating the same update is safe if the first request lost its response.
            if (error && /timed out|abort|network|failed to fetch|fetch failed/i.test(`${error.message} ${error.details || ""}`)) {
                ({ data, error } = await saveProfile());
            }

            if (error) throw error;
            if (!data) {
                throw { code: "PGRST116", message: "No profile record was updated." };
            }
            
            setUser(current => {
                if (current.id !== user.id) return current;
                const updated = {
                    ...current,
                    phone: data.phone || "",
                    phoneConsent: data.phone_consent ?? false,
                    emailConsent: data.email_consent ?? false,
                    whatsappConsent: data.whatsapp_consent ?? false,
                    phoneVerified: data.phone_verified ?? false,
                    firstName: data.first_name || "",
                    lastName: data.last_name || "",
                    degree: data.degree || "",
                    academicYear: data.academic_year || "",
                };
                // College claiming refreshes immediately after saving these
                // fields, before React necessarily commits another render.
                userRef.current = updated;
                return updated;
            });
            return {};
        } catch (err: any) {
            console.error("Failed to update profile settings:", err);
            return { error: getProfileSaveErrorMessage(err) };
        }
    }, [user]);

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
            updateProfileSettings
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


