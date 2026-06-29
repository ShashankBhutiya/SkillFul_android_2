import { useEffect, useRef } from "react";
import {
  getNotificationSettings,
  sendDesktopNotification,
  addNotification,
} from "@/services/notificationService";

// Some high-quality curated tips from the Mascot "Skillful"
const MASCOT_TIPS = [
  "Did you know? Reviewing 2 rapid scenarios a day boosts your corporate instinct by 40% over a month! 🧠",
  "Mascot Tip: When negotiating salary, always state a precise number instead of a range. It shows deep research! 💸",
  "Mascot Tip: Set healthy boundaries early in relationships. It builds a foundation of respect! ❤️",
  "Instinct Check: Taking 5 seconds to pause and breathe before responding to an angry email prevents office conflicts! 🧘",
  "Daily Habit: Mastery isn't about long courses. It's about swiping 5 cards a day consistently! 🏆",
];

export function useNotificationScheduler() {
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialTipTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // --- Background / Idle Reminder Scheduler ---
    const handleVisibilityChange = () => {
      const settings = getNotificationSettings();

      if (document.visibilityState === "hidden") {
        // User left the tab/minimized. Schedule an idle reminder if reminders & push are enabled.
        if (settings.remindersEnabled && settings.browserNotificationsEnabled) {
          // Clear any existing timer
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

          // For testing and visibility, we schedule it for 60 seconds (1 minute) of background time.
          // In real application this might be daily/hours, but 60 seconds is perfect to demonstrate it!
          idleTimerRef.current = setTimeout(() => {
            const title = "Your Companion is waiting! 🦉";
            const body = "Don't leave your skills hanging! Spend 1 minute swiping scenarios and keep your mind active.";
            
            sendDesktopNotification(title, body, "/skills");
            
            // Also append to in-app notification feed so it's visible there
            addNotification(
              title,
              "We noticed you were away. Master career, dating, and money one rapid scenario at a time!",
              "challenge",
              "/skills",
              "Keep Practicing"
            );
          }, 60000); // 1 minute
        }
      } else {
        // User returned to the tab. Clear background reminder timer.
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // --- Dynamic In-App Tips Seeder ---
    // Wait 30 seconds after the app mounts, then send a premium companion tip notification
    // to showcase the active, living nature of the notification center!
    const settings = getNotificationSettings();
    if (settings.mascotTipsEnabled) {
      initialTipTimerRef.current = setTimeout(() => {
        const randomTip = MASCOT_TIPS[Math.floor(Math.random() * MASCOT_TIPS.length)];
        addNotification(
          "Companion Tip from Skillful! 🦉",
          randomTip,
          "tip",
          "/skills",
          "Try a Scenario"
        );
      }, 30000); // 30 seconds
    }

    // --- Preferred Daily Practice Reminder Scheduler ---
    // Runs periodically to see if the user has reached their preferred reminderTime today.
    // Checks every 15 seconds to ensure timeliness without impacting performance.
    const checkDailyReminder = () => {
      const currentSettings = getNotificationSettings();
      if (!currentSettings.remindersEnabled || !currentSettings.browserNotificationsEnabled) return;

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const lastSentDate = localStorage.getItem("skillful_last_daily_reminder_date");
      if (lastSentDate === today) return; // Already sent today

      const [prefHours, prefMins] = currentSettings.reminderTime.split(":").map(Number);
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      // Check if current time is past or equal to the preferred time
      if (currentHours > prefHours || (currentHours === prefHours && currentMinutes >= prefMins)) {
        const title = "Daily Practice Reminder! 🦉";
        const body = "It's time for your 2-minute scenario check-in. Keep your streak alive and sharpen your instincts!";
        const url = "/skills";

        sendDesktopNotification(title, body, url);
        
        // Record in local inbox
        addNotification(
          title,
          "Ready for your rapid scenarios? Take a 2-minute break to build your decision-making habits.",
          "challenge",
          url,
          "Start Swiping"
        );

        // Mark as sent today
        localStorage.setItem("skillful_last_daily_reminder_date", today);
      }
    };

    // Run check immediately on mount, and then every 15 seconds
    checkDailyReminder();
    const dailyReminderInterval = setInterval(checkDailyReminder, 15000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (initialTipTimerRef.current) clearTimeout(initialTipTimerRef.current);
      clearInterval(dailyReminderInterval);
    };
  }, []);
}
export default useNotificationScheduler;
