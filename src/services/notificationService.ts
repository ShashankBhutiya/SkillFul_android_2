// Notification Service for managing in-app notifications and browser push alerts
// Driven by localStorage to support guest users who have never logged in

import { supabase } from "@/lib/supabase";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "streak" | "challenge" | "unlock" | "tip" | "leaderboard" | "achievement" | "content" | "inactivity" | "reminder";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationSettings {
  remindersEnabled: boolean;
  reminderFrequency: "daily" | "weekly";
  reminderTime: string; // e.g. "09:00"
  browserNotificationsEnabled: boolean;
  nativePushEnabled: boolean;
  mascotTipsEnabled: boolean;
  streakAlertsEnabled: boolean;
  achievementAlertsEnabled: boolean;
  leaderboardAlertsEnabled: boolean;
  inactivityNudgeEnabled: boolean;
  contentAlertsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const SETTINGS_KEY = "skillful_notification_settings";
const LIST_KEY = "skillful_notifications";

const DEFAULT_SETTINGS: NotificationSettings = {
  remindersEnabled: true,
  reminderFrequency: "daily",
  reminderTime: "09:00",
  browserNotificationsEnabled: false,
  nativePushEnabled: false,
  mascotTipsEnabled: true,
  streakAlertsEnabled: true,
  achievementAlertsEnabled: true,
  leaderboardAlertsEnabled: true,
  inactivityNudgeEnabled: true,
  contentAlertsEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

const SEEDED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "welcome-1",
    title: "Welcome to Skillful! 🎓",
    description: "Train your judgment before life asks. Master career, money, and relationships, 2 minutes at a time.",
    type: "tip",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins ago
    actionUrl: "/skills",
    actionLabel: "Explore skills",
  },
  {
    id: "welcome-2",
    title: "Your Companion is Ready! 🦉",
    description: "Skillful the companion is here to motivate you and track your progress. Let's make swiping a daily habit!",
    type: "challenge",
    read: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
    actionUrl: "/skills",
    actionLabel: "Start practicing",
  },
  {
    id: "welcome-3",
    title: "Enable Offline Practice Reminders! 🔔",
    description: "Want to stay sharp? Turn on browser notifications in settings to get bite-sized scenario alerts even when you close the tab.",
    type: "unlock",
    read: false,
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(), // 2 hours ago
  },
];

// --- Preferences ---

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.warn("Failed to parse notification settings:", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      // Dispatch a custom event to notify listeners of changes
      window.dispatchEvent(new Event("skillful_settings_changed"));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }
  return updated;
}

// --- Notifications List ---

export function getNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return SEEDED_NOTIFICATIONS;
  try {
    const stored = localStorage.getItem(LIST_KEY);
    if (!stored) {
      // Seed first time
      localStorage.setItem(LIST_KEY, JSON.stringify(SEEDED_NOTIFICATIONS));
      return SEEDED_NOTIFICATIONS;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to parse notifications list:", e);
    return SEEDED_NOTIFICATIONS;
  }
}

export function saveNotifications(notifications: NotificationItem[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LIST_KEY, JSON.stringify(notifications));
      // Dispatch a custom event to notify listeners of inbox updates
      window.dispatchEvent(new Event("skillful_notifications_updated"));
    } catch (e) {
      console.error("Failed to save notifications:", e);
    }
  }
}

export function addNotification(
  title: string,
  description: string,
  type: NotificationItem["type"],
  actionUrl?: string,
  actionLabel?: string
): NotificationItem {
  const currentList = getNotifications();
  const newItem: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    description,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl,
    actionLabel,
  };

  const updatedList = [newItem, ...currentList].slice(0, 50); // Cap at 50
  saveNotifications(updatedList);
  return newItem;
}

export async function markAsRead(id: string): Promise<void> {
  const currentList = getNotifications();
  const updated = currentList.map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  saveNotifications(updated);

  if (supabase) {
    try {
      await supabase.from("user_notifications").update({ read: true }).eq("id", id);
    } catch (err) {
      console.warn("Failed to mark notification as read in DB:", err);
    }
  }
}

