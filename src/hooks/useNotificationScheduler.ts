import { useEffect, useRef } from "react";
import {
  getNotificationSettings,
  isInQuietHours,
} from "@/services/notificationService";
import {
  isNativePlatform,
  sendCrossPlatformNotification,
  NotificationTemplates,
  scheduleLocalNotification,
} from "@/services/pushNotificationService";

export function useNotificationScheduler() {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (dailyReminderInterval) clearInterval(dailyReminderInterval);
    };
  }, []);
}

export default useNotificationScheduler;
