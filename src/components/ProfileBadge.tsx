import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Star, Check, Copy, Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "./AuthModal";
import ProfileSettingsModal from "./ProfileSettingsModal";
import UserModeToggle from "./UserModeToggle";
import ThemeToggle from "./ThemeToggle";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptics";
import { razorpayService } from "@/services/razorpayService";
import { toast } from "@/hooks/use-toast";

/** Helper to copy referral code */
function copyToClipboard(text: string) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    }
}

const ProfileBadge = () => {
    const { user, signOut, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const hasPremiumAccess = user.isPremium;

    const handleCopy = () => {
        if (user.referralCode) {
            copyToClipboard(user.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    /** Get the display name for the badge */
    const displayName = user.firstName 
        ? `${user.firstName} ${user.lastName || ""}`.trim() 
        : (user.email?.split("@")[0] || "User");

    /** Get the first letter of the name for the avatar */
    const avatarLetter = (user.firstName?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

    if (user.isGuest) {
        return (
            <div className="relative flex items-center gap-2">
                {/* Guests pick a mode before signup, so they must be able to change it here too */}
                <UserModeToggle showLabel={false} compact className="w-auto min-[400px]:w-[188px]" />
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                    Sign In
                </button>
                <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
            </div>
        );
    }

    // Authenticated user
    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-card backdrop-blur-sm border shadow-sm transition-all text-xs font-display font-bold hover:shadow-md ${
                    hasPremiumAccess
                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10" 
                        : "border-border/60 text-foreground hover:bg-muted"
                }`}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                    hasPremiumAccess ? "bg-gradient-to-r from-amber-500 to-yellow-500" : "bg-primary"
                }`}>
                    {avatarLetter}
                </div>
                <span className="max-w-[100px] truncate pr-1">
                    {displayName}
                </span>
                {hasPremiumAccess && <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse fill-amber-500" />}
            </motion.button>

            <AnimatePresence>
                {showMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMenu(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="absolute right-0 top-full mt-2.5 w-72 bg-card backdrop-blur-xl rounded-lg shadow-xl border border-border/50 overflow-hidden z-50 text-foreground"
                        >
                             {/* User Header */}
                            <div className="px-5 py-4 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                                        hasPremiumAccess ? "bg-gradient-to-r from-amber-500 to-yellow-500" : "bg-primary"
                                    }`}>
                                        {avatarLetter}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-bold text-foreground truncate">
                                                 {displayName}
                                            </p>
                                            {hasPremiumAccess && (
                                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                    Pro
                                                </span>
                                            )}
                                        </div>
                                        {user.email && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            <span>{user.unlockCount} Friend{user.unlockCount !== 1 ? 's' : ''} Referred</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invite Code */}
                            <div className="px-5 py-4 border-b border-border/40">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                                    Your Invite Code
                                </p>
                                <button
                                    onClick={handleCopy}
                                    className="w-full flex items-center justify-between bg-muted/40 hover:bg-muted/70 border border-border/40 rounded-md px-3.5 py-2.5 transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="font-mono font-bold text-sm tracking-wide">
                                            {user.referralCode || "..."}
                                        </span>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {copied ? (
                                            <motion.span
                                                key="copied"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="flex items-center gap-1 text-[11px] font-bold text-green-600"
                                            >
                                                <Check className="w-3 h-3" />
                                                Copied
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="copy"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </div>

                            {/* Student / Professional mode */}
                            <div className="px-5 py-4 border-b border-border/40">
                                <UserModeToggle />
                                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
                                    Changes which skills you see. Progress is kept for both.
                                </p>
                            </div>

                            {/* Theme Toggle */}
                            <div className="border-b border-border/40">
                                <ThemeToggle variant="dropdown-item" />
                            </div>

                            {/* Profile Settings */}
                            <button
                                onClick={() => {
                                    setShowSettingsModal(true);
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-sm hover:bg-muted/40 transition-colors font-semibold text-foreground"
                            >
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                Profile Settings
                            </button>

                            {/* Upgrade to Premium option */}
                            {!hasPremiumAccess ? (
                                <button
                                    onClick={() => {
                                        navigate("/premium");
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-5 py-3 text-sm hover:bg-amber-500/10 transition-colors font-bold text-amber-500 bg-amber-500/5 group border-t border-border/40"
                                >
                                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
                                    {user.hasLinkedCollege ? "Get Premium for ₹50/year" : "Upgrade to Premium"}
                                </button>
                            ) : (
                                <div className="px-5 py-3 border-t border-border/40 bg-emerald-500/5 text-left">
                                    <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" />
                                        Premium Member
                                    </p>
                                    <button
                                            onClick={async () => {
                                                if (confirm("Simulate cancelling your premium subscription?")) {
                                                    hapticLight();
                                                    const res = await razorpayService.cancelPremiumMock(user.id);
                                                    if (res.success) {
                                                        hapticSuccess();
                                                        await refreshProfile();
                                                        toast({
                                                            title: "Subscription Cancelled",
                                                            description: "Your simulated subscription has been cancelled.",
                                                        });
                                                    }
                                                }
                                            }}
                                            className="text-[10px] text-muted-foreground hover:text-destructive hover:underline transition-colors block"
                                        >
                                            Cancel Subscription
                                        </button>
                                </div>
                            )}

                            {/* Sign Out */}
                            <button
                                onClick={() => {
                                    signOut();
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-5 py-3.5 text-sm text-destructive hover:bg-destructive/5 transition-colors border-t border-border/40 font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <ProfileSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
        </div>
    );
};

export default ProfileBadge;
