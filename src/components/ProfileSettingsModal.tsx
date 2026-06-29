import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileSettingsModal = ({ isOpen, onClose }: ProfileSettingsModalProps) => {
    const { user, updateProfileSettings, sendPhoneVerificationOTP, confirmPhoneVerificationOTP } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneConsent, setPhoneConsent] = useState(false);
    const [emailConsent, setEmailConsent] = useState(false);
    const [whatsappConsent, setWhatsappConsent] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Verification States
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Cooldown Countdown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Initialize state when modal opens or user profile loads
    useEffect(() => {
        if (isOpen && user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setPhone(user.phone || "");
            setPhoneConsent(!!user.phoneConsent);
            setEmailConsent(!!user.emailConsent);
            setWhatsappConsent(!!user.whatsappConsent);
            setError("");
            setSuccess("");
            setIsVerifying(false);
            setVerificationCode("");
            setResendCooldown(0);
        }
    }, [isOpen, user]);

    const isPhoneUnverified = !user.phone || phone.trim() !== user.phone || !user.phoneVerified;

    const handleSendOTP = async () => {
        setError("");
        setSuccess("");
        
        if (!phone.trim()) {
            setError("Please enter a phone number first.");
            return;
        }

        if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
            setError("Please enter a valid phone number (e.g. +15550000000).");
            return;
        }

        setVerificationLoading(true);
        try {
            const res = await sendPhoneVerificationOTP(phone.trim());
            if (res.success) {
                setSuccess("Verification code sent! Check your phone.");
                setIsVerifying(true);
                setResendCooldown(60);
            } else {
                setError(res.error || "Failed to send verification code.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setError("");
        setSuccess("");

        if (!verificationCode.trim() || verificationCode.length !== 6) {
            setError("Please enter a 6-digit verification code.");
            return;
        }

        setVerificationLoading(true);
        try {
            const res = await confirmPhoneVerificationOTP(phone.trim(), verificationCode.trim());
            if (res.success) {
                setSuccess("Phone number verified successfully! 🎉");
                setIsVerifying(false);
                setVerificationCode("");
            } else {
                setError(res.error || "Invalid verification code.");
            }
        } catch (err: any) {
            setError(err.message || "Verification failed.");
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        // Optional basic format check: if they entered a phone number, make sure it has some digits
        if (phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
            setError("Please enter a valid phone number (e.g. +15550000000)");
            setLoading(false);
            return;
        }

        // If phone has been changed, it resets phone_verified to false unless verified during this modal session
        const finalVerified = phone.trim() === user.phone && !!user.phoneVerified;

        try {
            const result = await updateProfileSettings(
                phone.trim(),
                phoneConsent,
                emailConsent,
                whatsappConsent,
                finalVerified,
                firstName.trim(),
                lastName.trim()
            );
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess("Settings updated successfully! ✨");
                setTimeout(() => {
                    onClose();
                }, 1500);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    if (user.isGuest) return null;

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
                    <motion.div
                        initial={{ scale: 0.9, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 30, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {/* Header */}
                        <div className="px-6 pt-8 pb-4 text-center">
                            <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                                Profile Settings
                            </h2>
                            <p className="text-sm text-muted-foreground font-body">
                                Update your notifications and phone number
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                            {/* Name Input Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground ml-1">First Name</label>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                            </div>

                            {/* Phone Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex items-center justify-center">📱</div>
                                    <input
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            // Reset verifying states when typing
                                            if (isVerifying) {
                                                setIsVerifying(false);
                                                setVerificationCode("");
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                                
                                {/* Verification Status Indicator */}
                                {phone.trim() && (
                                    isPhoneUnverified ? (
                                        <div className="flex items-center justify-between mt-1.5 px-1">
                                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                                ⚠️ Phone is unverified
                                            </span>
                                            {!isVerifying && (
                                                <button
                                                    type="button"
                                                    onClick={handleSendOTP}
                                                    disabled={verificationLoading}
                                                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {verificationLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify Now"}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-emerald-500 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            Verified Phone Number
                                        </div>
                                    )
                                )}
                                
                                <p className="text-[10px] text-muted-foreground ml-1 pt-0.5">
                                    Provide your phone number to receive learning notifications.
                                </p>
                            </div>

                            {/* Verification OTP Box */}
                            <AnimatePresence>
                                {isVerifying && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="p-4 bg-muted/40 backdrop-blur-sm border border-white/10 rounded-2xl space-y-3 overflow-hidden"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-foreground">Verification Code</label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="Enter 6-digit OTP"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                                className="w-full text-center py-2.5 bg-muted/50 rounded-xl border border-white/10 text-foreground text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={verificationLoading}
                                                onClick={handleVerifyOTP}
                                                className="flex-1 py-2 px-3 text-xs bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                            >
                                                {verificationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify Code"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={resendCooldown > 0 || verificationLoading}
                                                onClick={handleSendOTP}
                                                className="py-2 px-3 text-xs bg-muted/80 text-foreground font-bold rounded-lg hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-50"
                                            >
                                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsVerifying(false);
                                                    setVerificationCode("");
                                                    setError("");
                                                }}
                                                className="py-2 px-3 text-xs bg-transparent border border-white/10 text-muted-foreground font-bold rounded-lg hover:bg-white/5 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* WhatsApp Updates Consent */}
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
                                        I consent to receive WhatsApp updates
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Get periodic reminders and study updates on WhatsApp.
                                    </p>
                                </div>
                            </div>

                            {/* SMS Updates Consent */}
                            <div
                                className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                onClick={() => setPhoneConsent(!phoneConsent)}
                            >
                                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${phoneConsent
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40 bg-transparent"
                                    }`}>
                                    {phoneConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground leading-tight">
                                        I consent to receive SMS updates
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Get rapid daily scenario notifications to keep your streak alive. Reply STOP to unsubscribe.
                                    </p>
                                </div>
                            </div>

                            {/* Email Updates Consent */}
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
                                        I consent to receive emails
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Receive newsletters, skill tips, and features announcements. You can unsubscribe anytime.
                                    </p>
                                </div>
                            </div>

                            {/* Error / Success Alerts */}
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
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-body"
                                    >
                                        <span>{success}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading || isVerifying}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-base shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Save Changes"
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ProfileSettingsModal;
