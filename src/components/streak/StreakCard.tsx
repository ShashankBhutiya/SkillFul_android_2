import { motion } from "framer-motion";
import { Snowflake } from "lucide-react";
import StreakFlame from "./StreakFlame";
import { STREAK_FLAME_ANIMATION } from "@/config/streakAnimation";
import {
  DAYS_PER_EARNED_FREEZE,
  MAX_FREEZES,
  dateKeyOffset,
  fromDateKey,
  todayKey,
  type StreakState,
} from "@/services/streakService";

interface StreakCardProps {
  streak: StreakState;
  checkedInToday: boolean;
  className?: string;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Streak detail widget: current count, the last seven days, and the
 * banked freezes.
 */
export const StreakCard = ({ streak, checkedInToday, className = "" }: StreakCardProps) => {
  const activeDates = new Set(streak.history);
  const frozenDates = new Set(streak.freezesUsed);
  const today = todayKey();

  // Last 7 days, oldest first.
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = dateKeyOffset(i - 6);
    return {
      key,
      label: DAY_INITIALS[fromDateKey(key).getDay()],
      isToday: key === today,
      isActive: activeDates.has(key),
      isFrozen: frozenDates.has(key),
    };
  });

  // Drives the flame's core brightness — saturates at a 30-day streak.
  const intensity = Math.min(streak.current / 30, 1);

  const daysToNextFreeze =
    streak.freezes >= MAX_FREEZES
      ? null
      : DAYS_PER_EARNED_FREEZE - (streak.current % DAYS_PER_EARNED_FREEZE);

  return (
    <div className={`surface p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Count */}
        <div className="flex items-center gap-3.5">
          <StreakFlame
            size={40}
            active={checkedInToday}
            intensity={intensity}
            animation={STREAK_FLAME_ANIMATION}
          />
          <div>
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={streak.current}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="font-display text-3xl font-semibold leading-none tabular-nums text-foreground"
              >
                {streak.current}
              </motion.span>
              <span className="text-sm text-muted-foreground">
                day{streak.current === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {checkedInToday
                ? streak.current >= streak.longest && streak.current > 0
                  ? "Your best streak yet"
                  : `Best: ${streak.longest} days`
                : "Practise today to keep it alive"}
            </p>
          </div>
        </div>

        {/* Freeze counter */}
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1">
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <Snowflake
                key={i}
                className={`h-4 w-4 ${
                  i < streak.freezes ? "text-sky-500" : "text-muted-foreground/25"
                }`}
                strokeWidth={2}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {streak.freezes} freeze{streak.freezes === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Week strip */}
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {week.map((day, i) => (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i, duration: 0.25 }}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="text-[10px] font-medium text-muted-foreground">{day.label}</span>
            <div
              className={`flex h-8 w-full items-center justify-center rounded-md border text-[11px] font-semibold transition-colors ${
                day.isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : day.isFrozen
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-600"
                    : day.isToday
                      ? "border-dashed border-foreground/30 bg-transparent text-muted-foreground"
                      : "border-border bg-muted/40 text-muted-foreground/50"
              }`}
              title={
                day.isActive
                  ? "Practised"
                  : day.isFrozen
                    ? "Covered by a streak freeze"
                    : day.isToday
                      ? "Today — not practised yet"
                      : "Missed"
              }
            >
              {day.isFrozen ? <Snowflake className="h-3.5 w-3.5" /> : day.isActive ? "✓" : ""}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Next-freeze hint */}
      {daysToNextFreeze !== null && streak.current > 0 && (
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {daysToNextFreeze} more day{daysToNextFreeze === 1 ? "" : "s"} to earn another freeze.
          Freezes are spent automatically to cover days you miss.
        </p>
      )}
    </div>
  );
};

export default StreakCard;
