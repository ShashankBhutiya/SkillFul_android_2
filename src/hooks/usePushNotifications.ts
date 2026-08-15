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
import { getNotificationSettings, getDailyStreak } from "@/services/notificationService";

export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const init = async () => {
      initialized.current = true;

      if (isNativePlatform()) {
        // 1. Init local notifications first — always works without Firebase
        const localReady = await initLocalNotifications();

        if (localReady) {
          const settings = getNotificationSettings();

          // 2. Schedule daily reminder
          if (settings.remindersEnabled) {
            const [hours, mins] = settings.reminderTime.split(":").map(Number);
            await scheduleDailyReminder(hours, mins);
          }

          // 3. Schedule streak protection
          scheduleStreakProtection();

          // 4. Schedule inactivity nudge
          scheduleInactivityNudge();
        }

        // 5. Try FCM push registration (fails gracefully without Firebase)
        await initPushNotifications(user.id);
      } else {
        // Web: init push (will request permission)
        await initPushNotifications(user.id);
      }
    };

    // Delay init slightly to let the app settle
    const timer = setTimeout(init, 2000);

    return () => {
      clearTimeout(timer);
    };
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
    return () => {
      window.removeEventListener("skillful_settings_changed", handleSettingsChange);
    };
  }, []);
}

function scheduleStreakProtection() {
  const streak = getDailyStreak();
  if (streak.currentStreak < 2 || !streak.lastPracticeDate) return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (streak.lastPracticeDate === today) {
    // Already practiced today — remind tomorrow evening
    const tomorrow8pm = new Date();
    tomorrow8pm.setDate(tomorrow8pm.getDate() + 1);
    tomorrow8pm.setHours(20, 0, 0, 0);
    const delay = tomorrow8pm.getTime() - now.getTime();

    if (delay > 0) {
      scheduleLocalNotification(
        NotificationTemplates.streakReminder(streak.currentStreak),
        delay,
        8001
      );
    }
    return;
  }

  // Haven't practiced today yet — check if streak is still alive
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (streak.lastPracticeDate !== yesterdayStr) return; // streak already broken

  // Streak is at risk — remind tonight
  const tonight8pm = new Date();
  tonight8pm.setHours(20, 0, 0, 0);
  const delay = tonight8pm.getTime() - now.getTime();

  if (delay > 0) {
    scheduleLocalNotification(
      NotificationTemplates.streakReminder(streak.currentStreak),
      delay,
      8001
    );
  }
}

function scheduleInactivityNudge() {
  if (!isNativePlatform()) return;

  localStorage.setItem("skillful_last_activity", String(Date.now()));

  // Remind user after 24 hours of no activity
  const INACTIVITY_MS = 24 * 60 * 60 * 1000;
  scheduleLocalNotification(
    NotificationTemplates.inactivityNudge(24),
    INACTIVITY_MS,
    8002
  );
}

export default usePushNotifications;
