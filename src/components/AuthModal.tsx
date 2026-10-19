import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    AlertCircle,
    Loader2,
    ChevronDown,
    Eye,
    EyeOff,
    Sparkles,
    KeyRound,
    UserPlus,
    LogIn,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserModeSelect from "@/components/UserModeSelect";
import { getStoredUserMode, type UserMode } from "@/config/userMode";
import { broadcastUserMode } from "@/hooks/useUserMode";
import {
    emptyInstitutionEnrollment,
    InstitutionEnrollmentFields,
    toStudentCodeClaim,
    type InstitutionEnrollmentValue,
} from "@/components/InstitutionEnrollmentFields";
import { storePendingStudentCodeClaim } from "@/services/institutionService";
import { toast } from "@/hooks/use-toast";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = "login" | "signup";

const formatAuthError = (errMessage: string): string => {
    const lower = errMessage.toLowerCase();
    if (
        lower.includes("rate limit") ||
        lower.includes("too many requests") ||
        lower.includes("security purposes") ||
        lower.includes("error sending confirmation email")
    ) {
        return "Email signup limit reached or SMTP error. Supabase's default provider limits SMTP emails to 4 per hour. Please use 'Google Sign-In', wait a while, or disable email verification in your Supabase Dashboard.";
    }
    return errMessage;
};

