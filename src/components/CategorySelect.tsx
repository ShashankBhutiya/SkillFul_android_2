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
import { Lock, MessageSquarePlus, Briefcase, Heart, ChevronLeft, ChevronRight, BookOpen, Search, ArrowRight } from "lucide-react";
import ReferralModal from "./ReferralModal";
import { supabase } from "@/lib/supabase";
import { SeoHead } from "@/components/SeoHead";

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

  // Scroll control ref and state for Professional section
  const professionalScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    const el = professionalScrollRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const el = professionalScrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      // Run an initial check after mounting
      checkScroll();
      // Handle window resizing
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [professionalCats]);

  const scrollProfessional = (direction: "left" | "right") => {
    const el = professionalScrollRef.current;
    if (el) {
      const { clientWidth } = el;
      const amount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Scroll control ref and state for Personal section
  const personalScrollRef = useRef<HTMLDivElement>(null);
  const [showPersonalLeftArrow, setShowPersonalLeftArrow] = useState(false);
  const [showPersonalRightArrow, setShowPersonalRightArrow] = useState(true);

  const checkPersonalScroll = () => {
    const el = personalScrollRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowPersonalLeftArrow(scrollLeft > 10);
      setShowPersonalRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const el = personalScrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkPersonalScroll);
      checkPersonalScroll();
      window.addEventListener("resize", checkPersonalScroll);
      return () => {
        el.removeEventListener("scroll", checkPersonalScroll);
        window.removeEventListener("resize", checkPersonalScroll);
      };
    }
  }, [personalCats]);

  const scrollPersonal = (direction: "left" | "right") => {
    const el = personalScrollRef.current;
    if (el) {
      const { clientWidth } = el;
      const amount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

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
        {/* Clean header */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-4xl">
            Pick a skill. Start swiping.
          </h2>
        </div>

        {/* Skill of the Day Callout */}
        {skillOfTheDay && (
          <div className="mx-auto mb-10 max-w-2xl rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 p-6 shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-300 group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-left">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${skillOfTheDay.gradient} text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                  {skillOfTheDay.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">Skill of the Day</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {questionCountMap.get(skillOfTheDay.id) ?? skillOfTheDay.questionCount} Scenarios
                    </span>
                  </div>
                  <h4 className="mt-1 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors sm:text-xl">{skillOfTheDay.name}</h4>
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
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98] w-full sm:w-auto"
              >
                {isSkillOfTheDayLocked ? (
                  <>
                    Unlock Skill
                    <Lock className="h-4 w-4 opacity-90" />
                  </>
                ) : (
                  <>
                    Start Swiping
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative mx-auto mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-full border border-border/50 bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex flex-col gap-8">
          {/* Professional */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Professional</h3>
                    <p className="text-xs text-muted-foreground">Career & workplace</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                  {professionalCats.length}
                </span>
              </div>
              <div className="relative group/scroll-container">
                {/* Left navigation arrow for desktop */}
                {showLeftArrow && (
                  <button
                    type="button"
                    onClick={() => scrollProfessional("left")}
                    className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110 active:scale-95 md:flex"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Right navigation arrow for desktop */}
                {showRightArrow && (
                  <button
                    type="button"
                    onClick={() => scrollProfessional("right")}
                    className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110 active:scale-95 md:flex"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                <div
                  ref={professionalScrollRef}
                  className="flex flex-row overflow-x-auto gap-4 pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
                >
                  {renderCategoryList(
                    professionalCats,
                    0,
                    "w-[140px] xs:w-[155px] sm:w-[170px] md:w-[185px] shrink-0 snap-start"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Personal</h3>
                    <p className="text-xs text-muted-foreground">Life & relationships</p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {personalCats.length}
                </span>
              </div>
              <div className="relative group/scroll-container">
                {/* Left navigation arrow for desktop */}
                {showPersonalLeftArrow && (
                  <button
                    type="button"
                    onClick={() => scrollPersonal("left")}
                    className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110 active:scale-95 md:flex"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Right navigation arrow for desktop */}
                {showPersonalRightArrow && (
                  <button
                    type="button"
                    onClick={() => scrollPersonal("right")}
                    className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 p-2 text-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110 active:scale-95 md:flex"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                <div
                  ref={personalScrollRef}
                  className="flex flex-row overflow-x-auto gap-4 pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
                >
                  {renderCategoryList(
                    personalCats,
                    professionalCats.length,
                    "w-[140px] xs:w-[155px] sm:w-[170px] md:w-[185px] shrink-0 snap-start"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            setShowRequestModal(true);
          }}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-primary/30 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/10"
        >
          <MessageSquarePlus className="h-5 w-5" />
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
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + i * 0.03 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (isLocked) {
          hapticError();
          setShowReferralFor({ id: cat.id, name: cat.name });
        } else {
          hapticLight();
          onSelect(cat.id);
        }
      }}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/90 text-left transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 ${className || "w-full"}`}
    >
      <div className="relative w-full h-24 sm:h-28 shrink-0 overflow-hidden rounded-t-2xl">
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
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            } ${isLocked ? "grayscale" : ""}`}
          />
        )}
        <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent" />
      </div>

      <div className="min-w-0 flex-1 p-3 flex flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-1">
          <span className="line-clamp-2 font-display text-[13px] font-bold leading-snug text-foreground sm:text-sm">
            {cat.name}
            {isLocked && <Lock className="ml-1 inline h-3.5 w-3.5 opacity-50" />}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary mt-0.5" />
        </div>

        {isLocked ? (
          <p className="text-[11px] text-muted-foreground leading-tight">
            Refer {requiredRefs} friend{requiredRefs > 1 ? "s" : ""} to unlock · {total} questions
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">
                <span className="font-semibold text-foreground">{practiced}</span>/{total} correct
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.2 + i * 0.04, duration: 0.6 }}
                  className="h-full rounded-full bg-primary/70"
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default CategorySelect;
