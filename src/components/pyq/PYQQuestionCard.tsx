import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PYQQuestion, PYQQuestionOption } from "@/services/pyqService";
import { Lightbulb, Info, Check, X, AlertCircle } from "lucide-react";

interface PYQQuestionCardProps {
  question: PYQQuestion;
  selectedAnswer: any; // string[] for MCQ, number/string for numerical
  isSubmitted: boolean;
  onAnswerChange: (answer: any) => void;
}

export default function PYQQuestionCard({
  question,
  selectedAnswer,
  isSubmitted,
  onAnswerChange
}: PYQQuestionCardProps) {
  const [numericalVal, setNumericalVal] = useState("");

  // Sync numerical input with selectedAnswer prop (useful for back/next sync)
  useEffect(() => {
    if (question.question_type === "numerical") {
      setNumericalVal(selectedAnswer !== undefined ? String(selectedAnswer) : "");
    }
  }, [selectedAnswer, question.id, question.question_type]);

  const handleMcqSelect = (optionId: string) => {
    if (isSubmitted) return;

    if (question.question_type === "single_correct" || question.question_type === "assertion_reasoning") {
      onAnswerChange([optionId]);
    } else if (question.question_type === "multiple_correct") {
      const current = Array.isArray(selectedAnswer) ? [...selectedAnswer] : [];
      const idx = current.indexOf(optionId);
      if (idx === -1) {
        current.push(optionId);
      } else {
        current.splice(idx, 1);
      }
      onAnswerChange(current);
    }
  };

  const handleNumericalSubmit = (val: string) => {
    if (isSubmitted) return;
    setNumericalVal(val);
    onAnswerChange(val.trim() === "" ? undefined : Number(val));
  };

  // Helper checks for rendering correct/incorrect styles on options
  const getOptionStatus = (optionId: string) => {
    if (!isSubmitted) return "idle";

    const correctList = Array.isArray(question.correct_answer) ? question.correct_answer : [];
    const userList = Array.isArray(selectedAnswer) ? selectedAnswer : [];

    const isCorrectOption = correctList.includes(optionId);
    const isSelectedByUser = userList.includes(optionId);

    if (isCorrectOption) return "correct"; // always show green for actual correct answers
    if (isSelectedByUser && !isCorrectOption) return "wrong"; // show red for user's wrong choices
    return "idle";
  };

  return (
    <div className="w-full bg-card rounded-3xl border border-border/50 shadow-md p-5 flex flex-col gap-5 text-left select-none relative overflow-hidden">
      {/* 1. Header Metadata (Chapters, Repeatability, Tags) */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Chapters */}
          <div className="flex flex-wrap gap-1">
            {question.chapters.map((ch) => (
              <span
                key={ch}
                className="text-[10px] font-extrabold bg-primary/10 text-primary uppercase tracking-wide px-2.5 py-0.5 rounded-full"
              >
                {ch}
              </span>
            ))}
          </div>

          {/* Repeatability Score */}
          {question.repeatability_score && (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              <span>Repeatability: {question.repeatability_score}/10</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-semibold text-muted-foreground/90 bg-muted/60 px-2 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Paper Year / Code */}
      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
        <span>Year {question.year}</span>
        {question.session && <span>{question.session}</span>}
      </div>

      {/* 3. Question Text (and Image if exists) */}
      <div className="space-y-4">
        <p className="font-display text-lg font-bold leading-relaxed text-foreground whitespace-pre-line">
          {question.question_text}
        </p>

        {question.question_image_url && (
          <div className="w-full flex justify-center py-2 bg-muted/30 rounded-2xl border border-border/30 overflow-hidden max-h-60">
            <img
              src={question.question_image_url}
              alt="Question Diagram"
              className="object-contain max-h-56"
            />
          </div>
        )}
      </div>

      {/* 4. Question Input Options */}
      <div className="flex flex-col gap-3 mt-2">
        {/* MCQ/Assertion-Reason Options */}
        {question.options && question.options.length > 0 ? (
          question.options.map((opt) => {
            const status = getOptionStatus(opt.id);
            const userList = Array.isArray(selectedAnswer) ? selectedAnswer : [];
            const isSelected = userList.includes(opt.id);

            let borderClass = "border-border/50 bg-background/50 hover:bg-card hover:border-primary/30";
            let selectIndicator = "border-muted-foreground/35";

            if (isSelected) {
              borderClass = "border-primary/40 bg-primary/5";
              selectIndicator = "border-primary bg-primary text-primary-foreground";
            }

            if (isSubmitted) {
              if (status === "correct") {
                borderClass = "border-success/40 bg-success/5 dark:bg-success/10";
                selectIndicator = "border-success bg-success text-success-foreground";
              } else if (status === "wrong") {
                borderClass = "border-destructive/40 bg-destructive/5 dark:bg-destructive/10";
                selectIndicator = "border-destructive bg-destructive text-destructive-foreground";
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleMcqSelect(opt.id)}
                disabled={isSubmitted}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all duration-200 ${borderClass} relative`}
              >
                {/* Indicator Bubble */}
                <div
                  className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${selectIndicator}`}
                >
                  {isSubmitted && status === "correct" ? (
                    <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                  ) : isSubmitted && status === "wrong" ? (
                    <X className="h-3.5 w-3.5 stroke-[3.5]" />
                  ) : (
                    opt.id
                  )}
                </div>

                {/* Option Text */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <span className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                    {opt.text}
                  </span>
                  {opt.image_url && (
                    <img
                      src={opt.image_url}
                      alt={`Option ${opt.id}`}
                      className="mt-2 max-h-24 object-contain rounded-md"
                    />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          /* Numerical Integer Input */
          <div className="flex flex-col gap-2 p-4 bg-muted/30 border border-border/40 rounded-2xl">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Enter Your Numerical Answer (Integer/Decimal)
            </label>
            <div className="flex gap-2 items-center mt-1">
              <input
                type="number"
                value={numericalVal}
                onChange={(e) => handleNumericalSubmit(e.target.value)}
                disabled={isSubmitted}
                placeholder="e.g. 200, 2.5"
                className="flex-1 bg-background border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:border-primary/50 text-sm font-semibold transition-all disabled:opacity-75"
              />
            </div>
            {isSubmitted && (
              <div className="flex items-center gap-2 mt-2 font-display text-sm">
                {String(selectedAnswer) === String(question.correct_answer) ? (
                  <div className="flex items-center gap-1.5 text-success font-bold bg-success/10 px-3 py-1.5 rounded-xl">
                    <Check className="w-4 h-4 stroke-[3]" /> Correct Value
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-destructive font-bold bg-destructive/10 px-3 py-1.5 rounded-xl w-full">
                    <div className="flex items-center gap-1.5">
                      <X className="w-4 h-4 stroke-[3]" /> Incorrect Value
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Correct Answer: <span className="text-success font-bold">{String(question.correct_answer)}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Post-Submission Feedback Alert */}
      {isSubmitted && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 mt-1">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground font-medium">
            Marking for this exam: <span className="text-foreground font-bold font-display">+{question.marks_correct}</span> on correct, <span className="text-foreground font-bold font-display">{question.marks_wrong}</span> on incorrect.
          </span>
        </div>
      )}

      {/* 6. Post-Submission Detailed Explanation */}
      <AnimatePresence>
        {isSubmitted && question.explanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-border/40 pt-4 mt-1"
          >
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                Detailed Solution
              </h4>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-line">
                {question.explanation}
              </p>
              {question.explanation_image_url && (
                <div className="w-full flex justify-center py-2 bg-background/50 rounded-xl overflow-hidden mt-1 max-h-48 border border-border/20">
                  <img
                    src={question.explanation_image_url}
                    alt="Explanation Diagram"
                    className="object-contain max-h-44"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
