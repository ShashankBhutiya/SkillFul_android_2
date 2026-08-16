import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import categorySummaries from "@/data/categorySummaries.json";
import { categories as questionCategories } from "@/data/questions";
import { useAuth } from "@/contexts/AuthContext";
import { getPracticedIds } from "@/services/progressService";
import { LOCKED_CATEGORY_IDS, REFERRALS_PER_UNLOCK } from "@/config/lockedCategories";

type ExperienceLevel = "justStarted" | "workingLong" | null;
import { MainLayout } from "@/components/layout/MainLayout";
import { hapticLight, hapticError, hapticSuccess } from "@/hooks/useHaptics";
import { Lock, MessageSquarePlus, Briefcase, Heart, ChevronLeft, ChevronRight, Search, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReferralModal from "./ReferralModal";
import StreakCard from "@/components/streak/StreakCard";
import { useStreak } from "@/hooks/useStreak";
import { supabase } from "@/lib/supabase";
import { SeoHead } from "@/components/SeoHead";
import { CategoryIcon } from "@/lib/categoryIcons";

const TOTAL_CATEGORIES = categorySummaries.length;

// Build a lookup map from actual question arrays for real-time counts
const questionCountMap = new Map(
  questionCategories.map((c) => [c.id, c.questions.length])
);

interface CategorySelectProps {
  onSelect: (categoryId: string) => void;
}

type CategorySummary = (typeof categorySummaries)[number];

interface CategoryCardProps {
  cat: CategorySummary;
  isLocked: boolean;
  requiredRefs: number;
  practiced: number;
  total: number;
  onSelect: (categoryId: string) => void;
  setShowReferralFor: (v: { id: string; name: string } | null) => void;
  i: number;
  className?: string;
}

const CategorySelect = ({ onSelect }: CategorySelectProps) => {
  const { user } = useAuth();
  const { streak, checkedInToday } = useStreak();
  const skillOfTheDay = categorySummaries.length > 0
    ? categorySummaries[(new Date().getDate() + new Date().getMonth() * 31) % categorySummaries.length]
    : null;

  const getRequiredReferrals = (catId: string) => {
    const idx = LOCKED_CATEGORY_IDS.indexOf(catId);
    return idx === -1 ? 0 : (idx + 1) * REFERRALS_PER_UNLOCK;
  };

  const skillOfTheDayRequiredRefs = skillOfTheDay ? getRequiredReferrals(skillOfTheDay.id) : 0;
  const isSkillOfTheDayLocked = skillOfTheDay && !user.isPremium && skillOfTheDayRequiredRefs > 0 && user.unlockCount < skillOfTheDayRequiredRefs;
  const [showReferralFor, setShowReferralFor] = useState<{ id: string; name: string } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [experience, setExperience] = useState<ExperienceLevel>(null);
  const [experienceLoaded, setExperienceLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user_experience") as ExperienceLevel;
      if (saved === "justStarted" || saved === "workingLong") {
        setExperience(saved);
      }
    } catch (e) {
      console.warn("Could not read user_experience from localStorage:", e);
    }
    setExperienceLoaded(true);
  }, []);

  const handleSelectExperience = (exp: "justStarted" | "workingLong") => {
    setExperience(exp);
    try {
      localStorage.setItem("user_experience", exp);
    } catch (e) {
      console.warn("Could not save user_experience to localStorage:", e);
    }
    hapticSuccess();
  };



  const filterCats = (cats: CategorySummary[]) =>
    searchQuery.trim()
      ? cats.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : cats;

  // Sort categories based on selected experience level
  const sortedCategories = [...categorySummaries].sort((a, b) => {
    if (!experience) return 0;
    const scoreA = (a as any).priorityScore?.[experience] || 0;
    const scoreB = (b as any).priorityScore?.[experience] || 0;
    return scoreB - scoreA;
  });

  const personalCats = filterCats(sortedCategories.filter((c) => c.type === "Personal"));
  const professionalCats = filterCats(sortedCategories.filter((c) => c.type !== "Personal"));

  const renderCategoryList = (cats: CategorySummary[], startIndex: number, cardClassName?: string) =>
    cats.map((cat, i) => {
      const requiredRefs = getRequiredReferrals(cat.id);
      const isLocked = !user.isPremium && requiredRefs > 0 && user.unlockCount < requiredRefs;
      // Cross-reference practiced IDs with actual question objects
      // to avoid counting stale/orphaned IDs from removed questions
      const practicedIdSet = new Set(getPracticedIds(cat.id, user.id));
      const questionCat = questionCategories.find(c => c.id === cat.id);
      const practiced = questionCat
        ? questionCat.questions.filter(q => practicedIdSet.has(q.id)).length
        : 0;
      const total = questionCountMap.get(cat.id) ?? cat.questionCount;

      return (
        <CategoryCard
          key={cat.id}
          cat={cat}
          isLocked={isLocked}
          requiredRefs={requiredRefs}
          practiced={practiced}
          total={total}
          onSelect={onSelect}
          setShowReferralFor={setShowReferralFor}
          i={startIndex + i}
          className={cardClassName}
        />
      );
    });

  if (!experienceLoaded) return null;



  return (
    <MainLayout>
      <SeoHead
        title="Skills"
        description="Pick a skill to start practicing real-life scenarios."
        path="/skills"
        keywords={["real life skills", "quiz app", "swipe quiz"]}
      />

      <section
        id="categories"
        className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        {/* Page header — left-aligned. Centred display type at the top
            of a scrolling list reads as a landing page, not an app. */}
        <div className="mb-6">
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            Pick a skill
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Short scenarios, one swipe at a time.
          </p>
        </div>

        {/* Daily streak */}
        <StreakCard streak={streak} checkedInToday={checkedInToday} className="mb-6" />

        {/* Skill of the Day — a plain surface with a labelled row.
            The emphasis now comes from the label and the single filled
            button, not from a gradient fill and a coloured border. */}
        {skillOfTheDay && (
          <div className="surface mb-8 p-5">
            <span className="section-label">Skill of the day</span>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                  <CategoryIcon categoryId={skillOfTheDay.id} className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-base font-semibold text-foreground">
                    {skillOfTheDay.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {questionCountMap.get(skillOfTheDay.id) ?? skillOfTheDay.questionCount} scenarios
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isSkillOfTheDayLocked) {
                    hapticError();
                    setShowReferralFor({ id: skillOfTheDay.id, name: skillOfTheDay.name });
                  } else {
                    hapticLight();
                    onSelect(skillOfTheDay.id);
                  }
                }}
                className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 sm:w-auto"
              >
                {isSkillOfTheDayLocked ? (
                  <>
                    Unlock
                    <Lock className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Start
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills"
            aria-label="Search skills"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-primary/25"
          />
        </div>

        <div className="flex flex-col gap-9">
          <CategoryCarousel
            title="Professional"
            subtitle="Career & workplace"
            icon={Briefcase}
            count={professionalCats.length}
          >
            {renderCategoryList(
              professionalCats,
              0,
              "w-[150px] sm:w-[168px] md:w-[184px] shrink-0 snap-start"
            )}
          </CategoryCarousel>

          <CategoryCarousel
            title="Personal"
            subtitle="Life & relationships"
            icon={Heart}
            count={personalCats.length}
          >
            {renderCategoryList(
              personalCats,
              professionalCats.length,
              "w-[150px] sm:w-[168px] md:w-[184px] shrink-0 snap-start"
            )}
          </CategoryCarousel>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setShowRequestModal(true);
          }}
          className="mt-9 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Request a new category
        </button>
      </section>

      <AnimatePresence>
        {showReferralFor && (
          <ReferralModal
            isOpen={true}
            onClose={() => setShowReferralFor(null)}
            categoryName={showReferralFor.name}
            requiredReferrals={getRequiredReferrals(showReferralFor.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => {
              setShowRequestModal(false);
              setRequestSent(false);
              setRequestName("");
              setRequestDesc("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              {requestSent ? (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">Request sent</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Thanks for the suggestion — we'll review it.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestModal(false);
                      setRequestSent(false);
                      setRequestName("");
                      setRequestDesc("");
                    }}
                    className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5 text-center">
                    <MessageSquarePlus className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Request a category
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Suggest a topic you'd like to practice
                    </p>
                  </div>
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Category name
                      </label>
                      <input
                        type="text"
                        value={requestName}
                        onChange={(e) => setRequestName(e.target.value)}
                        placeholder="e.g. Negotiation, Mindfulness..."
                        className="w-full rounded-xl border border-input bg-muted/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        value={requestDesc}
                        onChange={(e) => setRequestDesc(e.target.value)}
                        placeholder="What kind of scenarios should it include?"
                        className="w-full resize-none rounded-xl border border-input bg-muted/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        rows={3}
                        maxLength={200}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestModal(false);
                        setRequestName("");
                        setRequestDesc("");
                      }}
                      className="flex-1 rounded-full bg-muted py-2.5 text-sm font-bold text-muted-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!requestName.trim()) return;
                        if (supabase) {
                          await supabase.from("category_requests").insert({
                            user_id: user.id,
                            category_name: requestName.trim(),
                            description: requestDesc.trim(),
                          });
                        } else {
                          try {
                            const requests = JSON.parse(
                              localStorage.getItem("category_requests") || "[]"
                            );
                            requests.push({
                              name: requestName.trim(),
                              description: requestDesc.trim(),
                              date: new Date().toISOString(),
                              userId: user.id,
                            });
                            localStorage.setItem("category_requests", JSON.stringify(requests));
                          } catch (e) {
                            console.warn("Could not save category requests to localStorage:", e);
                          }
                        }
                        hapticSuccess();
                        setRequestSent(true);
                      }}
                      disabled={!requestName.trim()}
                      className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      Submit
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

// Need Check icon for the request-sent state
import { Check } from "lucide-react";

interface CategoryCarouselProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  count: number;
  children: React.ReactNode;
}

