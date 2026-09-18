import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  User,
  Settings,
  LogOut,
  Sparkles,
  Flame,
  Trophy,
  Gift,
  Copy,
  Check,
  GraduationCap,
  Briefcase,
  Moon,
  Sun,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Shield,
  FileText,
  Info,
  ChevronRight,
  ExternalLink,
  Crown,
  School,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "next-themes";
import { MainLayout } from "@/components/layout/MainLayout";
import FloatingOrbs from "@/components/FloatingOrbs";
import { SeoHead } from "@/components/SeoHead";
import AuthModal from "@/components/AuthModal";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { toast } from "@/hooks/use-toast";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptics";

const ease = [0.16, 1, 0.3, 1] as const;
const spring = { type: "spring" as const, stiffness: 320, damping: 24 };

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

export const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { streak } = useStreak();
  const { mode, setMode } = useUserMode();
  const { theme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user.email
      ? user.email.split("@")[0]
      : "Guest Adventurer";

  const avatarLetter = (
    user.firstName?.charAt(0) ||
    user.email?.charAt(0) ||
    "?"
  ).toUpperCase();

  const handleCopyCode = () => {
    if (!user.referralCode) return;
    copyToClipboard(user.referralCode);
    setCopied(true);
    hapticSuccess();
    toast({
      title: "Code Copied!",
      description: "Your invite code has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSignOut = async () => {
    hapticLight();
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been safely signed out of your account.",
    });
    navigate("/skills");
  };

  const isDarkMode = theme === "dark";

  return (
    <MainLayout>
      <SeoHead
        title="Profile"
        description="Manage your Skillful account, track your daily practice stats, and configure learning preferences."
        path="/profile"
      />

      <div className="relative min-h-[80vh]">
        <FloatingOrbs vivid />
        <div
          className="pointer-events-none absolute inset-0 -z-[1] bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-3 pb-24 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="mb-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                Account & Settings
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...spring, delay: 0.05 }}
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-sm"
              >
                <User className="h-6 w-6 text-primary" strokeWidth={2.2} />
              </motion.div>

              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08, duration: 0.4, ease }}
                  className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  <span className="text-gradient">Profile</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.14, duration: 0.35 }}
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  Manage your account, track practice stats, and configure preferences.
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* User Identity Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...spring }}
            className="relative mb-5 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            {!user.isGuest ? (
              /* Authenticated User Details */
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* User Avatar */}
                    <div
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${
                        user.isPremium
                          ? "bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20"
                          : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      }`}
                    >
                      {avatarLetter}
                      {user.isPremium && (
                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-400 text-amber-950 shadow-sm">
                          <Crown className="h-3 w-3 fill-amber-950" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-display text-lg font-bold text-foreground">
                          {displayName}
                        </h2>
                        {user.isPremium ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                            <Sparkles className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            PRO
                          </span>
                        ) : (
                          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                            FREE
                          </span>
                        )}
                      </div>
                      {user.email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}

                      {/* Mode & Academic Badges */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          {mode === "student" ? (
                            <>
                              <GraduationCap className="h-3 w-3" />
                              Student Track
                            </>
                          ) : (
                            <>
                              <Briefcase className="h-3 w-3" />
                              Professional Track
                            </>
                          )}
                        </span>

                        {user.linkedCollege?.name && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <School className="h-3 w-3" />
                            <span className="max-w-[130px] truncate">{user.linkedCollege.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="flex items-center gap-2 border-t border-border/40 pt-3 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(true)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] sm:flex-initial"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Guest User Card */
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-lg font-bold text-muted-foreground">
                    ?
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">
                      Guest Learner
                    </h2>
                    <p className="max-w-md text-xs text-muted-foreground">
                      Sign in to preserve your streak, track accuracy across skills, and rank on the global leaderboard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  <User className="h-3.5 w-3.5" />
                  Sign In / Register
                </button>
              </div>
            )}
          </motion.div>

          {/* Practice & Standings Stats Grid */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* 1. Daily Streak */}
            <Link
              to="/streak"
              className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:border-orange-500/50 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-2.5">
                <div className="font-display text-base font-bold tabular-nums text-foreground">
                  {streak.currentStreak} {streak.currentStreak === 1 ? "Day" : "Days"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Streak (Best: {streak.longestStreak}d)
                </div>
              </div>
            </Link>

            {/* 2. Leaderboard */}
            <Link
              to="/leaderboard"
              className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:border-amber-500/50 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Trophy className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-2.5">
                <div className="font-display text-base font-bold text-foreground">
                  Leaderboard
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Global Rankings
                </div>
              </div>
            </Link>

            {/* 3. Refer & Earn */}
            <Link
              to="/refer"
              className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:border-rose-500/50 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <Gift className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-2.5">
                <div className="font-display text-base font-bold tabular-nums text-foreground">
                  {user.unlockCount} {user.unlockCount === 1 ? "Invite" : "Invites"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Refer & Unlock
                </div>
              </div>
            </Link>

            {/* 4. Premium Status */}
            <Link
              to="/premium"
              className={`group relative block overflow-hidden rounded-xl border p-3.5 shadow-sm transition-all active:scale-[0.98] ${
                user.isPremium
                  ? "border-amber-400/50 bg-amber-500/5 hover:border-amber-400"
                  : "border-border bg-card hover:border-violet-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    user.isPremium
                      ? "bg-amber-400/20 text-amber-500"
                      : "bg-violet-500/10 text-violet-500"
                  }`}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-2.5">
                <div
                  className={`font-display text-base font-bold ${
                    user.isPremium ? "text-amber-500" : "text-foreground"
                  }`}
                >
                  {user.isPremium ? "Pro Active" : "Get Pro"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {user.isPremium ? "All Perks Unlocked" : "Unlimited Practice"}
                </div>
              </div>
            </Link>
          </div>

          {/* Referral Invite Code Banner (For Authenticated Users) */}
          {!user.isGuest && user.referralCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, ...spring }}
              className="relative mb-5 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Your Referral Code
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Share with friends. Every signup gives both of you bonus unlocks!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-primary/10 transition-colors"
                >
                  <span>{user.referralCode}</span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* App Preferences & Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...spring }}
            className="relative mb-6 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                App Preferences
              </span>
              <span className="text-xs text-muted-foreground">Settings</span>
            </div>

            <div className="space-y-4">
              {/* Learning Track Selector */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Learning Track Focus
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tailors interview scenarios and practice question bank
                  </div>
                </div>
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMode("student");
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      mode === "student"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMode("professional");
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      mode === "professional"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Pro
                  </button>
                </div>
              </div>

              {/* Theme Mode Toggle */}
              <div className="flex items-center justify-between border-t border-border/40 pt-3.5">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Theme Appearance
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Switch between Light and Dark interface modes
                  </div>
                </div>
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setTheme("light");
                    }}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      !isDarkMode
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setTheme("dark");
                    }}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      isDarkMode
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Full Settings Modal Link */}
              {!user.isGuest && (
                <div className="flex items-center justify-between border-t border-border/40 pt-3.5">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Academic & Contact Details
                    </div>
                    <div className="text-xs text-muted-foreground">
                      College enrollment, graduation year, phone, and notifications
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.98]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resources & Support Section */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, ...spring }}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Resources & Support
              </span>
              <span className="text-xs text-muted-foreground">Links</span>
            </div>

            <div className="divide-y divide-border/40">
              <Link
                to="/skills"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-semibold">Explore All Skills</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/about"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs font-semibold">About Skillful</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/contact"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Contact & Help Desk</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <a
                href="https://forms.gle/54XXvLbfHAtJX7fF6"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Share Feedback</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>

              <Link
                to="/privacy"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-semibold">Privacy Policy</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/terms"
                className="flex items-center justify-between py-2.5 transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold">Terms of Service</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </MainLayout>
  );
};

export default ProfilePage;
