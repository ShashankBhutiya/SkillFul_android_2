import { useState, useEffect, useRef } from "react";
import { fetchPYQQuestions, savePYQAttempt, PYQQuestion } from "@/services/pyqService";
import PYQQuestionCard from "./PYQQuestionCard";
import PYQSummary from "./PYQSummary";
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";
import { hapticLight, hapticSuccess, hapticError } from "@/hooks/useHaptics";
import FloatingOrbs from "../FloatingOrbs";

interface PYQQuizGameProps {
  exam: "jee_main" | "jee_advanced" | "neet";
  subject: "physics" | "chemistry" | "mathematics" | "biology";
  userId: string;
  onBack: () => void;
}

interface UserAttempt {
  question: PYQQuestion;
  selectedAnswer: any; // string[] for MCQ, number/string for numerical
  isSubmitted: boolean;
  isCorrect: boolean;
  marksObtained: number;
}

export default function PYQQuizGame({ exam, subject, userId, onBack }: PYQQuizGameProps) {
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Record<string, UserAttempt>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  const isFirstLoadRef = useRef(true);

  const examLabel = exam === "jee_main" ? "JEE Main" : exam === "jee_advanced" ? "JEE Advanced" : "NEET";
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  // 1. Fetch questions on mount/params change
  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      try {
        const data = await fetchPYQQuestions(exam, subject);
        // Shuffle questions or keep chronological
        setQuestions(data);
      } catch (err) {
        console.warn("Failed to load questions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [exam, subject]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-semibold">Loading questions...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">No questions found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            We couldn't find any questions in the database for {examLabel} - {subjectLabel} yet.
          </p>
        </div>
        <button
          onClick={onBack}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAttempt = attempts[currentQuestion.id] || {
    question: currentQuestion,
    selectedAnswer: undefined,
    isSubmitted: false,
    isCorrect: false,
    marksObtained: 0
  };

  const isCurrentSubmitted = currentAttempt.isSubmitted;
  const isMarked = !!markedForReview[currentQuestion.id];

  // Helper check for correctness & calculate marks obtained
  const calculateResult = (question: PYQQuestion, answer: any): { isCorrect: boolean; marks: number } => {
    if (answer === undefined) {
      return { isCorrect: false, marks: 0 };
    }

    if (question.question_type === "numerical") {
      const isCorrect = Number(answer) === Number(question.correct_answer);
      return {
        isCorrect,
        marks: isCorrect ? question.marks_correct : question.marks_wrong
      };
    }

    // MCQ types: answer is an array of option IDs
    const userAns = Array.isArray(answer) ? [...answer].sort() : [];
    const correctAns = Array.isArray(question.correct_answer) ? [...question.correct_answer].sort() : [];

    if (question.question_type === "single_correct" || question.question_type === "assertion_reasoning") {
      const isCorrect = userAns.length === 1 && userAns[0] === correctAns[0];
      return {
        isCorrect,
        marks: isCorrect ? question.marks_correct : question.marks_wrong
      };
    }

    if (question.question_type === "multiple_correct") {
      // JEE Advanced multi-correct check
      const correctSet = new Set(correctAns);
      const userSet = new Set(userAns);

      // Check if user answer matches correct exactly
      const isPerfect = userAns.length === correctAns.length && userAns.every(v => correctSet.has(v));
      if (isPerfect) {
        return { isCorrect: true, marks: question.marks_correct };
      }

      // Check for negative marking (any wrong selection gives negative)
      const hasWrongSelection = userAns.some(v => !correctSet.has(v));
      if (hasWrongSelection) {
        return { isCorrect: false, marks: question.marks_wrong };
      }

      // Partial marking (e.g. user selected some subset of correct options, no wrong options)
      if (userAns.length > 0) {
        const partialMarks = (question.marks_partial || 1) * userAns.length;
        return { isCorrect: true, marks: partialMarks };
      }

      return { isCorrect: false, marks: 0 }; // unattempted or similar
    }

    return { isCorrect: false, marks: 0 };
  };

  const handleAnswerChange = (newAns: any) => {
    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAttempt,
        selectedAnswer: newAns
      }
    }));
  };

  const handleToggleMark = () => {
    hapticLight();
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  };

  const handleSubmitAnswer = async () => {
    if (currentAttempt.selectedAnswer === undefined) {
      hapticError();
      return;
    }

    hapticSuccess();
    const { isCorrect, marks } = calculateResult(currentQuestion, currentAttempt.selectedAnswer);
    
    const updatedAttempt = {
      ...currentAttempt,
      isSubmitted: true,
      isCorrect,
      marksObtained: marks
    };

    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedAttempt
    }));

    // Trigger save attempt to Supabase background task
    savePYQAttempt({
      question_id: currentQuestion.id,
      exam,
      subject,
      is_correct: isCorrect,
      user_answer: currentAttempt.selectedAnswer,
      marks_obtained: marks,
      time_taken_ms: 0 // optional tracking
    }, userId);
  };

  const handleNext = () => {
    hapticLight();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate scores for summary
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    hapticLight();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRetry = () => {
    setAttempts({});
    setCurrentIndex(0);
    setMarkedForReview({});
    setIsCompleted(false);
  };

  // Compute stats for summary screen
  const totalScore = Object.values(attempts).reduce((sum, att) => sum + (att.isSubmitted ? att.marksObtained : 0), 0);
  const maxScore = questions.reduce((sum, q) => sum + q.marks_correct, 0);

  if (isCompleted) {
    const summaryAttempts = questions.map((q) => {
      return attempts[q.id] || {
        question: q,
        selectedAnswer: undefined,
        isCorrect: false,
        marksObtained: 0
      };
    });

    return (
      <PYQSummary
        exam={exam}
        subject={subject}
        totalScore={totalScore}
        maxScore={maxScore}
        attempts={summaryAttempts}
        onRetry={handleRetry}
        onExit={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      <FloatingOrbs />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 z-0" />

      {/* Top action header bar */}
      <div className="relative z-10 flex items-center justify-between p-3 shrink-0 border-b border-border/40 bg-background/50 backdrop-blur-md">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors"
          title="Back to subject selection"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-display font-extrabold uppercase tracking-wide bg-primary/10 text-primary px-3 py-1 rounded-full">
            {examLabel} · {subjectLabel}
          </span>
        </div>

        {/* Mark for review toggle */}
        <button
          onClick={handleToggleMark}
          className={`p-2.5 rounded-full backdrop-blur-sm transition-colors border ${
            isMarked
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
              : "bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground"
          }`}
          title="Mark this question for review"
        >
          {isMarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress counter bar */}
      <div className="relative z-10 px-4 py-2 shrink-0 max-w-xl mx-auto w-full">
        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-1.5 px-1.5">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="font-bold text-foreground">
            {Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card space */}
      <div className="relative z-10 flex-1 flex flex-col justify-start items-center px-4 py-3 min-h-0 overflow-y-auto pb-24">
        <div className="w-full max-w-xl">
          <PYQQuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            selectedAnswer={currentAttempt.selectedAnswer}
            isSubmitted={isCurrentSubmitted}
            onAnswerChange={handleAnswerChange}
          />
        </div>
      </div>

      {/* Sticky Bottom Quiz Control Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/50 p-4 pb-[env(safe-area-inset-bottom,16px)] flex items-center justify-between gap-4 shrink-0 max-w-xl mx-auto rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-border bg-card font-display text-xs font-bold text-foreground transition-all hover:bg-muted/30 active:scale-[0.98] disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Submit or Next primary button */}
        {!isCurrentSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={currentAttempt.selectedAnswer === undefined}
            className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-display text-sm font-extrabold shadow-md shadow-primary/20 hover:bg-primary/95 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-2xl bg-foreground text-background font-display text-sm font-extrabold shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {currentIndex === questions.length - 1 ? "Finish Practice" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
