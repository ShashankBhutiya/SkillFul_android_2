import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkIn as checkInService,
  getStreak,
  grantFreezes as grantFreezesService,
  pullStreakFromDB,
  spendFreeze as spendFreezeService,
  subscribeToStreak,
  todayKey,
  type CheckInResult,
  type StreakState,
  EMPTY_STREAK,
} from "@/services/streakService";
import {
  scheduleLocalNotification,
  sendCrossPlatformNotification,
  NotificationTemplates,
} from "@/services/pushNotificationService";

/**
 * Module-level rather than a ref: the guard has to hold across every
 * useStreak() instance, since more than one component mounts the hook and
 * any of them may call recordMilestonePractice().
 */
let checkInFlight = false;

/**
 * Streak state for the current user, plus a `recordMilestonePractice` trigger.
 *
 * `recordMilestonePractice` is idempotent per local day, so callers can fire it freely
 * (after completing five answered scenarios) without double-counting.
 */
export function useStreak() {
  const { user } = useAuth();
  const userId = user?.id;

  const [streak, setStreak] = useState<StreakState>(() =>
    userId ? getStreak(userId) : EMPTY_STREAK
  );
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  // Keep every mounted useStreak() instance in step.
  useEffect(() => {
    if (!userId) return;
    return subscribeToStreak(() => setStreak(getStreak(userId)));
  }, [userId]);

  // Hydrate from the server when the user changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setStreak(getStreak(userId));
    pullStreakFromDB(userId).then(() => {
      // Practice may finish while hydration is pending; read the latest cache.
      if (!cancelled) setStreak(getStreak(userId));
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const recordMilestonePractice = useCallback(async () => {
    if (!userId || user?.isGuest || checkInFlight) return null;

    // Cheap guard: skip the async path entirely on repeat milestone practice.
    if (getStreak(userId).lastActiveDate === todayKey()) return null;

    checkInFlight = true;
    try {
      const result = await checkInService(userId);
      setStreak(result.state);
      if (result.isNewDay || result.freezesSpent > 0 || result.streakBroken) {
        setLastResult(result);
      }
      fireCheckInNotifications(result);
      return result;
    } finally {
      checkInFlight = false;
    }
  }, [userId, user?.isGuest]);

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
    recordMilestonePractice,
    spendFreeze,
    grantFreezes,
    acknowledgeResult,
    checkedInToday: streak.lastActiveDate === todayKey(),
  };
}

function fireCheckInNotifications(result: CheckInResult) {
  if (!result.isNewDay) return;

  // Milestone celebration — schedule for 3 seconds later so the in-app
  // celebration animation plays first, then the OS notification arrives
  // (visible if the user switches away).
  if (result.milestone) {
    scheduleLocalNotification(
      NotificationTemplates.streakMilestone(result.milestone),
      3000
    );
  }

  // Freeze earned — brief congratulation
  if (result.freezesEarned > 0) {
    sendCrossPlatformNotification(NotificationTemplates.freezeEarned());
  }

  // Freeze was spent to cover missed days — alert next morning
  if (result.freezesSpent > 0) {
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);
    const delay = tomorrowMorning.getTime() - Date.now();

    if (delay > 0) {
      scheduleLocalNotification(
        NotificationTemplates.freezeUsed(result.state.freezes),
        delay,
        8008
      );
    }
  }

  // Streak broke — schedule a comeback nudge for next morning
  if (result.streakBroken) {
    const nextMorning = new Date();
    nextMorning.setDate(nextMorning.getDate() + 1);
    nextMorning.setHours(10, 0, 0, 0);
    const delay = nextMorning.getTime() - Date.now();

    if (delay > 0) {
      scheduleLocalNotification(
        NotificationTemplates.streakBroken(),
        delay,
        8005
      );
    }
  }
}
