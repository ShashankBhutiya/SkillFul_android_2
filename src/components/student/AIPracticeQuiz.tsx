import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, RotateCcw, Sparkles, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useStreak } from "@/hooks/useStreak";
import { PracticeSaveStatus } from "./PracticeSaveStatus";
import type { AIPracticeSet, LegacyAIPracticeQuestion, PracticeAnswer } from "@/types/aiPractice";

interface AIPracticeQuizProps {
  set: AIPracticeSet;
  onExit: () => void;
  onNewSet: () => void;
}

const optionLetters = ["A", "B", "C", "D"];

export default function AIPracticeQuiz({ set, onExit, onNewSet }: AIPracticeQuizProps) {
  const { recordVisit } = useStreak();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const question = set.questions[index] as LegacyAIPracticeQuestion;

  const score = useMemo(() => answers.filter((answer) => answer.correct).length, [answers]);

  const chooseAnswer = (optionIndex: number) => {
    if (selected !== null) return;
    void recordVisit();
    setSelected(optionIndex);
    setAnswers((current) => [
      ...current,
      {
        questionId: question.id,
        selectedOption: optionIndex,
        correct: optionIndex === question.correctOption,
      },
    ]);
  };

  const continueQuiz = () => {
    if (index === set.questions.length - 1) {
      setFinished(true);

      return;
    }
    setIndex((current) => current + 1);
    setSelected(null);
  };

  if (finished) {
    const percentage = Math.round((score / set.questions.length) * 100);
    return (
      <>
      <PracticeSaveStatus setId={set.id} answers={answers} />
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="surface p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="section-label mt-5">Practice complete</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">{score}/{set.questions.length}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {percentage >= 80 ? "Strong work - you have a solid grip on this topic." : percentage >= 50 ? "Good start. Review the explanations and try another set." : "This is exactly what practice is for. Try an easier set and build up."}
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button onClick={onExit} className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted">
              Back home
            </button>
            <button onClick={onNewSet} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <RotateCcw className="h-4 w-4" /> New set
            </button>
          </div>
        </motion.div>
      </div>
      </>
    );
  }

  const answeredCorrectly = selected === question.correctOption;

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-4 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onExit} aria-label="Exit practice" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Progress value={((index + 1) / set.questions.length) * 100} className="h-2 bg-muted" />
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{index + 1}/{set.questions.length}</span>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <span className="section-label">{question.concept}</span>
          <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold capitalize text-muted-foreground">{set.level}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
            <h1 className="mt-4 font-display text-[24px] font-semibold leading-snug tracking-tight text-foreground">{question.question}</h1>

            <div className="mt-7 space-y-3">
              {question.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === question.correctOption;
                const isSelected = optionIndex === selected;
                const showCorrect = selected !== null && isCorrect;
                const showWrong = selected !== null && isSelected && !isCorrect;
                return (
                  <button
                    key={option}
                    onClick={() => chooseAnswer(optionIndex)}
                    disabled={selected !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-colors ${
                      showCorrect ? "border-success bg-success/5 text-foreground" : showWrong ? "border-destructive bg-destructive/5 text-foreground" : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${showCorrect ? "border-success bg-success text-white" : showWrong ? "border-destructive bg-destructive text-white" : "border-border bg-muted"}`}>
                      {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : optionLetters[optionIndex]}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selected !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 rounded-xl border p-4 ${answeredCorrectly ? "border-success/30 bg-success/5" : "border-destructive/20 bg-destructive/5"}`}>
              <p className={`text-sm font-bold ${answeredCorrectly ? "text-success" : "text-destructive"}`}>{answeredCorrectly ? "Correct" : "Not quite"}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{question.explanation}</p>
              <button onClick={continueQuiz} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background">
                {index === set.questions.length - 1 ? "See results" : "Next question"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
