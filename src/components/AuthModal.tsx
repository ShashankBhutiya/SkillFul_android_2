import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, Users, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserModeSelect from "@/components/UserModeSelect";
import { getStoredUserMode, type UserMode } from "@/config/userMode";
import { broadcastUserMode } from "@/hooks/useUserMode";

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

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [referralCode, setReferralCode] = useState(() => {
        return localStorage.getItem("pending_referral_code") || "";
    });
    const [userMode, setUserMode] = useState<UserMode | null>(() => getStoredUserMode());
    const [emailConsent, setEmailConsent] = useState(false);
    const [whatsappConsent, setWhatsappConsent] = useState(false);
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [success, setSuccess] = useState("");

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setReferralCode("");
        setUserMode(getStoredUserMode());
        setEmailConsent(false);
        setWhatsappConsent(false);
        setPhone("");
        setError("");
        setSuccess("");
    };

    const toggleTab = (newTab: Tab) => {
        setTab(newTab);
        resetForm();
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setSuccess("");
        setGoogleLoading(true);

        // OAuth navigates away, so stash the choice locally first. localStorage
        // survives the redirect and AuthContext only overrides it if the loaded
        // profile already has a mode of its own.
        if (tab === "signup" && userMode) broadcastUserMode(userMode);

        try {
            const result = await signInWithGoogle(referralCode.trim() || undefined);
            if (result.error) {
                setError(formatAuthError(result.error));
                setGoogleLoading(false);
            } else {
                setSuccess("Redirecting to Google...");
            }
        } catch (err: any) {
            setError(formatAuthError(err?.message || "Google Sign-In failed."));
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

        setLoading(true);

        // Safety: force-stop loading after 15s on mobile to prevent infinite spinner
        const safetyTimer = setTimeout(() => {
            setLoading(false);
            setError("Request timed out. Please check your connection and try again.");
        }, 15000);

        try {
            if (tab === "login") {
                const result = await signIn(email, password);
                if (result.error) {
                    setError(formatAuthError(result.error));
                } else {
                    setSuccess("Welcome back! 🎉");
                    setTimeout(() => { onClose(); resetForm(); }, 1000);
                }
            } else {
                const result = await signUp(
                    email,
                    password,
                    referralCode.trim() || undefined,
                    emailConsent,
                    phone.trim() || undefined,
                    false, // phoneConsent (SMS updates) is false initially
                    whatsappConsent,
                    userMode ?? undefined
                );
                if (result.error) {
                    setError(formatAuthError(result.error));
                } else {
                    setSuccess("Account created! Check your email to confirm. 📬");
                    setTimeout(() => { onClose(); resetForm(); }, 2000);
                }
            }
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Header */}
                    <div className="px-6 pt-8 pb-4 text-center">
                        <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                            {tab === "login" ? "Welcome Back" : "Start Your Journey"}
                        </h2>
                        <p className="text-sm text-muted-foreground font-body">
                            {tab === "login"
                                ? "Sign in to continue your progress"
                                : "Create an account to save your stats"}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="mx-6 flex bg-muted/40 rounded-xl p-1 mb-6 border border-white/5">
                        <button
                            onClick={() => toggleTab("login")}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all flex items-center justify-center gap-1.5 ${tab === "login"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                }`}
                        >
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </button>
                        <button
                            onClick={() => toggleTab("signup")}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all flex items-center justify-center gap-1.5 ${tab === "signup"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="hello@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                />
                            </div>
                        </div>

                        {/* Mode + Referral (Signup only) */}
                        <AnimatePresence>
                            {tab === "signup" && (
                                <div className="space-y-4 pt-1">
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-2"
                                    >
                                        <label className="text-xs font-bold text-muted-foreground ml-1">
                                            Where are you right now?
                                        </label>
                                        <p className="ml-1 text-[11px] text-muted-foreground/70">
                                            This picks your skill catalog. You can change it any time in Settings.
                                        </p>
                                        <UserModeSelect
                                            value={userMode}
                                            onChange={setUserMode}
                                            variant="rows"
                                            disabled={loading || googleLoading}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-1"
                                    >
                                        <label className="text-xs font-bold text-muted-foreground ml-1">
                                            Referral Code <span className="text-muted-foreground/60 font-normal">(Optional)</span>
                                        </label>
                                        <div className="relative group">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Enter referral code"
                                                value={referralCode}
                                                onChange={(e) => setReferralCode(e.target.value.replace(/\s/g, "").toUpperCase())}
                                                maxLength={24}
                                                className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all uppercase tracking-widest font-mono"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground ml-1">
                                            Got a friend? Enter their code to help them unlock rewards!
                                        </p>
                                    </motion.div>

                                    {/* Email Consent Checkbox */}
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div
                                            className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                            onClick={() => setEmailConsent(!emailConsent)}
                                        >
                                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${emailConsent
                                                ? "bg-primary border-primary"
                                                : "border-muted-foreground/40 bg-transparent"
                                                }`}>
                                                {emailConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-foreground leading-tight">
                                                    I consent to receive promotional emails
                                                </p>
                                                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                                    Get news, feature updates, and periodic learning summaries.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* WhatsApp Consent Checkbox */}
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div
                                            className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                            onClick={() => setWhatsappConsent(!whatsappConsent)}
                                        >
                                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${whatsappConsent
                                                ? "bg-primary border-primary"
                                                : "border-muted-foreground/40 bg-transparent"
                                                }`}>
                                                {whatsappConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-foreground leading-tight">
                                                    I consent to updates via WhatsApp
                                                </p>
                                                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                                    Get learning reminders and notifications directly on WhatsApp.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Conditional Phone Input */}
                                    <AnimatePresence>
                                        {whatsappConsent && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden space-y-1"
                                            >
                                                <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
                                                <div className="relative group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex items-center justify-center">📱</div>
                                                    <input
                                                        type="tel"
                                                        placeholder="+1 (555) 000-0000"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Error / Success */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-start gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-body"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-xl text-success text-xs font-body"
                                >
                                    <span>{success}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-base shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : tab === "login" ? (
                                <>Sign In</>
                            ) : (
                                <>Create Account</>
                            )}
                        </motion.button>

                        {/* Divider */}
                        <div className="relative flex items-center justify-center my-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/50"></div>
                            </div>
                            <span className="relative px-3 text-[10px] text-muted-foreground uppercase tracking-wider bg-card">
                                Or continue with
                            </span>
                        </div>

                        {/* Google Button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading || googleLoading}
                            className="w-full py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all flex items-center justify-center gap-2.5 text-sm font-semibold text-foreground shadow-sm disabled:opacity-60"
                        >
                            {googleLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                            <span className="font-display">
                                Google
                            </span>
                        </motion.button>

                        {tab === "signup" && (
                            <p className="text-[11px] text-muted-foreground text-center mt-2 px-2">
                                By signing up, you agree to our{" "}
                                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        )}

                    </form>

                    <div className="pb-6 text-center">
                        <p className="text-xs text-muted-foreground/60 font-body">
                            An account is required to practise — it saves your progress, streak and leaderboard rank.
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
