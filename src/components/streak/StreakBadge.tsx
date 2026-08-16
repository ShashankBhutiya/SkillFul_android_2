import { motion } from "framer-motion";
import StreakFlame from "./StreakFlame";
import { STREAK_FLAME_ANIMATION } from "@/config/streakAnimation";
import type { StreakState } from "@/services/streakService";

interface StreakBadgeProps {
  streak: StreakState;
  checkedInToday: boolean;
  onClick?: () => void;
}

/**
 * Compact streak indicator for the app header.
 *
 * Hidden entirely at zero so a new user isn't greeted by an empty counter.
 */
export const StreakBadge = ({ streak, checkedInToday, onClick }: StreakBadgeProps) => {
  if (streak.current <= 0) return null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"
      aria-label={`${streak.current} day streak`}
    >
      <StreakFlame
        size={18}
        active={checkedInToday}
        intensity={Math.min(streak.current / 30, 1)}
        animation={STREAK_FLAME_ANIMATION}
      />
      <span
        className={`font-display text-sm font-semibold tabular-nums ${
          checkedInToday ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {streak.current}
      </span>
    </motion.button>
  );
};

export default StreakBadge;
