import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { categories, Category, Question } from "@/data/questions";
import { savePracticedIds, getPracticedIds } from "@/services/progressService";
import { submitScore } from "@/services/leaderboardService";
import { useAuth } from "@/contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import StreakCelebration from "@/components/streak/StreakCelebration";
import SwipeCard from "./SwipeCard";
import QuizSummary from "./QuizSummary";
import FloatingOrbs from "./FloatingOrbs";
import AuthModal from "./AuthModal";
import { MilestoneCelebration } from "./MilestoneCelebration";
import { ArrowLeft, X, Volume2, VolumeX, Zap, Lock, Lightbulb, RefreshCcw, XCircle } from "lucide-react";
import { playCorrect, playWrong, playCombo, getSoundsEnabled, setSoundsEnabled } from "@/hooks/useSounds";
import { hapticSuccess, hapticError, hapticCelebration } from "@/hooks/useHaptics";
import { trackSwipe, trackQuizComplete, trackLoginGate } from "@/utils/analytics";

// Guests may browse the catalog, but an account is required before the first
// question — progress, streaks and the leaderboard all key off a real user id.
const LOGIN_GATE_INTERVAL = 0;

// ─── Global cumulative question counter (persisted in localStorage) ───
const GLOBAL_COUNT_KEY = "quiz_global_answered_count";