export async function markAllAsRead(userId?: string): Promise<void> {
  const currentList = getNotifications();
  const updated = currentList.map((item) => ({ ...item, read: true }));
  saveNotifications(updated);

  if (supabase && userId) {
    try {
      await supabase.from("user_notifications").update({ read: true }).eq("user_id", userId);
    } catch (err) {
      console.warn("Failed to mark all notifications as read in DB:", err);
    }
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const currentList = getNotifications();
  const updated = currentList.filter((item) => item.id !== id);
  saveNotifications(updated);

  if (supabase) {
    try {
      await supabase.from("user_notifications").delete().eq("id", id);
    } catch (err) {
      console.warn("Failed to delete notification from DB:", err);
    }
  }
}

/**
 * Pull notifications from Supabase and merge them into the local list.
 */
export async function pullNotificationsFromDB(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    const { data: rows, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    if (!rows || rows.length === 0) return;

    const currentList = getNotifications();
    let updated = false;

    const mergedList = [...currentList];

    rows.forEach((row) => {
      // Check if this notification is already in our local storage list
      const exists = mergedList.some((item) => item.id === row.id);
      if (!exists) {
        mergedList.push({
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type as any,
          read: row.read,
          createdAt: row.created_at,
          actionUrl: row.action_url || undefined,
          actionLabel: row.action_label || undefined,
        });
        updated = true;
      }
    });

    if (updated) {
      // Sort descending by date
      mergedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const cappedList = mergedList.slice(0, 50);
      saveNotifications(cappedList);
    }
  } catch (err) {
    console.warn("Failed to pull notifications from DB:", err);
  }
}

export function getUnreadCount(): number {
  return getNotifications().filter((item) => !item.read).length;
}

// --- Browser Web Notifications Wrapper ---

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    const isGranted = permission === "granted";
    saveNotificationSettings({ browserNotificationsEnabled: isGranted });
    
    if (isGranted) {
      // Send a welcome alert
      sendDesktopNotification(
        "Notifications Enabled! 🔔",
        "You will now receive bite-sized daily scenario reminders. Stay sharp!"
      );
    }
    return isGranted;
  } catch (e) {
    console.error("Error requesting notification permission:", e);
    return false;
  }
}

export function isInQuietHours(): boolean {
  const settings = getNotificationSettings();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = settings.quietHoursStart.split(":").map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function sendDesktopNotification(title: string, body: string, actionUrl?: string): boolean {
  if (isInQuietHours()) return false;
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  // Mobile browsers require absolute URLs for notification icons/badges to render correctly
  const getAbsoluteIconUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/favicon.png`;
    }
    return "/favicon.png";
  };

  const iconUrl = getAbsoluteIconUrl();

  try {
    const options: NotificationOptions = {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: "skillful-reminder",
      renotify: true,
      requireInteraction: false,
    };

    const notification = new Notification(title, options);
    
    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (actionUrl) {
        window.location.href = actionUrl;
      }
      notification.close();
    };

    return true;
  } catch (e) {
    console.error("Failed to send desktop notification:", e);
    // Fallback: register through Service Worker if possible
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: "skillful-reminder",
        });
      });
      return true;
    }
    return false;
  }
}

// --- Wow-factor 5-Second Test Scheduler ---

export function schedule5SecondTestReminder(): void {
  if (typeof window === "undefined") return;

  const currentSettings = getNotificationSettings();
  
  // Show in-app warning to switch tabs
  console.log("Scheduling reminder in 5 seconds...");
  
  setTimeout(() => {
    const title = "Keep your streak alive! ⚡";
    const body = "Don't break your momentum. Swipe 5 rapid-fire scenarios now on Skillful!";
    const url = "/skills";

    // 1. Send browser push if allowed
    const sent = sendDesktopNotification(title, body, url);

    // 2. Always register in in-app inbox
    addNotification(
      title,
      "You scheduled a test reminder. Continue practicing scenarios to build powerful judgment skills!",
      "streak",
      url,
      "Resume practicing"
    );
  }, 5000);
}
