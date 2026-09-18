import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, BrainCircuit, ChevronDown, History, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import AuthModal from "@/components/AuthModal";
import AIPracticeQuiz from "@/components/student/AIPracticeQuiz";
import QuizGame from "@/components/QuizGame";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { useAuth } from "@/contexts/AuthContext";
import { generatePracticeSet, getPracticeHistory, hasUsedAIPracticeTrial } from "@/services/aiPracticeService";
import type { AIPracticeSet, PracticeLevel } from "@/types/aiPractice";
import { SeoHead } from "@/components/SeoHead";
import { hapticLight } from "@/hooks/useHaptics";

interface LevelOption {
  value: PracticeLevel;
  label: string;
  codename: string;
  icon: string;
  gradient: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  detail: string;
  desc: string;
  multiplier: string;
}

const LEVELS: LevelOption[] = [
  {
    value: "beginner",
    label: "Beginner",
    codename: "NOVICE",
    icon: "🌱",
    gradient: "from-emerald-500 to-teal-400",
    glow: "rgba(16, 185, 129, 0.35)",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    detail: "Build foundations",
    desc: "Core definitions, fundamentals & clear conceptual walkthroughs",
    multiplier: "1.0x",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    codename: "ADEPT",
    icon: "⚡",
    gradient: "from-violet-600 via-purple-500 to-indigo-500",
    glow: "rgba(139, 92, 246, 0.35)",
    badgeBg: "bg-violet-500/10 dark:bg-violet-500/20",
    badgeText: "text-violet-700 dark:text-violet-400",
    badgeBorder: "border-violet-500/30",
    detail: "Apply concepts",
    desc: "Real technical interview rigor, code logic & practical problem solving",
    multiplier: "1.5x",
  },
  {
    value: "advanced",
    label: "Advanced",
    codename: "MASTER",
    icon: "🔥",
    gradient: "from-amber-500 via-rose-500 to-red-600",
    glow: "rgba(244, 63, 94, 0.35)",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeText: "text-rose-700 dark:text-rose-400",
    badgeBorder: "border-rose-500/30",
    detail: "Test mastery",
    desc: "Deep edge-cases, system bottlenecks, traps & complex scenarios",
    multiplier: "2.0x",
  },
];

