export interface SavedGenerationStreak {
  current_streak: number;
  last_active_date: string | null;
  freezes: number;
}

/** Matches the app's freeze-preserved streak; evaluate saved local dates in IST. */
export function generationDailyLimit(
  configuredBase: string | undefined,
  streak: SavedGenerationStreak | null,
  now = new Date(),
): number {
  const configured = Number(configuredBase ?? 100);
  const base = Number.isInteger(configured) && configured >= 100 && configured <= 1000 ? configured : 100;
  if (!streak || !Number.isInteger(streak.current_streak) || streak.current_streak < 1 || !streak.last_active_date) return base;

  const today = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const last = Date.parse(`${streak.last_active_date}T00:00:00Z`);
  const gap = (Date.parse(`${today}T00:00:00Z`) - last) / 86_400_000;
  const freezes = Number.isInteger(streak.freezes) ? Math.min(3, Math.max(0, streak.freezes)) : 0;
  if (!Number.isInteger(gap) || gap < 0 || gap > freezes + 1) return base;

  const bonus = streak.current_streak * 10;
  return Math.min(1000, base + bonus);
}

