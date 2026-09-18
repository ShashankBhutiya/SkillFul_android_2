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

const LEVELS: { value: PracticeLevel; label: string; detail: string }[] = [
  { value: "beginner", label: "Beginner", detail: "Build foundations" },
  { value: "intermediate", label: "Intermediate", detail: "Apply concepts" },
  { value: "advanced", label: "Advanced", detail: "Test mastery" },
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
      <div className="relative mx-auto w-full max-w-2xl px-4 pb-12 pt-3 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_68%)]" />

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="flex h-2 w-2 rounded-none bg-primary shadow-[1px_1px_0_rgba(0,0,0,0.25)]" style={{ imageRendering: "pixelated" }} />
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

        <form onSubmit={submit} className="mt-6">
          <div>
            <label htmlFor="practice-topic" className="text-sm font-semibold text-foreground">I want to practise</label>
            <div className={`topic-prompt relative mt-4${topic.trim() ? " is-filled" : ""}`}>
              <div className="topic-prompt__atmosphere" aria-hidden="true">
                <div className="topic-prompt__glow topic-prompt__glow--ambient" />
                <div className="topic-prompt__glow topic-prompt__glow--core" />
                <span className="topic-prompt__mote topic-prompt__mote--1" />
                <span className="topic-prompt__mote topic-prompt__mote--2" />
                <span className="topic-prompt__mote topic-prompt__mote--3" />
              </div>
              <span className="topic-prompt__tab">Your topic</span>
              <div className="topic-prompt__shell">
                <span className="topic-prompt__stud topic-prompt__stud--tl" />
                <span className="topic-prompt__stud topic-prompt__stud--tr" />
                <span className="topic-prompt__stud topic-prompt__stud--bl" />
                <span className="topic-prompt__stud topic-prompt__stud--br" />
                <div className="topic-prompt__frame">
                  <WandSparkles className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-primary" />
                  <textarea
                    id="practice-topic"
                    aria-describedby="practice-visibility"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    maxLength={240}
                    placeholder="e.g. Binary trees or thermodynamics chapter 2"
                    className="topic-prompt__input min-h-[88px] w-full resize-none bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/65"
                  />
                </div>
              </div>
              <span className="topic-prompt__caret" aria-hidden="true" />
            </div>

            {/* Quick Quest Inspiration Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">
                Ideas:
              </span>
              {[
                { label: "Binary Search Trees", icon: "⚡" },
                { label: "Dynamic Programming", icon: "👾" },
                { label: "SQL Joins & Indexing", icon: "💾" },
                { label: "OS Scheduling", icon: "🕹️" },
                { label: "System Design", icon: "🛡️" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setTopic(item.label)}
                  className="quest-chip"
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <p id="practice-visibility" className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Visible to your Placement Head if your institution is linked.
            </p>

            {/* 8-bit Power Gauge (Difficulty Meter) */}
            <fieldset className="mt-7">
              <div className="flex items-center justify-between mb-3">
                <legend className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Challenge Level
                </legend>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary font-mono">
                  {levelIndex === 0 && <span>🌱 NOVICE</span>}
                  {levelIndex === 1 && <span>⚡ ADEPT</span>}
                  {levelIndex === 2 && <span>🔥 MASTER</span>}
                  <span className="text-[11px] font-normal text-muted-foreground font-sans">· {selectedLevel.detail}</span>
                </div>
              </div>

              {/* 8-bit Pixel Energy Gauge */}
              <div className="power-gauge">
                <div className="power-gauge__track">
                  {LEVELS.map((item, idx) => {
                    const isActive = idx <= levelIndex;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setLevel(item.value)}
                        className={`power-gauge__cell ${isActive ? "is-active" : ""}`}
                        title={item.label}
                        aria-label={`Set challenge level to ${item.label}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between px-1 text-[11px] font-medium text-muted-foreground">
                  {LEVELS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={`transition-colors ${item.value === level ? "text-primary font-bold" : "hover:text-foreground"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
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

          <div className="pixel-btn-wrapper mt-7">
            {/* 8-bit Glow Behind Generate Button */}
            <div className={`pixel-btn-glow${trialUsed ? " pixel-btn-glow--gold" : ""}`} aria-hidden="true" />

            {trialUsed ? (
              <Link
                to="/premium"
                className="pixel-btn-modern pixel-btn-gold flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold"
              >
                <Sparkles className="h-4 w-4" /> Upgrade for More Sets <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="submit"
                disabled={loading || isLoading || !historyLoaded}
                className="pixel-btn-modern flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Questions…</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs leading-none opacity-80">✦</span>
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