export default function StudentAIPractice() {
  const { user, isLoading } = useAuth();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<PracticeLevel>("intermediate");
  const [showQuotaDetails, setShowQuotaDetails] = useState(false);
  const [activeSet, setActiveSet] = useState<AIPracticeSet | null>(null);
  const [history, setHistory] = useState<AIPracticeSet[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const levelIndex = LEVELS.findIndex((item) => item.value === level);
  const selectedLevel = LEVELS[levelIndex];

  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    if (user.isGuest) {
      setHistory([]);
      setHasUsedTrial(false);
      setHistoryLoaded(true);
      return () => { cancelled = true; };
    }
    Promise.all([
      getPracticeHistory(),
      user.isPremium ? Promise.resolve(false) : hasUsedAIPracticeTrial(),
    ])
      .then(([sets, trialUsed]) => {
        if (!cancelled) {
          setHistory(sets);
          setHasUsedTrial(trialUsed);
        }
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setHistoryLoaded(true); });
    return () => { cancelled = true; };
  }, [user.id, user.isGuest, user.isPremium]);

  const trialUsed = !user.isPremium && hasUsedTrial;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || isLoading) return;
    setError("");
    if (trialUsed) {
      setError("Your free AI practice set has been used. Upgrade to Premium to generate more sets.");
      return;
    }
    if (!topic.trim()) {
      setError("Enter a topic to practise.");
      return;
    }
    if (user.isGuest) {
      setShowAuth(true);
      return;
    }
    if (!user.degree?.trim() || !user.academicYear?.trim()) {
      setError(!user.degree?.trim()
        ? "Add your degree in Profile Settings to personalise your questions."
        : "Select your current year in Profile Settings to personalise your questions.");
      setShowProfile(true);
      return;
    }

    setLoading(true);
    try {
      const set = await generatePracticeSet({
        topic: topic.trim(),
        level,
        degree: user.degree.trim(),
        academicYear: user.academicYear.trim(),
      });
      setActiveSet(set);
      setHistory((current) => [set, ...current.filter((item) => item.id !== set.id)].slice(0, 12));
      if (!user.isPremium) setHasUsedTrial(true);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (activeSet) {
    const isClassicFormat = activeSet.questions.length > 0 && "statement" in activeSet.questions[0];
    if (isClassicFormat) return (
      <QuizGame
        key={activeSet.id}
        categoryId={`practice-${activeSet.id}`}
        difficulty={activeSet.level === "beginner" ? "easy" : "intermediate"}
        generatedSet={activeSet}
        onBack={() => setActiveSet(null)}
        onHome={() => setActiveSet(null)}
        onSwitchDifficulty={() => setActiveSet(null)}
      />
    );
    return (
      <MainLayout>
        <AIPracticeQuiz set={activeSet} onExit={() => setActiveSet(null)} onNewSet={() => { setActiveSet(null); setTopic(""); }} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SeoHead title="AI Practice" description="Generate personalised practice questions for your degree, level, and topic." path="/skills" />
      <div className="relative mx-auto w-full max-w-2xl px-4 pb-12 pt-3 sm:px-6 min-w-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_68%)]" />

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <Sparkles className="h-3.5 w-3.5" />
            AI Practice
          </div>
          <Link to="/skills/classic" className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            <BookOpen className="h-3.5 w-3.5 text-primary" /> Classic
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Name a topic. We’ll tailor 10 questions to your degree and level.
          </p>
        </motion.div>

        <form onSubmit={submit} className="mt-6 w-full min-w-0">
          <div className="w-full min-w-0">
            <label htmlFor="practice-topic" className="text-sm font-semibold text-foreground">I want to practise</label>
            <div className="relative mt-3">
              <WandSparkles className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-primary" />
              <textarea
                id="practice-topic"
                aria-describedby="practice-visibility"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={240}
                placeholder="e.g. Binary trees or thermodynamics chapter 2"
                className="min-h-[96px] w-full resize-none rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              />
            </div>

            <p id="practice-visibility" className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Visible to your Placement Head if your institution is linked.
            </p>

            {/* Creative Kinetic Challenge Slider */}
            <fieldset className="mt-7 select-none min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <legend className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <span>Challenge Level</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/90 text-muted-foreground border border-border/50">
                    Difficulty Mode
                  </span>
                </legend>
                <motion.div
                  key={selectedLevel.value}
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border shadow-sm ${selectedLevel.badgeBg} ${selectedLevel.badgeText} ${selectedLevel.badgeBorder}`}
                >
                  <span className="text-sm">{selectedLevel.icon}</span>
                  <span>{selectedLevel.codename}</span>
                  <span className="opacity-30">|</span>
                  <span className="font-sans font-medium text-[11px] opacity-90">{selectedLevel.multiplier} XP</span>
                </motion.div>
              </div>

              {/* Futuristic Slider Console */}
              <div className="relative p-3 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm w-full min-w-0">
                {/* Track Base */}
                <div className="relative h-2.5 w-full rounded-full bg-muted/80 overflow-hidden">
                  {/* Glowing Fluid Progress Rail */}
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${selectedLevel.gradient}`}
                    initial={false}
                    animate={{
                      width: levelIndex === 0 ? "16%" : levelIndex === 1 ? "50%" : "100%",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                </div>

                {/* Interactive Kinetic Level Nodes */}
                <div className="relative flex justify-between items-center -mt-5 px-1 sm:px-2 w-full">
                  {LEVELS.map((item, idx) => {
                    const isSelected = item.value === level;
                    const isPast = idx <= levelIndex;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setLevel(item.value);
                          hapticLight();
                        }}
                        className="group relative flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl cursor-pointer shrink-0"
                        aria-label={`Set challenge level to ${item.label}`}
                      >
                        {/* Node Halo & Bead */}
                        <div className="relative flex items-center justify-center">
                          {isSelected && (
                            <motion.span
                              layoutId="active-aura"
                              className="absolute -inset-1.5 rounded-full bg-primary/20 blur-sm pointer-events-none"
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            />
                          )}
                          <motion.div
                            animate={{
                              scale: isSelected ? 1.15 : 1,
                              boxShadow: isSelected
                                ? `0 0 16px ${item.glow}, 0 2px 8px rgba(0,0,0,0.15)`
                                : "0 1px 3px rgba(0,0,0,0.08)",
                            }}
                            whileHover={{ scale: isSelected ? 1.2 : 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 450, damping: 24 }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected
                                ? "bg-background border-primary text-foreground shadow-md ring-2 ring-primary/25"
                                : isPast
                                  ? "bg-background border-primary/60 text-foreground"
                                  : "bg-muted border-border/80 text-muted-foreground group-hover:border-primary/40 group-hover:bg-background"
                            }`}
                          >
                            <span className="text-base leading-none select-none drop-shadow-sm">
                              {item.icon}
                            </span>
                          </motion.div>
                        </div>

                        {/* Level Title Below Node */}
                        <div className="mt-2 text-center">
                          <span
                            className={`block text-xs transition-colors ${
                              isSelected
                                ? "text-foreground font-bold"
                                : "text-muted-foreground/80 font-medium group-hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Detail Hologram Box */}
                <motion.div
                  key={selectedLevel.value}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`mt-3.5 p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${selectedLevel.badgeBg} ${selectedLevel.badgeBorder}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-2 w-2 rounded-full shrink-0 bg-current animate-ping opacity-75" />
                    <p className="line-clamp-2 sm:truncate text-foreground font-medium text-[11px] sm:text-xs">
                      {selectedLevel.desc}
                    </p>
                  </div>
                  <span className={`self-start sm:self-auto shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-background/80 ${selectedLevel.badgeText} border border-current/20 shadow-xs`}>
                    {selectedLevel.detail}
                  </span>
                </motion.div>
              </div>
            </fieldset>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowQuotaDetails((show) => !show)}
                aria-expanded={showQuotaDetails}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground font-medium"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showQuotaDetails ? "rotate-180" : ""}`} />
                10 questions · How it works
              </button>
              {showQuotaDetails && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {user.isPremium
                    ? "Generate one set per minute. Your streak raises the daily limit."
                    : "Your free trial includes one set. Upgrade for more."}
                </p>
              )}
            </div>

            {trialUsed && (
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3 text-xs leading-relaxed text-foreground">
                Trial used. Replay it below or upgrade for another topic.
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p role="alert" aria-live="polite" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-7">
            {trialUsed ? (
              <Link
                to="/premium"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-[0.99]"
              >
                <Sparkles className="h-4 w-4" /> Upgrade for More Sets <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="submit"
                disabled={loading || isLoading || !historyLoaded}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Questions…</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-4 w-4" />
                    <span>{user.isPremium ? "Start Practice Set" : "Generate Free Set"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {history.length > 0 && (
          <section className="mt-9">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Recent practice
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {history.length} {history.length === 1 ? "set" : "sets"}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {history.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSet(item)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border border-border/80 bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.title || item.topic}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize font-medium text-primary font-mono text-[11px]">
                        [{item.level}]
                      </span>
                      <span>·</span>
                      <span>{item.questions.length} {item.questions.length === 1 ? "question" : "questions"}</span>
                      <span>·</span>
                      <span className="truncate">{item.academicYear}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <ProfileSettingsModal isOpen={showProfile} onClose={() => setShowProfile(false)} requireAcademicDetails />
    </MainLayout>
  );
}
