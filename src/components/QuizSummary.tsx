import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Category, Question } from "@/data/questions";
import { RotateCcw, ArrowLeft, Home, Zap, BookOpen, Clock, Brain, Trophy, Smartphone, Share, PlusSquare, ArrowUpRight, X } from "lucide-react";
import { CategoryIcon } from "@/lib/categoryIcons";
import FloatingOrbs from "./FloatingOrbs";
import type { AnsweredQuestion } from "./QuizGame";
import { usePwaInstallState } from "@/hooks/usePwaInstallState";
import { triggerPwaInstall } from "@/services/pwaInstallService";

interface QuizSummaryProps {
  category: Category;
  score: number;
  bestStreak: number;
  answeredQuestions: AnsweredQuestion[];
  totalSessionTimeSec: number;
  difficulty: "easy" | "intermediate";
  hasIntermediate: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onGoIntermediate: () => void;
  onGoEasy: () => void;
  onSwitchCategory: () => void;
}

function getTitle(pct: number): string {
  if (pct >= 95) return "Trivia Master";
  if (pct >= 80) return "Quiz Expert";
  if (pct >= 60) return "Sharp Mind";
  if (pct >= 40) return "Practitioner";
  if (pct >= 20) return "Apprentice";
  return "Novice";
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

const QuizSummary = ({
  category,
  score,
  bestStreak,
  answeredQuestions,
  totalSessionTimeSec,
  difficulty,
  hasIntermediate,
  onPlayAgain,
  onGoHome,
  onGoIntermediate,
  onGoEasy,
  onSwitchCategory,
}: QuizSummaryProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger notification prompt on quiz summary mount
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("trigger_notification_prompt"));
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  const { isInstallable, isIOSInstallable } = usePwaInstallState();
  const [showIosModal, setShowIosModal] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  const handleInstallClick = async () => {
    if (isIOSInstallable) {
      setShowIosModal(true);
      return;
    }
    const success = await triggerPwaInstall();
    if (success) {
      setPromoDismissed(true);
    }
  };
  const correctCount = answeredQuestions.filter((a) => a.correct).length;
  const wrongCount = answeredQuestions.filter((a) => !a.correct).length;
  const totalAnswered = answeredQuestions.length;
  const pct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const title = getTitle(pct);

  const wrongAnswers = answeredQuestions.filter((a) => !a.correct);
  const diffLabel = difficulty === "easy" ? "Easy" : "Intermediate";

  // Find the slowest question (max response time)
  const slowestEntry = answeredQuestions.length > 0
    ? answeredQuestions.reduce((prev, curr) => curr.responseTimeMs > prev.responseTimeMs ? curr : prev)
    : null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden p-4">
      <FloatingOrbs />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 z-0" />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex-1 flex flex-col items-center justify-start pt-8 max-w-md mx-auto w-full"
      >
        {/* Score Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className={`w-full rounded-3xl bg-gradient-to-br ${category.gradient} p-6 text-white shadow-2xl mb-6`}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-lg opacity-90 font-body flex items-center justify-center gap-1.5">
                <CategoryIcon categoryId={category.id} className="w-4 h-4 shrink-0" />
                <span>{category.name}</span>
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${difficulty === "easy" ? "bg-emerald-400/30" : "bg-orange-400/30"
                }`}>
                {diffLabel}
              </span>
            </div>
            <h2 className="text-3xl font-display font-bold mb-2">{title}</h2>
            <div className="text-6xl font-display font-bold mb-1">{score}</div>
            <p className="text-sm opacity-80">points</p>
          </div>

          <div className="flex justify-around mt-6 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-display font-bold">{correctCount}</div>
              <div className="text-xs opacity-70">Correct ✓</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold">{wrongCount}</div>
              <div className="text-xs opacity-70">Wrong ✗</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold">{pct}%</div>
              <div className="text-xs opacity-70">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold">🔥{bestStreak}</div>
              <div className="text-xs opacity-70">Best Streak</div>
            </div>
          </div>
        </motion.div>

        {/* Session Stats — total time + questions practiced */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full mb-6 bg-card/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border"
        >
          <h3 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Session Stats
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-muted rounded-xl p-3">
              <div className="text-2xl font-display font-bold text-foreground">⏱ {formatTime(totalSessionTimeSec)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <div className="text-2xl font-display font-bold text-foreground">{totalAnswered}</div>
              <div className="text-xs text-muted-foreground">Questions Practiced</div>
            </div>
          </div>
        </motion.div>

        {/* Slowest question */}
        {slowestEntry && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="w-full mb-6 bg-card/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border"
          >
            <h3 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-500" /> Trickiest Question
            </h3>
            <div className="bg-muted rounded-xl p-3">
              <p className="font-body text-sm font-semibold text-foreground mb-1">
                "{slowestEntry.question.statement}"
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  Response time: <span className="font-bold text-orange-500">{(slowestEntry.responseTimeMs / 1000).toFixed(1)}s</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${slowestEntry.correct
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                  }`}>
                  {slowestEntry.correct ? "Got it right ✓" : "Got it wrong ✗"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Answer: <span className={slowestEntry.question.answer ? "text-success font-bold" : "text-destructive font-bold"}>
                  {slowestEntry.question.answer ? "True" : "False"}
                </span> — {slowestEntry.question.explanation}
              </p>
            </div>
          </motion.div>
        )}

        {/* What you learned */}
        {wrongAnswers.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full mb-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-3">📖 What you learned</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {wrongAnswers.map(({ question }, i) => (
                <div key={i} className="bg-card/80 backdrop-blur-sm rounded-xl p-3 shadow-sm border">
                  <p className="font-body text-sm font-semibold text-foreground mb-1">{question.statement}</p>
                  <p className="text-xs text-muted-foreground">
                    Answer: <span className={question.answer ? "text-success font-bold" : "text-destructive font-bold"}>
                      {question.answer ? "True" : "False"}
                    </span> — {question.explanation}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PWA Promotion Card */}
        {(isInstallable || isIOSInstallable) && !promoDismissed && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full mb-6 relative overflow-hidden bg-gradient-to-br from-primary/10 via-card/90 to-accent/5 backdrop-blur-sm rounded-3xl p-5 border border-primary/20 shadow-xl"
          >
            {/* Dismiss button */}
            <button
              onClick={() => setPromoDismissed(true)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-colors cursor-pointer"
              aria-label="Dismiss promo"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4 items-start pr-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm">
                <Smartphone className="h-6 w-6 stroke-[1.8] animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  Keep Streaks Alive! ⚡
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                    {isIOSInstallable ? "iOS Safari" : "App Ready"}
                  </span>
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground font-body">
                  Install Skillful to your home screen! Get native practice notifications and run offline in standalone mode.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstallClick}
                className="flex-1 inline-flex justify-center items-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/15 cursor-pointer"
              >
                {isIOSInstallable ? "How to Install 📱" : "Install App ⚡"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setPromoDismissed(true)}
                className="flex-1 inline-flex justify-center items-center py-2.5 px-4 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 text-muted-foreground font-display font-bold text-xs transition-colors cursor-pointer"
              >
                Maybe Later
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="w-full space-y-3 pb-8"
        >
          {/* Replay same difficulty */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPlayAgain}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${category.gradient} text-white font-display font-bold text-lg shadow-lg flex items-center justify-center gap-2`}
          >
            <RotateCcw className="w-5 h-5" />
            Repeat {diffLabel}
          </motion.button>

          {difficulty === "easy" && hasIntermediate && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoIntermediate}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-display font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> Try Intermediate
            </motion.button>
          )}

          {difficulty === "intermediate" && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoEasy}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-display font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" /> Go to Easy
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSwitchCategory}
            className="w-full py-4 rounded-2xl bg-muted/80 backdrop-blur-sm text-foreground font-display font-bold text-lg flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Change Level
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoHome}
            className="w-full py-3 rounded-2xl bg-transparent border border-muted text-muted-foreground font-display font-bold text-base flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <Home className="w-4 h-4" /> Home
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/leaderboard")}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-display font-bold text-base flex items-center justify-center gap-2 hover:from-yellow-500/20 hover:to-amber-500/20 transition-colors"
          >
            <Trophy className="w-4 h-4" /> View Leaderboard
          </motion.button>
        </motion.div>
      </motion.div>

      {/* iOS Step-by-Step Guidance Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-sm overflow-hidden bg-card/95 border border-border/60 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl text-foreground relative font-body"
            >
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm mb-3">
                  <Smartphone className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h3 className="font-display font-extrabold text-lg tracking-tight">Install on iOS Safari</h3>
                <p className="text-xs text-muted-foreground mt-1">Add Skillful to your Home Screen in 3 simple steps:</p>
              </div>

              <div className="space-y-4 text-xs text-muted-foreground font-body">
                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Open Safari's Share Menu</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap the **Share** button <Share className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> located at the bottom of Safari.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Add to Home Screen</p>
                    <p className="text-[11px] leading-relaxed">
                      Scroll down in the sharing options menu and select **Add to Home Screen** <PlusSquare className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" />.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Confirm Installation</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap **Add** in the top-right corner <ArrowUpRight className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> to place the app on your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowIosModal(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                Got It, Thanks!
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizSummary;
