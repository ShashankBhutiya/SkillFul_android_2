import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, BrainCircuit, Clock3, History, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import AuthModal from "@/components/AuthModal";
import AIPracticeQuiz from "@/components/student/AIPracticeQuiz";
import { useAuth } from "@/contexts/AuthContext";
import { generatePracticeSet, getPracticeHistory } from "@/services/aiPracticeService";
import type { AIPracticeSet, PracticeLevel } from "@/types/aiPractice";
import { SeoHead } from "@/components/SeoHead";

const QUICK_TOPICS = ["Data structures", "Organic chemistry", "Indian polity", "Financial accounting"];
const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Postgraduate"];
const LEVELS: { value: PracticeLevel; label: string; detail: string }[] = [
  { value: "beginner", label: "Beginner", detail: "Build foundations" },
  { value: "intermediate", label: "Intermediate", detail: "Apply concepts" },
  { value: "advanced", label: "Advanced", detail: "Test mastery" },
];

export default function StudentAIPractice() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [degree, setDegree] = useState(() => localStorage.getItem("student_degree") || "");
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem("student_academic_year") || "2nd year");
  const [level, setLevel] = useState<PracticeLevel>("intermediate");
  const [questionCount, setQuestionCount] = useState(10);
  const [activeSet, setActiveSet] = useState<AIPracticeSet | null>(null);
  const [history, setHistory] = useState<AIPracticeSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!user.isGuest) getPracticeHistory().then(setHistory).catch(() => undefined);
  }, [user.isGuest]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!topic.trim() || !degree.trim()) {
      setError("Tell us the topic and your degree so the questions can be personalised.");
      return;
    }
    if (user.isGuest) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem("student_degree", degree.trim());
      localStorage.setItem("student_academic_year", academicYear);
      const set = await generatePracticeSet({
        topic: topic.trim(),
        degree: degree.trim(),
        academicYear,
        level,
        questionCount,
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
          <Link to="/skills" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <BookOpen className="h-3.5 w-3.5" /> Practice catalog
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mt-7 font-display text-[32px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
            What do you want to <span className="text-gradient">master today?</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Ask for any subject or concept. Skillful creates a fresh practice set matched to your degree, year, and level.
          </p>
        </motion.div>

        <form onSubmit={submit} className="surface mt-7 overflow-hidden">
          <div className="p-5 sm:p-6">
            <label htmlFor="practice-topic" className="text-sm font-semibold text-foreground">I want to practise</label>
            <div className="relative mt-2">
              <WandSparkles className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-primary" />
              <textarea
                id="practice-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={240}
                placeholder="e.g. Binary trees for placement interviews, or thermodynamics chapter 2"
                className="min-h-[92px] w-full resize-none rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_TOPICS.map((quickTopic) => (
                <button key={quickTopic} type="button" onClick={() => setTopic(quickTopic)} className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground">
                  {quickTopic}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Degree / programme</span>
                <input value={degree} onChange={(event) => setDegree(event.target.value)} maxLength={80} placeholder="e.g. B.Tech Computer Science" className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">Current year</span>
                <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                  {YEARS.map((year) => <option key={year}>{year}</option>)}
                </select>
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="text-xs font-semibold text-foreground">Challenge level</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {LEVELS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setLevel(item.value)} className={`rounded-lg border px-2 py-2.5 text-left transition-colors ${level === item.value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"}`}>
                    <span className={`block text-xs font-semibold ${level === item.value ? "text-primary" : "text-foreground"}`}>{item.label}</span>
                    <span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">{item.detail}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-foreground">Questions</p>
                <div className="mt-2 flex gap-1.5">
                  {[5, 10, 15].map((count) => (
                    <button key={count} type="button" onClick={() => setQuestionCount(count)} className={`h-8 min-w-9 rounded-md px-2 text-xs font-bold ${questionCount === count ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{count}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right text-[11px] text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                About {Math.max(2, Math.round(questionCount * 0.4))} min
              </div>
            </div>

            <AnimatePresence>
              {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">{error}</motion.p>}
            </AnimatePresence>
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 border-t border-primary/20 bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating your questions…</> : <><BrainCircuit className="h-4 w-4" /> Generate my practice <ArrowRight className="h-4 w-4" /></>}
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
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">{item.level} · {item.questions.length} questions · {item.academicYear}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </MainLayout>
  );
}