function getGlobalAnsweredCount(): number {
  try {
    return parseInt(localStorage.getItem(GLOBAL_COUNT_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function incrementGlobalAnsweredCount(): number {
  const newCount = getGlobalAnsweredCount() + 1;
  localStorage.setItem(GLOBAL_COUNT_KEY, String(newCount));
  return newCount;
}

interface QuizGameProps {
  categoryId: string;
  difficulty: "easy" | "intermediate";
  onBack: () => void;
  onHome: () => void;
  onSwitchDifficulty: (diff: "easy" | "intermediate") => void;
}

const encouragements = [
  "On Fire!", "Unstoppable!", "Lightning!", "Brilliant!", "Perfect!",
  "Great job!", "Nailed it!", "Keep that momentum!", "Spot on!",
  "That was impressive!", "Genius!", "Wow, you're good!", "Excellent choice!",
  "I knew you knew that!", "Look at you go!", "Fantastic!", "Another one!",
  "You're unstoppable!"
];
const wrongMessages = ["Almost!", "So close!", "Keep going!", "Not quite!", "Oops!"];
const milestoneMessages = [
  "You're crushing it!",
  "Unstoppable machine!",
  "Knowledge is power!",
  "Keep the streak alive!",
  "Keep the streak alive!",
  "10 more down!",
];

/** Slice questions by difficulty: easy = first 50, intermediate = rest */
function getQuestionsForDifficulty(category: Category, difficulty: "easy" | "intermediate"): Question[] {
  if (category.questions.length <= 50) {
    // Not enough for two levels — easy gets all, intermediate gets nothing
    return difficulty === "easy" ? [...category.questions] : [];
  }
  if (difficulty === "easy") {
    return category.questions.slice(0, 50);
  }
  return category.questions.slice(50);
}

/** Get unpracticed questions for a given subset */
function getUnpracticedSubset(allQuestions: Question[], categoryId: string, userId: string): Question[] {
  const practiced = new Set(getPracticedIds(categoryId, userId));
  return allQuestions.filter((q) => !practiced.has(q.id));
}

/** Format seconds → "Xm Ys" */
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export interface AnsweredQuestion {
  question: Question;
  correct: boolean;
  responseTimeMs: number; // milliseconds taken to answer
}

const QuizGame = ({ categoryId, difficulty, onBack, onHome, onSwitchDifficulty }: QuizGameProps) => {
  const { user } = useAuth();
  const { recordMilestonePractice, lastResult, acknowledgeResult } = useStreak();
  const category = categories.find((c) => c.id === categoryId)!;
  const difficultyQuestions = getQuestionsForDifficulty(category, difficulty);

  const [questions, setQuestions] = useState(() => {
    const unpracticed = getUnpracticedSubset(difficultyQuestions, categoryId, user.id);
    return unpracticed.length > 0 ? unpracticed : [...difficultyQuestions];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [combo, setCombo] = useState(1);
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [comboPopup, setComboPopup] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [soundOn, setSoundOn] = useState(getSoundsEnabled);

  // --- Login gate for guests ---
  const [showLoginGate, setShowLoginGate] = useState(user.isGuest);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Guests are stopped at the door and released the moment they sign in.
  useEffect(() => {
    setShowLoginGate(user.isGuest);
    if (user.isGuest) trackLoginGate(LOGIN_GATE_INTERVAL);
  }, [user.isGuest]);

  // --- Milestone popup ---
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneNumber, setMilestoneNumber] = useState(0);
  const [pendingPracticeMilestone, setPendingPracticeMilestone] = useState<number | null>(null);

  // --- Timing ---
  const sessionStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const correctIdsRef = useRef<number[]>([]);

  const sessionCorrectCount = answeredQuestions.filter((a) => a.correct).length;
  const progressCount = showMilestone ? 5 : (sessionCorrectCount % 5);

  // Reset question timer whenever currentIndex changes
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  // Save on finish (only for logged-in users)
  useEffect(() => {
    if (isFinished && correctIdsRef.current.length > 0) {
      savePracticedIds(user.id, categoryId, correctIdsRef.current);
    }

    // Submit score to leaderboard (both guests and authenticated users)
    if (isFinished && answeredQuestions.length > 0) {
      const correctCount = answeredQuestions.filter((a) => a.correct).length;
      const totalQ = answeredQuestions.length;
      const accuracyPct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
      const displayName = user.isGuest
        ? `Guest_${user.id.slice(-4)}`
        : (user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : (user.email?.split("@")[0] || "Player"));

      // Track quiz completion to Google Analytics
      trackQuizComplete(categoryId, score, accuracyPct);

      submitScore({
        userId: user.id,
        displayName,
        categoryId,
        difficulty,
        score,
        correctCount,
        totalQuestions: totalQ,
        bestStreak,
        accuracyPct,
      }).catch(() => {}); // fire-and-forget
    }
  }, [isFinished, categoryId, user.id, user.isGuest]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      setSoundsEnabled(!prev);
      return !prev;
    });
  }, []);

  const spawnParticles = useCallback(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 350 - 175,
      y: Math.random() * -250 - 50,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1200);
  }, []);

  /** Every answered scenario counts toward a practice milestone, including retries. */
  const totalAnswered = answeredQuestions.length;

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const question = questions[currentIndex];
      const userAnswer = direction === "right";
      const isCorrect = userAnswer === question.answer;
      const responseTimeMs = Date.now() - questionStartRef.current;
      const newAnsweredCount = totalAnswered + 1;
      // A practice milestone measures effort, not correctness. A user reaches
      // it after every five answered scenarios, including answers they learn
      // from and retry later.
      const isPracticeMilestone = newAnsweredCount % 5 === 0;

      setAnsweredQuestions((prev) => [...prev, { question, correct: isCorrect, responseTimeMs }]);

      // Log swipe event to Google Analytics
      trackSwipe(direction, question.id, categoryId, isCorrect);

      if (isCorrect) {
        const newStreak = streak + 1;
        const newCombo = Math.min(Math.floor(newStreak / 3) + 1, 5);
        const points = 10 * newCombo;

        correctIdsRef.current.push(question.id);

        // Submit running score to leaderboard after every correct answer
        // so even 1 question answered gets the user on the leaderboard
        const prevCorrect = answeredQuestions.filter((a) => a.correct).length;
        const newCorrectCount = prevCorrect + 1;
        {
          const newScore = score + points;
          const newTotalAnswered = answeredQuestions.length + 1;
          const newAccuracy = Math.round((newCorrectCount / newTotalAnswered) * 100);
          const newBestStreak = Math.max(bestStreak, newStreak);
          const displayName = user.isGuest
            ? `Guest_${user.id.slice(-4)}`
            : (user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : (user.email?.split("@")[0] || "Player"));

          submitScore({
            userId: user.id,
            displayName,
            categoryId,
            difficulty,
            score: newScore,
            correctCount: newCorrectCount,
            totalQuestions: newTotalAnswered,
            bestStreak: newBestStreak,
            accuracyPct: newAccuracy,
          }).catch(() => {}); // fire-and-forget
        }

        setScore((s) => s + points);
        setStreak(newStreak);
        setBestStreak((b) => Math.max(b, newStreak));
        setCombo(newCombo);
        setShowFeedback("correct");
        setFeedbackMessage(encouragements[Math.floor(Math.random() * encouragements.length)]);
        spawnParticles();
        playCorrect();
        hapticSuccess();

        if (newCombo > 1) {
          setComboPopup(newCombo);
          playCombo();
          setTimeout(() => setComboPopup(null), 800);
        }

        if (isPracticeMilestone) {
          // A streak day requires five answered practice scenarios.
          void recordMilestonePractice();
          // Save checkpoint to database/localStorage
          savePracticedIds(user.id, categoryId, correctIdsRef.current).catch(() => {});
        }

        // Increment global cumulative counter
        incrementGlobalAnsweredCount();

        setTimeout(() => {
          setShowFeedback(null);

          if (currentIndex + 1 >= questions.length) {
            setIsFinished(true);
          } else if (isPracticeMilestone) {
            // Show milestone popup
            setMilestoneNumber(newAnsweredCount);
            setShowMilestone(true);
            hapticCelebration();
          } else {
            setCurrentIndex((i) => i + 1);
          }
        }, 1000);
      } else {
        setStreak(0);
        setCombo(1);
        setIsShaking(true);
        setShowFeedback("wrong");
        setFeedbackMessage(wrongMessages[Math.floor(Math.random() * wrongMessages.length)]);
        setCurrentExplanation(question.explanation);
        setCurrentCorrectAnswer(question.answer);
        setShowExplanation(true);
        playWrong();
        hapticError();
        if (isPracticeMilestone) {
          void recordMilestonePractice();
          setPendingPracticeMilestone(newAnsweredCount);
        }
        setQuestions((prev) => [...prev, question]);
        setTimeout(() => setIsShaking(false), 500);
      }
    },
    [currentIndex, questions, streak, spawnParticles, categoryId, user.id, totalAnswered, user.isGuest, recordMilestonePractice]
  );

  const dismissExplanation = useCallback(() => {
    setShowExplanation(false);
    setShowFeedback(null);
    if (currentIndex + 1 >= questions.length) {
      setIsFinished(true);
    } else if (pendingPracticeMilestone !== null) {
      setMilestoneNumber(pendingPracticeMilestone);
      setPendingPracticeMilestone(null);
      setShowMilestone(true);
      hapticCelebration();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, pendingPracticeMilestone, questions.length]);

  const dismissMilestone = useCallback(() => {
    setShowMilestone(false);
    setCurrentIndex((i) => i + 1);
  }, []);

  // When auth modal closes, check if still guest — if so, re-show gate
  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
    // Still a guest means the gate stands. On success we simply drop it — the
    // gate now appears before the first question, so there is nothing to skip.
    setShowLoginGate(user.isGuest);
  }, [user.isGuest]);

  // Session elapsed time
  const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);

  if (isFinished) {
    const hasIntermediate = category.questions.length > 50;
    const totalSessionTime = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    return (
      <>
      <StreakCelebration result={lastResult} onDismiss={acknowledgeResult} />
      <QuizSummary
        category={category}
        score={score}
        bestStreak={bestStreak}
        answeredQuestions={answeredQuestions}
        totalSessionTimeSec={totalSessionTime}
        difficulty={difficulty}
        hasIntermediate={hasIntermediate}
        onPlayAgain={() => {
          correctIdsRef.current = [];
          const subset = getQuestionsForDifficulty(category, difficulty);
          const unpracticed = getUnpracticedSubset(subset, categoryId, user.id);
          setQuestions(unpracticed.length > 0 ? unpracticed : [...subset]);
          setCurrentIndex(0);
          setScore(0);
          setStreak(0);
          setBestStreak(0);
          setCombo(1);
          setIsFinished(false);
          setAnsweredQuestions([]);
          sessionStartRef.current = Date.now();
        }}
        onGoHome={onHome}
        onGoIntermediate={() => onSwitchDifficulty("intermediate")}
        onGoEasy={() => onSwitchDifficulty("easy")}
        onSwitchCategory={onBack}
      />
      </>
    );
  }

  const diffLabel = difficulty === "easy" ? "Easy" : "Intermediate";

  return (
    <div className={`h-[100dvh] flex flex-col relative overflow-hidden ${isShaking ? "shake-animation" : ""}`}>
      {!showMilestone && !showFeedback && <StreakCelebration result={lastResult} onDismiss={acknowledgeResult} />}
      <FloatingOrbs />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 z-0" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-3 shrink-0">
        <button onClick={onBack} className="p-2 rounded-full bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          {/* Difficulty badge */}
          <span className={`text-xs font-display font-bold px-3 py-1 rounded-full backdrop-blur-sm ${difficulty === "easy"
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-orange-500/20 text-orange-700 dark:text-orange-300"
            }`}>
            {diffLabel}
          </span>
          <button onClick={toggleSound} className="p-2 rounded-full bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors">
            {soundOn ? <Volume2 className="w-4 h-4 text-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </button>
          {streak > 0 && (
            <motion.div
              key={streak}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-secondary/20 backdrop-blur-sm rounded-full px-3 py-1"
            >
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="font-display font-bold text-foreground">{streak}</span>
            </motion.div>
          )}
          <motion.div
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="bg-primary/90 backdrop-blur-sm rounded-full px-4 py-1"
          >
            <span className="font-display font-bold text-primary-foreground">{score} pts</span>
          </motion.div>
        </div>
      </div>

      {/* Milestone Progress Bar */}
      <div className="relative z-10 px-4 py-1 shrink-0">
        <div className="max-w-md mx-auto bg-card/70 backdrop-blur-md rounded-2xl p-3 border border-border/40 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1 font-display">
              <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              Milestone Progress
            </span>
            <span className="tabular-nums text-foreground font-bold">
              {progressCount} / 5
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${category.gradient}`}
              animate={{ width: `${(progressCount / 5) * 100}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 120 }}
            />
          </div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-3 pb-4 min-h-0">
        <div className="relative w-full max-w-lg h-full max-h-[70vh]">
          {!showLoginGate && currentIndex + 1 < questions.length && (
            <SwipeCard
              question={questions[currentIndex + 1]}
              category={category}
              onSwipe={() => { }}
              isTop={false}
            />
          )}
          <AnimatePresence mode="wait">
            {!showExplanation && !showMilestone && !showLoginGate && (
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0"
              >
                <SwipeCard
                  question={questions[currentIndex]}
                  category={category}
                  onSwipe={handleSwipe}
                  isTop={true}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {comboPopup && (
              <motion.div
                initial={{ scale: 0, y: 0 }}
                animate={{ scale: 1.2, y: -30 }}
                exit={{ scale: 0, y: -60, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
              >
                <span className="text-5xl font-display font-bold text-secondary drop-shadow-lg flex items-center gap-2">
                  {comboPopup}x <Zap className="w-10 h-10 text-orange-500 fill-orange-500" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-secondary z-50"
            />
          ))}

          <AnimatePresence>
            {showFeedback && !showExplanation && !showMilestone && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center gap-3 pointer-events-none"
              >
                {showFeedback === "correct" ? (
                  <>
                    <motion.div
                      animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="w-24 h-24 shrink-0 relative"
                    >
                      <div className="absolute inset-0 bg-primary rounded-[2rem] rounded-bl-xl shadow-2xl border-2 border-primary-foreground/20 overflow-hidden">
                        <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center gap-2">
                          <div className="w-2.5 h-3.5 bg-primary-foreground rounded-full animate-pulse" />
                          <div className="w-2.5 h-3.5 bg-primary-foreground rounded-full animate-pulse" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1 w-3 h-3 bg-orange-400 rotate-45 rounded-sm" />
                      </div>
                      <div className="absolute -top-1 left-1.5 w-3 h-5 bg-primary rounded-t-full -rotate-12 -z-10" />
                      <div className="absolute -top-1 right-1.5 w-3 h-5 bg-primary rounded-t-full rotate-12 -z-10" />
                    </motion.div>
                    <div className="bg-success/90 text-success-foreground border border-success/30 shadow-2xl shadow-success/20 backdrop-blur-md rounded-2xl px-6 py-3 font-display font-bold text-2xl text-center">
                      {feedbackMessage}
                    </div>
                  </>
                ) : (
                  <div className="bg-destructive/90 text-destructive-foreground border border-destructive/30 shadow-2xl shadow-destructive/20 backdrop-blur-md rounded-2xl px-6 py-3 font-display font-bold text-xl flex items-center gap-2">
                    <X className="w-6 h-6 stroke-[3]" />
                    {feedbackMessage}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong answer explanation */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center"
              >
                <div className="bg-card/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mx-4 border-2 border-destructive/30 max-w-sm w-full">
                  <div className="text-center flex flex-col items-center">
                    <XCircle className="w-12 h-12 text-destructive mb-3" />
                    <p className="font-display font-bold text-lg text-foreground mb-1">{feedbackMessage}</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      The answer is{" "}
                      <span className={`font-bold ${currentCorrectAnswer ? "text-success" : "text-destructive"}`}>
                        {currentCorrectAnswer ? "TRUE ✓" : "FALSE ✗"}
                      </span>
                    </p>
                    <div className="bg-muted rounded-xl p-4 mb-4 text-left">
                      <p className="text-sm text-foreground font-body leading-relaxed flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{currentExplanation}</span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1">
                      <RefreshCcw className="w-3 h-3" /> This question will come back later
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={dismissExplanation}
                      className={`w-full py-3 rounded-xl bg-gradient-to-r ${category.gradient} text-white font-display font-bold text-lg shadow-lg`}
                    >
                      Got it! →
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Milestone Completed Celebration Popup — every 5 questions */}
          <AnimatePresence>
            {showMilestone && (
              <MilestoneCelebration
                category={category}
                milestoneNumber={milestoneNumber}
                message={milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)]}
                onDismiss={dismissMilestone}
              />
            )}
          </AnimatePresence>

          {/* Login gate for guests */}
          <AnimatePresence>
            {showLoginGate && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center"
              >
                <div className="bg-card/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mx-4 border-2 border-primary/30 max-w-sm w-full">
                  <div className="text-center flex flex-col items-center">
                    <Lock className="w-12 h-12 text-primary mb-3" />
                    <h3 className="font-display font-bold text-2xl text-foreground mb-1">
                      Create a Free Account
                    </h3>
                    <p className="text-sm text-muted-foreground font-body mb-2">
                      You need an account to start practising.
                    </p>
                    <p className="text-xs text-muted-foreground font-body mb-5">
                      It saves your progress and streak, puts you on the leaderboard,
                      and lets you pick the skills built for you.
                    </p>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowLoginGate(false); setShowAuthModal(true); }}
                      className={`w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-display font-bold text-lg shadow-lg mb-3`}
                    >
                      Sign In / Sign Up
                    </motion.button>
                    <button
                      type="button"
                      onClick={onBack}
                      className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Back to skills
                    </button>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      It's free and takes 30 seconds
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Auth modal triggered from login gate */}
      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />

    </div>
  );
};

export default QuizGame;
