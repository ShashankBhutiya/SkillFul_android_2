import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Lock, Unlock, Mail,
  Share2, HelpCircle, ChevronDown, Award
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticLight, hapticError } from "@/hooks/useHaptics";
import AuthModal from "@/components/AuthModal";
import categorySummaries from "@/data/categorySummaries.json";
import { LOCKED_CATEGORY_IDS, REFERRALS_PER_UNLOCK } from "@/config/lockedCategories";
import { siteConfig } from "@/seo/siteConfig";
import { CategoryIcon } from "@/lib/categoryIcons";

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
  const hasPremiumAccess = !!user?.isPremium;

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
    const isUnlocked = hasPremiumAccess || (user?.unlockCount || 0) >= requiredRefs;

    return {
      id,
      name: matchingCat?.name || (id.charAt(0).toUpperCase() + id.slice(1) + " Masterclass"),
      gradient: matchingCat?.gradient || "from-slate-600 to-indigo-700",
      requiredRefs,
      isUnlocked
    };
  });

  const totalLockedPacks = LOCKED_CATEGORY_IDS.length;
  const unlockedPacksCount = hasPremiumAccess
    ? totalLockedPacks 
    : lockedCategoriesInfo.filter(c => c.isUnlocked).length;

  return (
    <MainLayout>
      <div className="relative min-h-[85vh]">
        {/* Page header */}
        <section className="mx-auto max-w-5xl px-4 pb-6 pt-3">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="font-display text-[26px] font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Refer friends, earn Premium
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35, ease }}
            className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground"
          >
            When a friend signs up and upgrades to Premium, you both unlock exclusive learning rewards.
          </motion.p>
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
                  className="surface p-8 text-center"
                >
                  <Award className="mx-auto mb-4 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Start inviting friends
                  </h3>
                  <p className="mx-auto mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    You're playing in Guest Mode. Create an account or sign in to get your referral
                    code and unlock premium features.
                  </p>
                  <button
                    onClick={() => {
                      hapticLight();
                      setShowAuthModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    Sign in to start
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="surface p-6 sm:p-7"
                >
                  <h3 className="mb-5 font-display text-base font-semibold text-foreground">
                    Your referrals
                  </h3>

                  {/* Stats — split by a single divider rather than two
                      nested bordered tiles inside an already-bordered card. */}
                  <div className="mb-6 grid grid-cols-2 divide-x divide-border border-y border-border">
                    <div className="py-4 pr-4">
                      <p className="section-label">Invites</p>
                      <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-foreground">
                        {user.unlockCount}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Friends who upgraded</p>
                    </div>

                    <div className="py-4 pl-4">
                      <p className="section-label">Packs unlocked</p>
                      <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-foreground">
                        {unlockedPacksCount}
                        <span className="text-base text-muted-foreground"> / {totalLockedPacks}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Premium packages</p>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="section-label">Unlock progress</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {hasPremiumAccess
                          ? "Premium active"
                          : `${user.unlockCount} referred`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${hasPremiumAccess ? 100 : Math.min(100, (user.unlockCount / totalLockedPacks) * 100)}%` }}
                      />
                    </div>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Each referred friend who upgrades to Premium grants you one pack unlock.
                    </p>
                  </div>

                  {/* Referral Share Box */}
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {/* Code Share */}
                      <div className="flex-1">
                        <label className="section-label mb-1.5 block">Referral code</label>
                        <button
                          onClick={handleCopyCode}
                          className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 p-3.5 text-left transition-colors hover:bg-muted"
                        >
                          <p className="font-mono text-base font-semibold tracking-[0.2em] text-foreground">
                            {user.referralCode}
                          </p>
                          {copiedCode ? (
                            <Check className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Copy className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                          )}
                        </button>
                      </div>

                      {/* Invite Link */}
                      <div className="flex-1">
                        <label className="section-label mb-1.5 block">Invite link</label>
                        <button
                          onClick={handleCopyLink}
                          className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3.5 text-left transition-colors hover:bg-muted"
                        >
                          <p className="truncate text-xs text-muted-foreground">{referralLink}</p>
                          {copiedLink ? (
                            <Check className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Share2 className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Social sharing links — neutral outline buttons.
                        Brand-coloured fills made these read as the primary
                        action on the page, which they aren't. */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={hapticLight}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={emailUrl}
                        onClick={hapticLight}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Steps Illustration */}
              <div className="surface p-6 sm:p-7">
                <h3 className="mb-5 font-display text-base font-semibold text-foreground">
                  How it works
                </h3>

                {/* Numbered steps on a single connecting rule. The three
                    markers share one neutral treatment — the numbers give
                    the sequence, so three different hues added nothing. */}
                <ol className="relative space-y-6 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-border">
                  {[
                    {
                      title: "Send your invite link",
                      desc: "Copy your referral code or invite link above and send it to friends.",
                    },
                    {
                      title: "Friend upgrades to Premium",
                      desc: "Your friend signs up using your link and subscribes to any premium plan.",
                    },
                    {
                      title: "Unlock premium packs",
                      desc: "You instantly unlock one of the premium categories for free.",
                    },
                  ].map((step, idx) => (
                    <li key={step.title} className="relative flex gap-4">
                      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card font-display text-sm font-semibold text-foreground">
                        {idx + 1}
                      </div>
                      <div className="pt-1">
                        <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {step.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

            </div>

            {/* Right Side: Rewards & Pricing Option */}
            <div className="space-y-6">
              
              {/* Rewards Progress / Lock statuses */}
              <div className="surface p-6 sm:p-7">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Unlockable premium packs
                </h3>
                <p className="mb-5 mt-1 text-xs text-muted-foreground">
                  Refer friends or subscribe to unlock these packs.
                </p>

                <ul className="divide-y divide-border border-y border-border">
                  {lockedCategoriesInfo.map((cat) => (
                    <li key={cat.id} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <CategoryIcon categoryId={cat.id} className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{cat.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {cat.requiredRefs} referral{cat.requiredRefs > 1 ? "s" : ""} required
                          </p>
                        </div>
                      </div>

                      {/* Status as a bare icon + label, not a filled pill. */}
                      {cat.isUnlocked ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-success">
                          <Unlock className="h-3.5 w-3.5" />
                          Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Locked
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Direct Upgrade CTA */}
              <div className="surface p-6 sm:p-7">
                <span className="section-label">Instant access</span>
                <h3 className="mt-2 font-display text-base font-semibold text-foreground">
                  Want to skip the referrals?
                </h3>
                <p className="mb-5 mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Upgrade to Premium directly to unlock all present and future modules immediately.
                </p>
                <button
                  onClick={() => {
                    hapticLight();
                    navigate("/premium");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Unlock with Premium
                </button>
              </div>

              {/* Dynamic Tip */}
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                <strong className="font-semibold text-foreground">Tip:</strong> post your link in
                professional WhatsApp groups, college chats, or share it with coworkers preparing
                for promotion interviews.
              </p>

            </div>

          </div>

          {/* FAQs section */}
          <div className="surface mx-auto mt-14 max-w-3xl p-6 sm:p-7">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Frequently asked questions
            </h3>

            <div className="divide-y divide-border">
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
