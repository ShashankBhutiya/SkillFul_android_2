import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  initPushNotifications,
  initLocalNotifications,
  isNativePlatform,
  scheduleDailyReminder,
  scheduleLocalNotification,
  NotificationTemplates,
  cancelAllLocalNotifications,
} from "@/services/pushNotificationService";
import { getNotificationSettings, isInQuietHours } from "@/services/notificationService";
import { getStreak, subscribeToStreak, todayKey, type StreakState } from "@/services/streakService";

// ─── Notification ID map ────────────────────────────────────────────
// 9001       — daily practice reminder (repeating)
// 8001       — evening "streak at risk" warning
// 8002       — 24h inactivity nudge
// 8003       — morning motivation (haven't practiced yet today)
// 8004       — afternoon follow-up
// 8005       — streak broken comeback (next day 10am)
// 8006       — 48h win-back
// 8007       — 3-day win-back
// 8008       — streak freeze used alert (next morning)
// 7001       — idle nudge (from useNotificationScheduler)

export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const init = async () => {
      initialized.current = true;

      if (isNativePlatform()) {
        const localReady = await initLocalNotifications();

        if (localReady) {
          const settings = getNotificationSettings();

          if (settings.remindersEnabled) {
            const [hours, mins] = settings.reminderTime.split(":").map(Number);
            await scheduleDailyReminder(hours, mins);
          }

          scheduleStreakNotifications(user.id);
        }

        await initPushNotifications(user.id);
      } else {
        await initPushNotifications(user.id);
      }
    };

    const timer = setTimeout(init, 2000);
    return () => clearTimeout(timer);
  }, [user.id]);

  // Re-schedule when settings change
  useEffect(() => {
    const handleSettingsChange = async () => {
      if (!isNativePlatform()) return;

      const settings = getNotificationSettings();
      if (settings.remindersEnabled) {
        const [hours, mins] = settings.reminderTime.split(":").map(Number);
        await scheduleDailyReminder(hours, mins);
      } else {
        await cancelAllLocalNotifications();
      }
    };

    window.addEventListener("skillful_settings_changed", handleSettingsChange);
    return () => window.removeEventListener("skillful_settings_changed", handleSettingsChange);
  }, []);

  // Re-schedule notifications when the app returns to the foreground or after
  // a streak check-in. This cancels stale reminders (e.g. "haven't practiced"
  // alerts that are no longer true) and sets fresh ones based on current state.
  useEffect(() => {
    const reschedule = () => {
      if (document.visibilityState === "visible") {
        scheduleStreakNotifications(user.id);
      }
    };

    document.addEventListener("visibilitychange", reschedule);
    const unsubscribe = subscribeToStreak(reschedule);
    return () => {
      document.removeEventListener("visibilitychange", reschedule);
      unsubscribe();
    };
  }, [user.id]);
}

// ─── Streak-Aware Notification Scheduling ───────────────────────────

function scheduleStreakNotifications(userId: string) {
  if (!isNativePlatform()) return;

  const settings = getNotificationSettings();
  if (!settings.streakAlertsEnabled) return;

  const streak = getStreak(userId);
  const now = new Date();
  const practicedToday = streak.lastActiveDate === todayKey();

  if (practicedToday) {
    scheduleAfterPractice(streak, now);
  } else if (streak.current > 0 && streak.lastActiveDate) {
    scheduleStreakAtRisk(streak, now);
  } else {
    scheduleComeback(streak, now);
  }

  scheduleInactivityChain(now);
}

/**
 * User already practiced today — schedule tomorrow's motivation cascade.
 * Cancel any "haven't practiced" alerts that are now stale.
 */
function scheduleAfterPractice(streak: StreakState, now: Date) {
  cancelStaleReminders();

  const tomorrowMorning = nextTimeSlot(now, 9, 0, 1);
  const msToMorning = tomorrowMorning.getTime() - now.getTime();

  if (msToMorning > 0 && streak.current >= 1) {
    const messages = MORNING_MESSAGES;
    const msg = messages[streak.current % messages.length];

    scheduleLocalNotification(
      {
        title: msg.title(streak.current + 1),
        body: msg.body,
        type: "streak",
        actionUrl: "/skills",
        actionLabel: "Continue Streak",
      },
      msToMorning,
      8003
    );
  }

  // Schedule tomorrow's afternoon follow-up
  const tomorrowAfternoon = nextTimeSlot(now, 14, 30, 1);
  const msToAfternoon = tomorrowAfternoon.getTime() - now.getTime();

  if (msToAfternoon > 0 && streak.current >= 2) {
    scheduleLocalNotification(
      NotificationTemplates.streakReminder(streak.current),
      msToAfternoon,
      8004
    );
  }

  // Schedule tomorrow's evening last-chance warning
  const tomorrowEvening = nextTimeSlot(now, 20, 0, 1);
  const msToEvening = tomorrowEvening.getTime() - now.getTime();

  if (msToEvening > 0 && streak.current >= 2) {
    scheduleLocalNotification(
      {
        title: `Last chance to save your ${streak.current + 1}-day streak!`,
        body: "Your streak resets at midnight. A quick 2-minute session is all it takes.",
        type: "streak",
        actionUrl: "/skills",
        actionLabel: "Save Streak",
      },
      msToEvening,
      8001
    );
  }
}

/**
 * User has an active streak but hasn't practiced today yet.
 * Schedule escalating reminders for TODAY.
 */
