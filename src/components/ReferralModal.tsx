import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Lock, Users, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticLight } from "@/hooks/useHaptics";
import { useNavigate } from "react-router-dom";

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiredReferrals: number;
    categoryName: string;
}

const ReferralModal = ({ isOpen, onClose, requiredReferrals, categoryName }: ReferralModalProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (user.referralCode) {
            navigator.clipboard.writeText(user.referralCode);
            setCopied(true);
            hapticSuccess();
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl border border-white/10 text-center"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>

                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-display font-bold mb-2 text-foreground">
                        Unlock {categoryName}
                    </h2>

                    <p className="text-muted-foreground mb-6 font-body">
                        This premium category is locked.<br />
                        To open it, you need <strong className="text-primary">{requiredReferrals} valid referral{requiredReferrals > 1 ? 's' : ''}</strong>.
                    </p>

                    <div className="bg-muted/30 rounded-xl p-4 mb-6 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Progress</span>
                            <span className="text-xs font-bold text-primary">
                                {user.unlockCount} / {requiredReferrals} Friends
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-primary transition-all duration-500 rounded-full"
                                style={{ width: `${Math.min(100, (user.unlockCount / requiredReferrals) * 100)}%` }}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground/70">
                            * A valid referral is credited when your friend signs up and <strong className="text-foreground">buys a premium subscription</strong>.
                        </p>
                    </div>

                    {!user.isGuest ? (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold">Share your code:</p>
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted border border-white/10 rounded-xl p-4 transition-all group active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-muted-foreground">Your Referral Code</p>
                                        <p className="font-mono font-bold text-lg tracking-wider text-foreground">
                                            {user.referralCode}
                                        </p>
                                    </div>
                                </div>
                                {copied ? (
                                    <Check className="w-5 h-5 text-success" />
                                ) : (
                                    <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
                            <p className="text-sm text-destructive font-bold mb-1">Guest Mode Active</p>
                            <p className="text-xs text-destructive/80">
                                You must sign in to track referrals and unlock sophisticated packs!
                            </p>
                        </div>
                    )}

                    <div className="my-4 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground/55 uppercase tracking-wider">
                        <span className="h-px bg-border/40 flex-1" />
                        <span>Or</span>
                        <span className="h-px bg-border/40 flex-1" />
                    </div>

                    <button
                        onClick={() => {
                            hapticLight();
                            navigate("/premium");
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-600/10 hover:from-amber-500/15 hover:to-yellow-600/15 text-amber-600 dark:text-amber-400 border border-amber-500/35 rounded-xl p-3.5 text-xs font-bold tracking-wide transition-all active:scale-[0.98] shadow-sm hover:shadow-amber-500/5 group"
                    >
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
                        Unlock Instantly with Premium
                    </button>

                    <div className="mt-6">
                        <p className="text-[10px] text-muted-foreground">
                            Tip: Share it in your group chats! They'll love finding out if they have Rizz. 😉
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReferralModal;
