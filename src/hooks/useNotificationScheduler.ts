import { useEffect, useRef } from "react";
import {
  getNotificationSettings,
  sendDesktopNotification,
  addNotification,
  isInQuietHours,
} from "@/services/notificationService";
import {
  isNativePlatform,
  sendCrossPlatformNotification,
  NotificationTemplates,
  scheduleLocalNotification,
} from "@/services/pushNotificationService";

const MASCOT_TIPS = [
  "Did you know? Reviewing 2 rapid scenarios a day boosts your corporate instinct by 40% over a month! 🧠",
  "Mascot Tip: When negotiating salary, always state a precise number instead of a range. It shows deep research! 💸",
  "Mascot Tip: Set healthy boundaries early in relationships. It builds a foundation of respect! ❤️",
  "Instinct Check: Taking 5 seconds to pause and breathe before responding to an angry email prevents office conflicts! 🧘",
  "Daily Habit: Mastery isn't about long courses. It's about swiping 5 cards a day consistently! 🏆",
  "Mascot Tip: In interviews, use the STAR method — Situation, Task, Action, Result — to structure your answers! ⭐",
  "Financial Tip: The 50/30/20 rule — 50% needs, 30% wants, 20% savings — is the simplest budget that actually works! 💰",
  "Leadership Tip: Great leaders ask 'What do you think?' before sharing their own opinion. It builds trust! 👥",
];

export function useNotificationScheduler() {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      const settings = getNotificationSettings();

      if (document.visibilityState === "hidden") {
        const pushEnabled = isNativePlatform()
          ? settings.nativePushEnabled
          : settings.browserNotificationsEnabled;

        if (settings.remindersEnabled && pushEnabled) {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

          idleTimerRef.current = setTimeout(() => {
            if (isInQuietHours()) return;

            if (isNativePlatform()) {
              scheduleLocalNotification(
                NotificationTemplates.inactivityNudge(1),
                0,
                7001
              );
            } else {
              sendCrossPlatformNotification({
                title: "Your Companion is waiting! 🦉",
                body: "Don't leave your skills hanging! Spend 1 minute swiping scenarios.",
                type: "inactivity",
                actionUrl: "/skills",
                actionLabel: "Keep Practicing",
              });
            }
          }, 60000);
        }
      } else {
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        localStorage.setItem("skillful_last_activity", String(Date.now()));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const settings = getNotificationSettings();
    if (settings.mascotTipsEnabled) {
      initialTipTimerRef.current = setTimeout(() => {
        const randomTip = MASCOT_TIPS[Math.floor(Math.random() * MASCOT_TIPS.length)];

        if (isNativePlatform()) {
          sendCrossPlatformNotification(NotificationTemplates.mascotTip(randomTip));
        } else {
          addNotification(
            "Companion Tip from Skillful! 🦉",
            randomTip,
            "tip",
            "/skills",
            "Try a Scenario"
          );
        }
      }, 30000);
    }

    // Daily practice reminder checker (web only — native uses scheduled local notifications)
    let dailyReminderInterval: ReturnType<typeof setInterval> | undefined;

    if (!isNativePlatform()) {
      const checkDailyReminder = () => {
        const currentSettings = getNotificationSettings();
        if (!currentSettings.remindersEnabled || !currentSettings.browserNotificationsEnabled) return;
        if (isInQuietHours()) return;

        const today = new Date().toISOString().split("T")[0];
        const lastSentDate = localStorage.getItem("skillful_last_daily_reminder_date");
        if (lastSentDate === today) return;

        const [prefHours, prefMins] = currentSettings.reminderTime.split(":").map(Number);
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        if (currentHours > prefHours || (currentHours === prefHours && currentMinutes >= prefMins)) {
          sendCrossPlatformNotification(NotificationTemplates.dailyReminder());
          localStorage.setItem("skillful_last_daily_reminder_date", today);
        }
      };

      checkDailyReminder();
      dailyReminderInterval = setInterval(checkDailyReminder, 15000);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (initialTipTimerRef.current) clearTimeout(initialTipTimerRef.current);
      if (dailyReminderInterval) clearInterval(dailyReminderInterval);
    };
  }, []);
}

export default useNotificationScheduler;
