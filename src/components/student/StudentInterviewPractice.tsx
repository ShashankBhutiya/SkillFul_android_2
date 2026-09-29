import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown,
  History, Lightbulb, Loader2, MessageSquareText, Sparkles, Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import AuthModal from "@/components/AuthModal";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { SeoHead } from "@/components/SeoHead";
import { useAuth } from "@/contexts/AuthContext";
import { generateInterviewQuestions, getInterviewHistory } from "@/services/interviewPracticeService";
import type { PracticeLevel } from "@/types/aiPractice";
import type { InterviewPracticeSession } from "@/types/interviewPractice";

const LEVELS: { value: PracticeLevel; label: string; detail: string }[] = [
  { value: "beginner", label: "Beginner", detail: "Fundamentals and clear examples" },
  { value: "intermediate", label: "Intermediate", detail: "Applied knowledge and trade-offs" },
  { value: "advanced", label: "Advanced", detail: "Depth, edge cases, and leadership judgment" },
];

interface Props {
  onSwitchToTopic: () => void;
}

export default function StudentInterviewPractice({ onSwitchToTopic }: Props) {
  const { user, isLoading } = useAuth();
  const [jobDescription, setJobDescription] = useState("");
  const [level, setLevel] = useState<PracticeLevel>("intermediate");
  const [session, setSession] = useState<InterviewPracticeSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [history, setHistory] = useState<InterviewPracticeSession[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user.isGuest || !user.hasInterviewAccess) {
      setHistoryLoaded(true);
      return () => { cancelled = true; };
    }
    getInterviewHistory()
      .then((items) => { if (!cancelled) setHistory(items); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setHistoryLoaded(true); });
    return () => { cancelled = true; };
  }, [user.id, user.isGuest, user.hasInterviewAccess]);

  const loadMore = async (active: InterviewPracticeSession) => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const updated = await generateInterviewQuestions({ sessionId: active.id });
      setSession((current) => current?.id === updated.id ? updated : current);
      setHistory((items) => [updated, ...items.filter((item) => item.id !== updated.id)].slice(0, 12));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not prepare more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!session || loadingMore || questionIndex < session.questions.length - 2) return;
    void loadMore(session);
    // A longer question array is the signal that this batch finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, session?.id, session?.questions.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || isLoading) return;
    setError("");
    if (user.isGuest) {
      setShowAuth(true);
      return;
    }
    if (!user.hasInterviewAccess) return;
    if (!user.degree?.trim() || !user.academicYear?.trim()) {
      setError("Add your degree and current year in Profile Settings first.");
      setShowProfile(true);
      return;
    }
    if (jobDescription.trim().length < 80) {
      setError("Paste a fuller job description so the questions can be tailored to the role.");
      return;
    }
    setLoading(true);
    try {
      const created = await generateInterviewQuestions({ jobDescription: jobDescription.trim(), level });
      setSession(created);
      setQuestionIndex(0);
      setGuidanceOpen(false);
      setHistory((items) => [created, ...items.filter((item) => item.id !== created.id)].slice(0, 12));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate interview questions.");
    } finally {
      setLoading(false);
    }
  };

  const resume = (item: InterviewPracticeSession) => {
    setSession(item);
    setQuestionIndex(0);
    setGuidanceOpen(false);
    setError("");
  };

  if (session) {
    const question = session.questions[questionIndex];
    const atPreparedEnd = questionIndex >= session.questions.length - 1;
    return (
      <MainLayout>
        <SeoHead title="Interview Practice" description="Practise likely interview questions tailored to a job description." path="/skills/ai" />
        <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setSession(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> End session
            </button>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              Question {questionIndex + 1}
            </span>
          </div>

          <div className="mt-7 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{question?.type || "Interview"}</p>
              <h1 className="mt-1 truncate font-display text-lg font-semibold text-foreground">{session.title}</h1>
            </div>
          </div>

          {question ? (
            <motion.section key={question.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="surface mt-6 p-5 sm:p-7">
              <p className="text-xs font-medium text-muted-foreground">Think through your answer or say it aloud.</p>
              <h2 className="mt-3 font-display text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">{question.question}</h2>

              <button type="button" onClick={() => setGuidanceOpen((open) => !open)} className="mt-6 flex w-full items-center justify-between rounded-xl border border-border bg-muted/35 px-4 py-3 text-left text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Answer guidance</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${guidanceOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {guidanceOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-5 pt-5">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-primary" /> Why they may ask this</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{question.whyAsked}</p>
                      </div>
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Strong answer points</h3>
                        <ul className="mt-2 space-y-2">
                          {question.keyPoints.map((point) => <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{point}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><MessageSquareText className="h-4 w-4 text-primary" /> Answer framework</h3>
                        <p className="mt-2 rounded-lg bg-primary/5 p-3 text-sm leading-relaxed text-foreground">{question.answerFramework}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          ) : null}

          {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">{error}</p>}

          <button
            type="button"
            disabled={atPreparedEnd && loadingMore}
            onClick={() => {
              if (!atPreparedEnd) {
                setQuestionIndex((index) => index + 1);
                setGuidanceOpen(false);
              } else if (!loadingMore) {
                void loadMore(session);
              }
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {atPreparedEnd && loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing more questions…</> : <>Next question <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {loadingMore && !atPreparedEnd ? "Preparing the next questions in the background…" : "Continue for as many questions as you want."}
          </p>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SeoHead title="Interview Practice" description="Generate continuous interview practice from a job description." path="/skills/ai" />
      <div className="relative mx-auto w-full max-w-2xl px-4 pb-12 pt-3 sm:px-6">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/45 p-1">
          <button type="button" onClick={onSwitchToTopic} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">Topic Practice</button>
          <button type="button" className="rounded-lg bg-card px-3 py-2.5 text-sm font-semibold text-primary shadow-sm">Job Interview</button>
        </div>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Sparkles className="h-3.5 w-3.5" /> Interview Premium</div>
          <h1 className="mt-2 font-display text-2xl font-semibold text-foreground">Practise for the role you want</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Paste a job description to get high-probability questions based on its skills, responsibilities, and seniority.</p>
        </div>

        {!user.hasInterviewAccess && !user.isGuest ? (
          <section className="surface mt-7 p-5 sm:p-6">
            <BriefcaseBusiness className="h-8 w-8 text-primary" />
            <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Unlock continuous interview practice</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Interview Premium is ₹250/year. If your ₹50 Student Premium plan is active, upgrade for ₹200 and keep the same renewal date.
            </p>
            <Link to="/premium" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground">
              View Interview Premium <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} className="mt-7">
            <label htmlFor="job-description" className="text-sm font-semibold text-foreground">Job description</label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              maxLength={6000}
              placeholder="Paste the complete job description here…"
              className="mt-3 min-h-[220px] w-full resize-y rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Include responsibilities and required skills for better questions.</span><span>{jobDescription.length}/6000</span></div>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-foreground">Question difficulty</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {LEVELS.map((item) => <button key={item.value} type="button" onClick={() => setLevel(item.value)} className={`rounded-xl border p-3 text-left transition-colors ${level === item.value ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}><span className="block text-sm font-semibold text-foreground">{item.label}</span><span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{item.detail}</span></button>)}
              </div>
            </fieldset>

            {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">{error}</p>}
            <button type="submit" disabled={loading || isLoading || !historyLoaded} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Building your interview…</> : <><BriefcaseBusiness className="h-4 w-4" /> Start continuous practice <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {history.length > 0 && (
          <section className="mt-9">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5"><History className="h-4 w-4 text-muted-foreground" /><h2 className="font-display text-sm font-semibold text-foreground">Recent interviews</h2></div>
            <div className="mt-3 space-y-2">
              {history.map((item) => <button key={item.id} type="button" onClick={() => resume(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/35"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.questions.length} questions prepared · {item.level}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>)}
            </div>
          </section>
        )}
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <ProfileSettingsModal isOpen={showProfile} onClose={() => setShowProfile(false)} requireAcademicDetails />
    </MainLayout>
  );
}
