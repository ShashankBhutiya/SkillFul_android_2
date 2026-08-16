import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkIn as checkInService,
  getStreak,
  grantFreezes as grantFreezesService,
  pullStreakFromDB,
  spendFreeze as spendFreezeService,
  todayKey,
  type CheckInResult,
  type StreakState,
  EMPTY_STREAK,
} from "@/services/streakService";

/**
 * Streak state for the current user, plus a `recordVisit` trigger.
 *
 * `recordVisit` is idempotent per local day, so callers can fire it freely
 * (on mount, after a quiz, on resume) without double-counting.
 */
export function useStreak() {
  const { user } = useAuth();
  const userId = user?.id;

  const [streak, setStreak] = useState<StreakState>(() =>
    userId ? getStreak(userId) : EMPTY_STREAK
  );
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  // Guards a duplicate check-in while the first await is still in flight.
  const inFlight = useRef(false);

  // Hydrate from the server when the user changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setStreak(getStreak(userId));
    pullStreakFromDB(userId).then((next) => {
      if (!cancelled) setStreak(next);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const recordVisit = useCallback(async () => {
    if (!userId || inFlight.current) return null;

    // Cheap guard: skip the async path entirely on repeat visits.
    if (getStreak(userId).lastActiveDate === todayKey()) return null;

    inFlight.current = true;
    try {
      const result = await checkInService(userId);
      setStreak(result.state);
      if (result.isNewDay || result.freezesSpent > 0 || result.streakBroken) {
        setLastResult(result);
      }
      return result;
    } finally {
      inFlight.current = false;
    }
  }, [userId]);

  const spendFreeze = useCallback(async () => {
    if (!userId) return;
    setStreak(await spendFreezeService(userId));
  }, [userId]);

  const grantFreezes = useCallback(
    async (count: number) => {
      if (!userId) return;
      setStreak(await grantFreezesService(userId, count));
    },
    [userId]
  );

  /** Clear the pending celebration once the UI has shown it. */
  const acknowledgeResult = useCallback(() => setLastResult(null), []);

  // Re-project when the app returns to the foreground: a session left open
  // overnight should roll the streak over without needing a reload.
  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      if (document.visibilityState === "visible") setStreak(getStreak(userId));
    };

    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [userId]);

  return {
    streak,
    lastResult,
    recordVisit,
    spendFreeze,
    grantFreezes,
    acknowledgeResult,
    checkedInToday: streak.lastActiveDate === todayKey(),
  };
}