/**
 * Horizontally scrolling category section.
 *
 * Previously the Professional and Personal sections were two copies of
 * the same ~55 lines, each with its own ref, arrow state, scroll handler
 * and resize effect. They are one component now, so the scroll plumbing
 * exists once.
 */
const CategoryCarousel = ({ title, subtitle, icon: Icon, count, children }: CategoryCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);

    // Card widths settle after the cover images lay out, so re-measure
    // on content changes as well as on scroll/resize.
    const observer = new ResizeObserver(check);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      observer.disconnect();
    };
  }, [children]);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const arrowClass =
    "absolute top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted md:flex";

  return (
    <section>
      {/* Section header sits directly on the page background. The old
          version nested a bordered header inside a bordered card, which
          gave every row two competing frames. */}
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">{subtitle}</span>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className={`${arrowClass} -left-3`}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy("right")}
            className={`${arrowClass} -right-3`}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory scroll-smooth flex-row gap-3 overflow-x-auto px-0.5 pb-2 pt-0.5 scrollbar-none"
        >
          {children}
        </div>
      </div>
    </section>
  );
};

const CategoryCard = ({
  cat,
  isLocked,
  requiredRefs,
  practiced,
  total,
  onSelect,
  setShowReferralFor,
  i,
  className,
}: CategoryCardProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const coverImage = cat.coverImage;
  const progress = total > 0 ? Math.min(100, (practiced / total) * 100) : 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + i * 0.025, duration: 0.25 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => {
        if (isLocked) {
          hapticError();
          setShowReferralFor({ id: cat.id, name: cat.name });
        } else {
          hapticLight();
          onSelect(cat.id);
        }
      }}
      className={`surface-interactive group flex flex-col overflow-hidden text-left ${className || "w-full"}`}
    >
      <div className="relative h-[88px] w-full shrink-0 overflow-hidden border-b border-border">
        {/* Loading skeleton */}
        {!imgLoaded && coverImage && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
        {coverImage && (
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            } ${isLocked ? "grayscale" : ""}`}
          />
        )}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55">
            <Lock className="h-4 w-4 text-foreground/70" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 p-3">
        <span className="line-clamp-2 font-display text-[13px] font-semibold leading-snug text-foreground">
          {cat.name}
        </span>

        {isLocked ? (
          <p className="text-[11px] leading-tight text-muted-foreground">
            Refer {requiredRefs} friend{requiredRefs > 1 ? "s" : ""} to unlock
          </p>
        ) : (
          <div className="space-y-1.5">
            {/* Progress bar carries the number, so the old icon +
                "x/y correct" line is redundant alongside it. */}
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.15 + i * 0.03, duration: 0.5 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{practiced}</span>/{total}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default CategorySelect;