const labelClass = "block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold";
const inputClass =
    "w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md transition-all";

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const { user, signIn, signUp, signInWithGoogle } = useAuth();
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [referralCode, setReferralCode] = useState(() => {
        return localStorage.getItem("pending_referral_code") || "";
    });
    const [userMode, setUserMode] = useState<UserMode | null>(() => getStoredUserMode());
    const [emailConsent, setEmailConsent] = useState(false);
    const [whatsappConsent, setWhatsappConsent] = useState(false);
    const [phone, setPhone] = useState("");
    const [institutionEnrollment, setInstitutionEnrollment] = useState<InstitutionEnrollmentValue>(emptyInstitutionEnrollment);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [collegeOpen, setCollegeOpen] = useState(false);

    // Session changes also arrive through OAuth/deep links or after a request
    // times out. Close using the committed auth state so the app is ready.
    useEffect(() => {
        if (isOpen && !user.isGuest) {
            setPassword("");
            setError("");
            setSuccess("");
            setLoading(false);
            setGoogleLoading(false);
            onClose();
        }
    }, [isOpen, user.isGuest, onClose]);

    const handleUserModeChange = (mode: UserMode) => {
        setUserMode(mode);
        if (mode !== "student") {
            setInstitutionEnrollment(emptyInstitutionEnrollment);
            setCollegeOpen(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setShowPassword(false);
        setReferralCode("");
        setUserMode(getStoredUserMode());
        setEmailConsent(false);
        setWhatsappConsent(false);
        setPhone("");
        setInstitutionEnrollment(emptyInstitutionEnrollment);
        setError("");
        setSuccess("");
        setCollegeOpen(false);
    };

    const toggleTab = (newTab: Tab) => {
        setTab(newTab);
        resetForm();
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setSuccess("");
        setGoogleLoading(true);

        if (tab === "signup" && userMode) broadcastUserMode(userMode);
        const studentCodeClaim = tab === "signup" ? toStudentCodeClaim(institutionEnrollment) : null;
        if (tab === "signup" && (institutionEnrollment.institutionId || institutionEnrollment.code || institutionEnrollment.rollNumber)) {
            if (!studentCodeClaim) {
                setCollegeOpen(true);
                setError("Select your college, enter your roll number, and enter the student code from your TPO.");
                setGoogleLoading(false);
                return;
            }
            storePendingStudentCodeClaim(studentCodeClaim);
        }

        // Auto-reset googleLoading after 5s so the button never stays frozen
        const safetyTimer = setTimeout(() => {
            setGoogleLoading(false);
        }, 5000);

        try {
            const result = await signInWithGoogle(referralCode.trim() || undefined);
            if (result.error) {
                clearTimeout(safetyTimer);
                setError(formatAuthError(result.error));
                setGoogleLoading(false);
            } else {
                setSuccess("Redirecting to Google...");
            }
        } catch (err: unknown) {
            clearTimeout(safetyTimer);
            const message = err instanceof Error ? err.message : "Google Sign-In failed.";
            setError(formatAuthError(message));
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (tab === "signup") {
            if (!userMode) {
                setError("Please tell us whether you're a student or a working professional");
                return;
            }
            if (whatsappConsent && !phone.trim()) {
                setError("Please enter a phone number to receive WhatsApp updates");
                return;
            }
            if (phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
                setError("Please enter a valid phone number (e.g. +15550000000)");
                return;
            }
        }

        const studentCodeClaim = tab === "signup" ? toStudentCodeClaim(institutionEnrollment) : null;
        if (tab === "signup" && (institutionEnrollment.institutionId || institutionEnrollment.code || institutionEnrollment.rollNumber)) {
            if (!studentCodeClaim) {
                setCollegeOpen(true);
                setError("Select your college, enter your roll number, and enter the student code from your TPO.");
                return;
            }
            storePendingStudentCodeClaim(studentCodeClaim);
        }

        setLoading(true);

        // Auto-reset loading after 5s so the submit button never gets stuck in a spinner
        const safetyTimer = setTimeout(() => {
            setLoading(false);
            setError("Request is taking longer than expected. Please check your network connection.");
        }, 5000);

        try {
            if (tab === "login") {
                const result = await signIn(email, password);
                clearTimeout(safetyTimer);
                if (result.error) {
                    setError(formatAuthError(result.error));
                }
            } else {
                const result = await signUp(
                    email,
                    password,
                    referralCode.trim() || undefined,
                    emailConsent,
                    phone.trim() || undefined,
                    false,
                    whatsappConsent,
                    userMode ?? undefined
                );
                clearTimeout(safetyTimer);
                if (result.error) {
                    setError(formatAuthError(result.error));
                } else if (result.session) {
                    toast({
                        title: "Welcome to Skillful!",
                        description: "Your account has been created and you're signed in.",
                    });
                } else {
                    setSuccess("Account created! Check your email to confirm your account.");
                }
            }
        } catch (err: any) {
            clearTimeout(safetyTimer);
            setError(formatAuthError(err?.message || "An unexpected error occurred."));
        } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: "spring", damping: 26, stiffness: 360 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[420px] max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl border border-border bg-card p-6 shadow-2xl"
                    >
                        {/* Ambient glow */}
                        <div
                            className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
                            aria-hidden
                        />

                        {/* Top Header Bar */}
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Skillful Account
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Title */}
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                                {tab === "login" ? (
                                    <>
                                        <KeyRound className="w-5 h-5 text-primary" />
                                        <span>Welcome back</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        <span>Create your account</span>
                                    </>
                                )}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {tab === "login"
                                    ? "Sign in to resume quests, sync stats, and climb ranks"
                                    : "Build skills with interactive quests and AI mentorship"}
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex rounded-lg bg-muted p-1 mb-5">
                            <button
                                type="button"
                                onClick={() => toggleTab("login")}
                                className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                                    tab === "login"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Sign In</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleTab("signup")}
                                className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                                    tab === "signup"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Create Account</span>
                            </button>
                        </div>

                        {/* Google Sign-in */}
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading || googleLoading}
                                className="w-full h-10.5 py-2.5 px-3 flex items-center justify-center gap-2.5 border border-border/90 bg-card hover:bg-muted/40 active:translate-y-[1px] text-xs sm:text-sm font-medium text-foreground rounded-md disabled:opacity-50 transition-all shadow-[0_2px_0_hsl(var(--border)),0_4px_8px_-2px_rgba(0,0,0,0.04)] active:shadow-none"
                            >
                                {googleLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                <span>Continue with Google</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative flex items-center justify-center my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/70" />
                            </div>
                            <div className="relative bg-card px-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                                OR AUTHENTICATE WITH EMAIL
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelClass} htmlFor="auth-email">
                                    Email
                                </label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className={labelClass} htmlFor="auth-password" style={{ marginBottom: 0 }}>
                                        Password
                                    </label>
                                    <span className="text-[10px] font-mono text-muted-foreground/60">
                                        {tab === "signup" ? "MIN 6 CHARACTERS" : ""}
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        id="auth-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={tab === "login" ? "current-password" : "new-password"}
                                        className={`${inputClass} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/70 hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {tab === "signup" && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-4"
                                    >
                                        <div className="space-y-2 pt-1">
                                            <label className={labelClass}>Where are you right now?</label>
                                            <p className="text-[11px] text-muted-foreground/80 -mt-1">
                                                This picks your skill catalog. You can change it any time in Settings.
                                            </p>
                                            <div className="overflow-hidden rounded-md border border-border">
                                                <UserModeSelect
                                                    value={userMode}
                                                    onChange={handleUserModeChange}
                                                    variant="rows"
                                                    disabled={loading || googleLoading}
                                                />
                                            </div>
                                        </div>

                                        {userMode === "student" && (
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCollegeOpen((open) => !open)}
                                                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/50"
                                                >
                                                    <span>
                                                        Link your college
                                                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                            (optional)
                                                        </span>
                                                    </span>
                                                    <ChevronDown
                                                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collegeOpen ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                                <AnimatePresence initial={false}>
                                                    {collegeOpen && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <InstitutionEnrollmentFields
                                                                value={institutionEnrollment}
                                                                onChange={setInstitutionEnrollment}
                                                                disabled={loading || googleLoading}
                                                                variant="minimal"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        <div>
                                            <label className={labelClass} htmlFor="auth-referral">
                                                Referral code{" "}
                                                <span className="text-muted-foreground/60 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                id="auth-referral"
                                                type="text"
                                                placeholder="Enter 6-digit code"
                                                value={referralCode}
                                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                                maxLength={6}
                                                className={`${inputClass} uppercase tracking-widest font-mono`}
                                            />
                                        </div>

                                        <label className="flex items-start gap-3 cursor-pointer group py-1">
                                            <input
                                                type="checkbox"
                                                checked={emailConsent}
                                                onChange={() => setEmailConsent(!emailConsent)}
                                                className="mt-0.5 h-4 w-4 shrink-0 rounded-none border border-border bg-background accent-primary"
                                            />
                                            <span className="text-xs text-muted-foreground leading-snug">
                                                I consent to receive promotional emails with news and feature updates.
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group py-1">
                                            <input
                                                type="checkbox"
                                                checked={whatsappConsent}
                                                onChange={() => setWhatsappConsent(!whatsappConsent)}
                                                className="mt-0.5 h-4 w-4 shrink-0 rounded-none border border-border bg-background accent-primary"
                                            />
                                            <span className="text-xs text-muted-foreground leading-snug">
                                                I consent to learning reminders via WhatsApp.
                                            </span>
                                        </label>

                                        {whatsappConsent && (
                                            <div>
                                                <label className={labelClass} htmlFor="auth-phone">
                                                    Phone number
                                                </label>
                                                <input
                                                    id="auth-phone"
                                                    type="tel"
                                                    placeholder="+1 (555) 000-0000"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="flex items-start gap-2.5 px-3 py-2.5 border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono rounded-md shadow-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                                        <span className="leading-snug">{error}</span>
                                    </motion.div>
                                )}
                                {success && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="flex items-start gap-2.5 px-3 py-2.5 border border-success/40 bg-success/10 text-success text-xs font-mono rounded-md shadow-sm"
                                    >
                                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-success" />
                                        <span className="leading-snug">{success}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={loading || googleLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Signing In...</span>
                                        </>
                                    ) : tab === "login" ? (
                                        <>
                                            <span>Sign In</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Create Account</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {tab === "signup" && (
                                <p className="text-[11px] text-muted-foreground text-center">
                                    By signing up, you agree to our{" "}
                                    <Link
                                        to="/privacy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-foreground underline underline-offset-2 hover:text-muted-foreground"
                                    >
                                        Privacy Policy
                                    </Link>
                                    .
                                </p>
                            )}
                        </form>

                        <div className="mt-6 pt-4 border-t border-border/50 text-center">
                            <p className="text-xs text-muted-foreground">
                                {tab === "login" ? (
                                    <>
                                        Don&apos;t have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => toggleTab("signup")}
                                            className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                                        >
                                            Create one here
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => toggleTab("login")}
                                            className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                                        >
                                            Sign in here
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AuthModal;

