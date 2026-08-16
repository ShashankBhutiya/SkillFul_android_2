import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Snowflake } from "lucide-react";
import StreakFlame from "./StreakFlame";
import { STREAK_CELEBRATION_ANIMATION } from "@/config/streakAnimation";
import { hapticCelebration, hapticSuccess } from "@/hooks/useHaptics";
import type { CheckInResult } from "@/services/streakService";

interface StreakCelebrationProps {
  /** The check-in to celebrate, or null when there's nothing to show. */
  result: CheckInResult | null;
  onDismiss: () => void;
}

/** Radial burst of sparks behind the flame. */
const Sparks = ({ count = 12 }: { count?: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i;
      const distance = 70 + (i % 3) * 18;
      return (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-amber-400"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((angle * Math.PI) / 180) * distance,
            y: Math.sin((angle * Math.PI) / 180) * distance,
            scale: [0, 1.1, 0],
          }}
          transition={{ duration: 1.1, delay: 0.12 + (i % 4) * 0.05, ease: "easeOut" }}
        />
      );
    })}
  </>
);

/**
 * Full-screen overlay shown when the streak advances.
 *
 * Auto-dismisses so it never blocks the app; tapping anywhere closes it early.
 */
export const StreakCelebration = ({ result, onDismiss }: StreakCelebrationProps) => {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const isMilestone = Boolean(result?.milestone);

  useEffect(() => {
    if (!result) return;

    setVisible(true);
    if (isMilestone) {
      hapticCelebration();
    } else {
      hapticSuccess();
    }

    // Milestones linger a little longer than an ordinary day.
    const timer = setTimeout(() => setVisible(false), isMilestone ? 3600 : 2400);
    return () => clearTimeout(timer);
  }, [result, isMilestone]);

  if (!result) return null;

  const { state, milestone, freezesEarned, freezesSpent } = result;

  const headline = milestone
    ? `${milestone}-day streak!`
    : `Day ${state.current}`;

  const subline = milestone
    ? "A new milestone. Keep it going."
    : freezesSpent > 0
      ? `${freezesSpent} freeze${freezesSpent === 1 ? "" : "s"} kept your streak alive.`
      : "Streak extended.";

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.9, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="surface relative flex w-full max-w-[300px] flex-col items-center px-7 py-8 text-center"
          >
            {/* Flame + sparks */}
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
              {!reduceMotion && <Sparks count={isMilestone ? 16 : 10} />}
              <motion.div
                initial={{ scale: 0.4, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.08 }}
              >
                <StreakFlame
                  size={isMilestone ? 84 : 68}
                  intensity={Math.min(state.current / 30, 1)}
                  animation={STREAK_CELEBRATION_ANIMATION}
                />
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl font-semibold tracking-tight text-foreground"
            >
              {headline}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.27 }}
              className="mt-1.5 text-sm text-muted-foreground"
            >
              {subline}
            </motion.p>

            {freezesEarned > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 380, damping: 22 }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600"
              >
                <Snowflake className="h-3.5 w-3.5" />+{freezesEarned} streak freeze earned
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakCelebration;