function scheduleStreakAtRisk(streak: StreakState, now: Date) {
  const currentHour = now.getHours();

  // Morning: gentle motivation (if it's still morning)
  if (currentHour < 9) {
    const morning = nextTimeSlot(now, 9, 0, 0);
    const ms = morning.getTime() - now.getTime();
    if (ms > 0) {
      scheduleLocalNotification(
        {
          title: `Day ${streak.current + 1} awaits!`,
          body: "Start your day strong — a quick swipe session keeps your streak alive.",
          type: "streak",
          actionUrl: "/skills",
          actionLabel: "Start Now",
        },
        ms,
        8003
      );
    }
  }

  // Afternoon: friendly nudge (if before 3pm)
  if (currentHour < 15) {
    const afternoon = nextTimeSlot(now, 14, 30, 0);
    const ms = afternoon.getTime() - now.getTime();
    if (ms > 0) {
      scheduleLocalNotification(
        {
          title: `Your ${streak.current}-day streak is counting on you`,
          body: streak.freezes > 0
            ? `You have ${streak.freezes} streak freeze${streak.freezes > 1 ? "s" : ""}, but why use one? 2 minutes is all it takes.`
            : "No freezes left — don't let it slip. 2 minutes is all you need.",
          type: "streak",
          actionUrl: "/skills",
          actionLabel: "Practice Now",
        },
        ms,
        8004
      );
    }
  }

  // Evening: urgent last-chance (if before 8pm)
  if (currentHour < 20) {
    const evening = nextTimeSlot(now, 20, 0, 0);
    const ms = evening.getTime() - now.getTime();
    if (ms > 0) {
      scheduleLocalNotification(
        {
          title: `${streak.current}-day streak ending tonight!`,
          body: streak.freezes > 0
            ? `Quick — swipe a few scenarios before midnight, or a freeze kicks in automatically.`
            : `Your streak resets at midnight and you have no freezes. Don't lose ${streak.current} days of progress!`,
          type: "streak",
          actionUrl: "/skills",
          actionLabel: "Save Streak Now",
        },
        ms,
        8001
      );
    }
  }
}

/**
 * Streak is at 0 — user either never started or it broke.
 * Send encouraging comeback notifications.
 */
function scheduleComeback(streak: StreakState, now: Date) {
  if (!streak.lastActiveDate) return;

  // Next morning: "start fresh" message
  const nextMorning = nextTimeSlot(now, 10, 0, 1);
  const ms = nextMorning.getTime() - now.getTime();
  if (ms > 0) {
    const bestEver = streak.longest;
    scheduleLocalNotification(
      {
        title: "Fresh start today!",
        body: bestEver > 3
          ? `You've hit ${bestEver} days before — you can do it again. Start a new streak now.`
          : "Every expert was once a beginner. Start your streak today — just one session.",
        type: "streak",
        actionUrl: "/skills",
        actionLabel: "Start New Streak",
      },
      ms,
      8005
    );
  }
}

/**
 * Escalating inactivity chain: 24h → 48h → 72h.
 * Each one is cancelled if the user returns before it fires.
 */
function scheduleInactivityChain(now: Date) {
  const H24 = 24 * 60 * 60 * 1000;
  const H48 = 48 * 60 * 60 * 1000;
  const H72 = 72 * 60 * 60 * 1000;

  localStorage.setItem("skillful_last_activity", String(now.getTime()));

  scheduleLocalNotification(
    NotificationTemplates.inactivityNudge(24),
    H24,
    8002
  );

  scheduleLocalNotification(
    {
      title: "2 days without practice",
      body: "Skills fade fast without practice. Jump back in — it only takes 2 minutes to get sharp again.",
      type: "inactivity",
      actionUrl: "/skills",
      actionLabel: "Quick Refresh",
    },
    H48,
    8006
  );

  scheduleLocalNotification(
    {
      title: "Your skills miss you!",
      body: "It's been 3 days. The longer you wait, the harder it feels to start. One quick session breaks the ice.",
      type: "inactivity",
      actionUrl: "/skills",
      actionLabel: "Come Back",
    },
    H72,
    8007
  );
}

/** Cancel streak-at-risk and morning reminders that are no longer relevant. */
async function cancelStaleReminders() {
  if (!isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();

    const staleIds = [8001, 8003, 8004, 8005];
    const toCancel = pending.notifications.filter((n) => staleIds.includes(n.id));

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (err) {
    console.warn("Failed to cancel stale reminders:", err);
  }
}

// ─── Motivational Message Rotation ──────────────────────────────────

const MORNING_MESSAGES = [
  {
    title: (day: number) => `Day ${day} — let's go!`,
    body: "A 2-minute swipe session is all it takes to keep your streak alive.",
  },
  {
    title: (day: number) => `${day} days strong — keep building!`,
    body: "You're building real-world judgment, one scenario at a time.",
  },
  {
    title: (day: number) => `Day ${day} starts now`,
    body: "The best time to practice is when you're fresh. Quick round before the day gets busy?",
  },
  {
    title: (day: number) => `Your ${day}-day streak is waiting`,
    body: "Consistency beats intensity. Open up and swipe through a few scenarios.",
  },
  {
    title: (_day: number) => `Good morning, champion!`,
    body: "Start your day with sharper instincts. A quick practice session sets the tone.",
  },
  {
    title: (day: number) => `${day} days — that's discipline!`,
    body: "Most people quit by day 3. You're proving you're different.",
  },
  {
    title: (day: number) => `Streak check: Day ${day}`,
    body: "Your future self will thank you. 2 minutes now, better decisions later.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build a Date for the next occurrence of hour:minute, optionally offset
 * by `daysAhead` full days. If daysAhead is 0 and the time already passed
 * today, pushes to tomorrow.
 */
function nextTimeSlot(from: Date, hour: number, minute: number, daysAhead: number): Date {
  const target = new Date(from);
  target.setDate(target.getDate() + daysAhead);
  target.setHours(hour, minute, 0, 0);

  if (daysAhead === 0 && target <= from) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

export default usePushNotifications;
