import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Copy, Check, Lock, Unlock, ArrowLeft, Mail, 
  Gift, Sparkles, Star, Share2, HelpCircle, ChevronDown, Award
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticLight, hapticError } from "@/hooks/useHaptics";
import AuthModal from "@/components/AuthModal";
import categorySummaries from "@/data/categorySummaries.json";
import { LOCKED_CATEGORY_IDS, REFERRALS_PER_UNLOCK } from "@/config/lockedCategories";
import { siteConfig } from "@/seo/siteConfig";

const ease = [0.16, 1, 0.3, 1] as const;

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/40 py-4 last:border-0">
      <button
        onClick={() => {
          hapticLight();
          setIsOpen(!isOpen);
        }}
        className="flex w-full items-center justify-between text-left font-display font-semibold text-foreground/95 hover:text-foreground transition-colors group"
      >
        <span>{question}</span>
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 group-hover:text-foreground shrink-0 ml-4 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`} 
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-body pr-4">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const referralLink = `${siteConfig.siteUrl}/?ref=${user?.referralCode || ""}`;

  const handleCopyCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      hapticSuccess();
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      hapticSuccess();
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareMessage = `Hey! I've been practicing real-life skills on Skillful. Sign up using my referral link and upgrade to unlock all premium categories with me! ${referralLink}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
  
  const emailSubject = "Join me on Skillful!";
  const emailBody = `Hey!\n\nI've been practicing real-life scenarios on Skillful to sharpen my career and personal instincts. Sign up with my link and upgrade to unlock premium packs!\n\nJoin here: ${referralLink}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  // Find info about locked categories
  const lockedCategoriesInfo = LOCKED_CATEGORY_IDS.map((id, index) => {
    const matchingCat = categorySummaries.find(c => c.id === id);
    const requiredRefs = (index + 1) * REFERRALS_PER_UNLOCK;
    const isUnlocked = user?.isPremium || (user?.unlockCount || 0) >= requiredRefs;

    return {
      id,
      name: matchingCat?.name || (id.charAt(0).toUpperCase() + id.slice(1) + " Masterclass"),
      emoji: matchingCat?.emoji || "🔒",
      gradient: matchingCat?.gradient || "from-slate-600 to-indigo-700",
      requiredRefs,
      isUnlocked
    };
  });

  const totalLockedPacks = LOCKED_CATEGORY_IDS.length;
  const unlockedPacksCount = user?.isPremium 
    ? totalLockedPacks 
    : lockedCategoriesInfo.filter(c => c.isUnlocked).length;

  return (
    <MainLayout>
      <div className="relative min-h-[85vh] overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 translate-x-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Banner */}
        <section className="relative overflow-hidden pt-10 pb-6 sm:pt-14 sm:pb-8 text-center px-4">
          <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" aria-hidden />

          <div className="relative mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-5 shadow-sm"
            >
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold tracking-wide text-foreground/80">
                Referral Program
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.5, ease }}
              className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Refer Friends.
              <span className="text-gradient"> Earn Premium.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease }}
              className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base leading-relaxed"
            >
              Help your circle level up their real-world instincts. When a friend signs up and upgrades to Premium, you both unlock exclusive learning rewards.
            </motion.p>
          </div>
        </section>

        {/* Core Layout */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            
            {/* Left Side: Stats & Share */}
            <div className="space-y-6">
              
              {/* Profile Referral Status */}
              {user.isGuest ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center shadow-xl shadow-primary/[0.02]"
                >
                  <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-display font-extrabold text-xl text-foreground mb-2">
                    Start Inviting Friends
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed font-body">
                    You are currently playing in Guest Mode. Please create an account or sign in to get your referral code and unlock premium features.
                  </p>
                  <button
                    onClick={() => {
                      hapticLight();
                      setShowAuthModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Sign In to Start
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-8 shadow-xl"
                >
                  <h3 className="font-display font-bold text-lg text-foreground mb-6 flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-primary" />
                    Your Referral Dashboard
                  </h3>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-2xl bg-muted/40 p-4 border border-border/40 text-center">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Successful Invites
                      </p>
                      <p className="text-3xl font-display font-extrabold text-primary">
                        {user.unlockCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        Friends who upgraded
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/40 p-4 border border-border/40 text-center">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Packs Unlocked
                      </p>
                      <p className="text-3xl font-display font-extrabold text-foreground">
                        {unlockedPacksCount} <span className="text-sm text-muted-foreground">/ {totalLockedPacks}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        Premium packages unlocked
                      </p>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  <div className="mb-6 bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unlock Progress</span>
                      <span className="text-xs font-extrabold text-primary">
                        {user.isPremium ? "Premium Active" : `${user.unlockCount} Friend(s) Referred`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 bg-muted/60 rounded-full overflow-hidden mb-3.5 border border-border/40">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 rounded-full"
                        style={{ width: `${user.isPremium ? 100 : Math.min(100, (user.unlockCount / totalLockedPacks) * 100)}%` }}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground/75 leading-relaxed font-body">
                      * Referral counts update instantly. Each referred friend who upgrades to Premium grants you 1 pack unlock.
                    </p>
                  </div>

                  {/* Referral Share Box */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                      
                      {/* Code Share */}
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                          Your Referral Code
                        </label>
                        <button
                          onClick={handleCopyCode}
                          className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted border border-border rounded-2xl p-4 transition-all group active:scale-95 text-left"
                        >
                          <div>
                            <p className="font-mono font-extrabold text-lg tracking-widest text-foreground">
                              {user.referralCode}
                            </p>
                          </div>
                          {copiedCode ? (
                            <Check className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </button>
                      </div>

                      {/* Invite Link */}
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                          Invite Link
                        </label>
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted border border-border rounded-2xl p-4 transition-all group active:scale-95 text-left"
                        >
                          <div className="truncate pr-2">
                            <p className="text-xs font-medium text-muted-foreground truncate">
                              {referralLink}
                            </p>
                          </div>
                          {copiedLink ? (
                            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                          )}
                        </button>
                      </div>

                    </div>

                    {/* Social sharing links */}
                    <div className="flex items-center gap-2 pt-2">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={hapticLight}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/15 border border-[#25D366]/25 text-[#25D366] py-3 text-xs font-bold tracking-wide transition-all active:scale-[0.98]"
                      >
                        Share via WhatsApp
                      </a>
                      <a
                        href={emailUrl}
                        onClick={hapticLight}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary py-3 text-xs font-bold tracking-wide transition-all active:scale-[0.98]"
                      >
                        <Mail className="w-4 h-4" />
                        Share via Email
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Steps Illustration */}
              <div className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8">
                <h3 className="font-display font-bold text-lg text-foreground mb-6">
                  How it works
                </h3>
                
                <div className="space-y-6 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/60">
                  
                  {/* Step 1 */}
                  <div className="flex gap-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/10 z-10">
                      <span className="font-display font-bold text-lg">1</span>
                    </div>
                    <div className="pt-1">
                      <h4 className="font-display font-bold text-base text-foreground mb-1">
                        Send Invite Link
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Copy your referral code or personalized invite link above and send it to friends.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/10 z-10">
                      <span className="font-display font-bold text-lg">2</span>
                    </div>
                    <div className="pt-1">
                      <h4 className="font-display font-bold text-base text-foreground mb-1">
                        Friend Upgrades to Premium
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your friend signs up using your link and subscribes to any of the premium plans.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/10 z-10">
                      <span className="font-display font-bold text-lg">3</span>
                    </div>
                    <div className="pt-1">
                      <h4 className="font-display font-bold text-base text-foreground mb-1">
                        Unlock Premium Packs
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        You instantly unlock one of the premium categories (Personality, Stocks, or Rizz) for free!
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Side: Rewards & Pricing Option */}
            <div className="space-y-6">
              
              {/* Rewards Progress / Lock statuses */}
              <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
                <h3 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Unlockable Premium Packs
                </h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Refer friends or subscribe to unlock these locked packs.
                </p>

                <div className="space-y-4">
                  {lockedCategoriesInfo.map((cat) => (
                    <div 
                      key={cat.id}
                      className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        cat.isUnlocked 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : "bg-muted/30 border-border/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-lg shadow-sm shrink-0`}>
                          {cat.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-semibold tracking-wide">
                            Requires: {cat.requiredRefs} successful referral{cat.requiredRefs > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {cat.isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            <Unlock className="w-3 h-3 fill-emerald-500" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Premium Direct Upgrade CTA */}
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-yellow-600/5 to-transparent p-6 sm:p-8 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold uppercase tracking-wider mb-4">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Instant Access
                </div>
                <h3 className="font-display font-extrabold text-xl text-foreground mb-2">
                  Want to skip the referrals?
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                  Upgrade to Premium directly to unlock all present and future modules immediately.
                </p>
                <button
                  onClick={() => {
                    hapticLight();
                    navigate("/premium");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white border border-amber-500/10 rounded-full py-3.5 text-sm font-bold shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Unlock Instantly with Premium
                </button>
              </div>

              {/* Dynamic Tip */}
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-5 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed font-body">
                  💡 <strong>Pro Tip:</strong> Post your link in professional WhatsApp groups, college chats, or share it with coworkers practicing for promotion interviews!
                </p>
              </div>

            </div>

          </div>

          {/* FAQs section */}
          <div className="mt-16 max-w-3xl mx-auto rounded-3xl border border-border bg-card/40 p-6 sm:p-8">
            <h3 className="font-display font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <HelpCircle className="w-5.5 h-5.5 text-primary" />
              Frequently Asked Questions
            </h3>

            <div className="divide-y divide-border/40">
              <FAQItem 
                question="What counts as a successful referral?"
                answer="A successful referral occurs when a new user signs up on Skillful using your referral link (or enters your code during signup) and subsequently purchases one of the Skillful Premium subscription plans (monthly or yearly)."
              />
              <FAQItem 
                question="How do I unlock locked categories?"
                answer="Once your referred friend upgrades to Premium, you receive 1 successful referral credit. Each credit automatically unlocks 1 locked pack of your choice. Credits are applied sequentially: 1 referral unlocks Personality Dev, 2 referrals unlocks Stock Market, and 3 referrals unlocks Rizz."
              />
              <FAQItem 
                question="Can guest users earn referral rewards?"
                answer="No. Guests can play the free categories, but they do not have a unique referral code. To get a referral code and track successful invites, you must create a free account and sign in."
              />
              <FAQItem 
                question="Is there a limit to how many categories I can unlock?"
                answer="Through referrals, you can unlock up to 3 major premium packages (Personality Dev, Stock Market, and Rizz). Subscribing to Premium unlocks all categories instantly and unlocks all future modules, too."
              />
              <FAQItem 
                question="Can I refer myself using another account?"
                answer="No. Self-referrals are strictly audited. Creating duplicate accounts to claim rewards violates our Terms of Service and will result in the suspension of all associated accounts and loss of unlocked packages."
              />
            </div>
          </div>

        </section>

        {/* Modals */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    </MainLayout>
  );
}
