import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import StreakFlame from "./StreakFlame";
import StreakCard from "./StreakCard";
import type { StreakState } from "@/services/streakService";

export default function StreakDetails({
  streak,
  checkedInToday,
  compact = false,
}: {
  streak: StreakState;
  checkedInToday: boolean;
  /** Fits the full streak summary into the app viewport. */
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user">
      <div className={`mx-auto w-full max-w-md text-center ${compact ? "streak-details-compact" : ""}`}>
        <motion.div
          initial={reduceMotion ? false : { scale: 0.5, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="streak-flame-hero relative mx-auto mb-5 flex h-36 w-36 items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-amber-400/15 blur-2xl" />
          <StreakFlame size={compact ? 76 : 112} active={streak.current > 0} intensity={Math.min(streak.current / 30, 1)} />
        </motion.div>
        <p className="font-display text-5xl font-bold tabular-nums text-foreground">{streak.current}</p>
        <p className="mt-2 text-lg font-semibold text-foreground">day{streak.current === 1 ? "" : "s"} in your streak</p>
        <p className="streak-summary mx-auto mb-7 mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {checkedInToday ? "Today's practice is complete. Come back tomorrow to keep your streak growing."
            : streak.current > 0 ? "Keep your momentum. Answer one question today to extend your streak."
            : "A little practice goes a long way. Answer one question to start your streak."}
        </p>
        <StreakCard streak={streak} checkedInToday={checkedInToday} className="text-left" />
        <p className="streak-detail-note mt-5 text-xs leading-relaxed text-muted-foreground">AI questions and classic practice both count. Every answer helps you learn, even when you get it wrong.</p>
      </div>
    </MotionConfig>
  );
}
