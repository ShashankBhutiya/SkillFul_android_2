import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PYQQuestion } from "@/services/pyqService";
import { Award, CheckCircle, XCircle, ArrowLeft, RefreshCcw, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptics";

interface AnsweredQuestion {
  question: PYQQuestion;
  selectedAnswer: any;
  isCorrect: boolean;
  marksObtained: number;
}

interface PYQSummaryProps {
  exam: string;
  subject: string;
  totalScore: number;
  maxScore: number;
  attempts: AnsweredQuestion[];
  onRetry: () => void;
  onExit: () => void;
}

export default function PYQSummary({
  exam,
  subject,
  totalScore,
  maxScore,
  attempts,
  onRetry,
  onExit
}: PYQSummaryProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const examLabel = exam === "jee_main" ? "JEE Main" : exam === "jee_advanced" ? "JEE Advanced" : "NEET";
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const wrongCount = attempts.filter((a) => !a.isCorrect && a.selectedAnswer !== undefined).length;
  const skippedCount = attempts.filter((a) => a.selectedAnswer === undefined).length;
  const totalCount = attempts.length;

  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const handleToggleExpand = (idx: number) => {
    hapticLight();
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-xl mx-auto w-full select-none">
      {/* 1. Header Trophy Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 text-center shadow-lg"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Award className="h-8 w-8 animate-bounce" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Practice Completed!</h2>
        <p className="text-xs text-muted-foreground/80 mt-1 uppercase font-bold tracking-wider">
          {examLabel} · {subjectLabel}
        </p>

        {/* Big Score Counter */}
        <div className="mt-5 flex items-baseline justify-center gap-1.5">
          <span className="font-display text-4xl font-extrabold text-foreground">{totalScore}</span>
          <span className="text-sm font-semibold text-muted-foreground">/ {maxScore} Marks</span>
        </div>
      </motion.div>

      {/* 2. Mini metrics stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/30 border border-border/40 text-center">
          <span className="text-xl font-bold text-success font-display">{correctCount}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">Correct</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/30 border border-border/40 text-center">
          <span className="text-xl font-bold text-destructive font-display">{wrongCount}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">Wrong</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/30 border border-border/40 text-center">
          <span className="text-xl font-bold text-muted-foreground font-display">{accuracy}%</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">Accuracy</span>
        </div>
      </div>

      {/* 3. Review items list */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mt-2">
          Question Review & Solutions
        </h3>

        <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {attempts.map((att, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={att.question.id}
                className="flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-200"
              >
                {/* Header item */}
                <button
                  onClick={() => handleToggleExpand(idx)}
                  className="flex items-center justify-between p-3.5 text-left w-full hover:bg-muted/15 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {att.isCorrect ? (
                      <CheckCircle className="h-5 h-5 text-success shrink-0" />
                    ) : att.selectedAnswer === undefined ? (
                      <XCircle className="h-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <XCircle className="h-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate pr-2">
                        {att.question.question_text}
                      </p>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        Q{idx + 1} · {att.question.chapters.join(", ")} · {att.marksObtained >= 0 ? "+" : ""}{att.marksObtained} Marks
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4.5 w-4.5 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4.5 w-4.5 text-muted-foreground/50 shrink-0" />
                  )}
                </button>

                {/* Collapsible content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/30 bg-muted/10 p-3.5 flex flex-col gap-3.5"
                    >
                      {/* Statement details */}
                      <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-line leading-relaxed">
                        {att.question.question_text}
                      </p>

                      {/* Display options if MCQ */}
                      {att.question.options && att.question.options.length > 0 && (
                        <div className="flex flex-col gap-1.5 pl-1">
                          {att.question.options.map((opt) => {
                            const isCorrectOpt = att.question.correct_answer.includes(opt.id);
                            const isSelectedOpt = att.selectedAnswer?.includes(opt.id);

                            let textStyle = "text-muted-foreground";
                            let iconStyle = "border-muted-foreground/30";

                            if (isCorrectOpt) {
                              textStyle = "text-success font-bold";
                              iconStyle = "border-success bg-success text-success-foreground";
                            } else if (isSelectedOpt && !isCorrectOpt) {
                              textStyle = "text-destructive font-bold";
                              iconStyle = "border-destructive bg-destructive text-destructive-foreground";
                            }

                            return (
                              <div key={opt.id} className="flex items-start gap-2.5 text-xs py-0.5">
                                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[9px] font-bold ${iconStyle}`}>
                                  {opt.id}
                                </div>
                                <span className={textStyle}>{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* User Answer / Correct Answer for numerical */}
                      {att.question.question_type === "numerical" && (
                        <div className="text-xs font-semibold pl-1 space-y-1 bg-muted/40 p-2.5 rounded-xl">
                          <p className="text-muted-foreground">
                            Your answer: <span className={att.isCorrect ? "text-success font-bold" : "text-destructive font-bold"}>{att.selectedAnswer !== undefined ? String(att.selectedAnswer) : "Skipped"}</span>
                          </p>
                          <p className="text-success">
                            Correct answer: <span className="font-bold">{String(att.question.correct_answer)}</span>
                          </p>
                        </div>
                      )}

                      {/* Solution */}
                      {att.question.explanation && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex flex-col gap-1.5">
                          <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                            Solution Explanation
                          </h4>
                          <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed font-medium whitespace-pre-line">
                            {att.question.explanation}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Action CTA buttons */}
      <div className="flex gap-3.5 mt-2">
        <button
          onClick={() => {
            hapticSuccess();
            onExit();
          }}
          className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground font-display font-bold text-sm shadow-sm hover:bg-muted/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <button
          onClick={() => {
            hapticSuccess();
            onRetry();
          }}
          className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" /> Practice Again
        </button>
      </div>
    </div>
  );
}
