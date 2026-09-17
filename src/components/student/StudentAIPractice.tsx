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
import { generatePracticeSet, getPracticeHistory } from "@/services/aiPracticeService";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!user.isGuest) getPracticeHistory().then(setHistory).catch(() => undefined);
  }, [user.isGuest]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || isLoading) return;
    setError("");
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
      <div className="relative mx-auto w-full max-w-2xl px-4 pb-12 pt-7 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_68%)]" />

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Skillful AI
          </div>
          <Link to="/skills/classic" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <BookOpen className="h-3.5 w-3.5" /> Classic
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mt-7 font-display text-[32px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
            What do you want to <span className="text-gradient">master today?</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Ask for any subject or concept. Skillful prepares a practice set matched to your degree, year, and level, reusing relevant saved questions when available.
          </p>
        </motion.div>

        <form onSubmit={submit} className="surface mt-7 overflow-hidden">
          <div className="p-5 sm:p-6">
            <label htmlFor="practice-topic" className="text-sm font-semibold text-foreground">I want to practise</label>
            <div className="relative mt-2">
              <WandSparkles className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-primary" />
              <textarea
                id="practice-topic"
                aria-describedby="practice-visibility"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={240}
                placeholder="e.g. Binary trees for placement interviews, or thermodynamics chapter 2"
                className="min-h-[92px] w-full resize-none rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <p id="practice-visibility" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Your AI searches and generated practice sets will be visible on your Placement Head's portal when you are linked to an institution.
            </p>

            <fieldset className="mt-6">
              <legend className="text-xs font-semibold text-foreground">Challenge level</legend>
              <div className="mt-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-background to-accent/5 px-4 pb-3 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-primary">{LEVELS.find((item) => item.value === level)?.label}</span>
                  <span className="text-xs text-muted-foreground">{LEVELS.find((item) => item.value === level)?.detail}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={LEVELS.findIndex((item) => item.value === level)}
                  onChange={(event) => setLevel(LEVELS[Number(event.target.value)].value)}
                  aria-label="Challenge level"
                  aria-valuetext={LEVELS.find((item) => item.value === level)?.label}
                  className="w-full cursor-pointer accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
                  {LEVELS.map((item) => <span key={item.value}>{item.label}</span>)}
                </div>
              </div>
            </fieldset>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowQuotaDetails((show) => !show)}
                aria-expanded={showQuotaDetails}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showQuotaDetails ? "rotate-180" : ""}`} />
                Ten questions per set · How it works
              </button>
              {showQuotaDetails && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  One set can be generated per minute. Your daily quota starts at 40 questions and grows by 10 for each active streak day, up to 300. Quotas reset at 5:30 AM IST; saved sets are always free to practise.
                </p>
              )}
            </div>

            <AnimatePresence>
              {error && <motion.p role="alert" aria-live="polite" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">{error}</motion.p>}
            </AnimatePresence>
          </div>

          <button type="submit" disabled={loading || isLoading} className="flex w-full items-center justify-center gap-2 border-t border-primary/20 bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing your questions…</> : <><BrainCircuit className="h-4 w-4" /> Start my practice <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        {history.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold text-foreground">Recent practice</h2>
            </div>
            <div className="mt-3 space-y-2">
              {history.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => setActiveSet(item)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-3.5 text-left hover:border-primary/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title || item.topic}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">{item.level} · {item.questions.length} {item.questions.length === 1 ? "question" : "questions"} · {item.academicYear}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
