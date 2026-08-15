import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { addNotification } from "./notificationService";

// ─── Types ───────────────────────────────────────────────────────────

export type PushNotificationType =
  | "streak"
  | "challenge"
  | "unlock"
  | "tip"
  | "leaderboard"
  | "achievement"
  | "content"
  | "inactivity"
  | "reminder";

export interface PushPayload {
  title: string;
  body: string;
  type: PushNotificationType;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
}

// ─── State ───────────────────────────────────────────────────────────

let localNotificationsInitialized = false;
let fcmInitialized = false;
let currentFcmToken: string | null = null;

const TOKEN_KEY = "skillful_push_token";

// ─── Platform Detection ─────────────────────────────────────────────

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): "android" | "web" {
  return Capacitor.getPlatform() === "android" ? "android" : "web";
}

// ─── Local Notifications (the core for in-app) ─────────────────────
// These work WITHOUT Firebase — they are fully local on the device.

export async function initLocalNotifications(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (localNotificationsInitialized) return true;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Request permission
    let permResult = await LocalNotifications.checkPermissions();
    if (permResult.display === "prompt") {
      permResult = await LocalNotifications.requestPermissions();
    }

    if (permResult.display !== "granted") {
      console.warn("Local notification permission not granted:", permResult.display);
      return false;
    }

    // Listen for notification taps — this is what makes "tap to open" work
    await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => {
        const extra = action.notification.extra || {};
        const url = extra.actionUrl || "/";
        console.log("Local notification tapped, navigating to:", url);

        // Also add to in-app inbox
        addNotification(
          action.notification.title || "Skillful",
          action.notification.body || "",
          (extra.type as PushNotificationType) || "tip",
          extra.actionUrl,
          extra.actionLabel
        );
        window.dispatchEvent(new Event("skillful_notifications_updated"));

        // Navigate — use hash-based routing since Capacitor serves from file://
        if (typeof window !== "undefined") {
          // Small delay to let the app come to foreground first
          setTimeout(() => {
            window.location.href = url;
          }, 300);
        }
      }
    );

    // Listen for notifications received while app is in foreground
    await LocalNotifications.addListener(
      "localNotificationReceived",
      (notification) => {
        console.log("Local notification received in foreground:", notification.title);
        const extra = notification.extra || {};
        addNotification(
          notification.title || "Skillful",
          notification.body || "",
          (extra.type as PushNotificationType) || "tip",
          extra.actionUrl,
          extra.actionLabel
        );
        window.dispatchEvent(new Event("skillful_notifications_updated"));
      }
    );

    localNotificationsInitialized = true;
    console.log("Local notifications initialized successfully");
    return true;
  } catch (err) {
    console.error("Failed to init local notifications:", err);
    return false;
  }
}

export async function scheduleLocalNotification(
  payload: PushPayload,
  delayMs: number,
  id?: number
): Promise<void> {
  if (!isNativePlatform()) {
    // Web fallback: just use setTimeout
    setTimeout(() => {
      sendCrossPlatformNotification(payload);
    }, delayMs);
    return;
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Ensure permissions
    const permResult = await LocalNotifications.checkPermissions();
    if (permResult.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") {
        console.warn("Cannot schedule notification — permission denied");
        return;
      }
    }

    const notifId = id || (Date.now() % 2147483647); // Android needs 32-bit int IDs

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: payload.title,
          body: payload.body,
          schedule: { at: new Date(Date.now() + delayMs) },
          sound: "default",
          smallIcon: "ic_notification",
          iconColor: "#8b5cf6",
          extra: {
            type: payload.type,
            actionUrl: payload.actionUrl || "/",
            actionLabel: payload.actionLabel || "Open",
          },
        },
      ],
    });

    console.log(`Scheduled local notification (id=${notifId}) in ${Math.round(delayMs / 1000)}s`);
  } catch (err) {
    console.error("Failed to schedule local notification:", err);
  }
}

export async function cancelAllLocalNotifications(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
      console.log(`Cancelled ${pending.notifications.length} pending notifications`);
    }
  } catch (err) {
    console.error("Failed to cancel local notifications:", err);
  }
}

// ─── Schedule Daily Reminder (Native Local Notification) ────────────

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    const permResult = await LocalNotifications.checkPermissions();
    if (permResult.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }

    // Cancel any existing daily reminders (IDs 9001-9010)
    const pending = await LocalNotifications.getPending();
    const dailyIds = pending.notifications.filter(
      (n) => n.id >= 9001 && n.id <= 9010
    );
    if (dailyIds.length > 0) {
      await LocalNotifications.cancel({ notifications: dailyIds });
    }

    // Calculate next trigger time
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9001,
          title: "Daily Practice Reminder! 🦉",
          body: "It's time for your 2-minute scenario check-in. Keep your streak alive!",
          schedule: {
            at: scheduledTime,
            repeats: true,
            every: "day",
          },
          sound: "default",
          smallIcon: "ic_notification",
          iconColor: "#8b5cf6",
          extra: {
            type: "reminder",
            actionUrl: "/skills",
            actionLabel: "Start Swiping",
          },
        },
      ],
    });

    console.log(`Daily reminder scheduled for ${hour}:${String(minute).padStart(2, "0")}`);
  } catch (err) {
    console.error("Failed to schedule daily reminder:", err);
  }
}

// ─── FCM Push (Android via Firebase — optional, needs google-services.json) ──

async function initFcmPush(userId: string): Promise<void> {
  if (fcmInitialized) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.checkPermissions();

    if (permResult.receive === "prompt" || permResult.receive === "prompt-with-rationale") {
      const requestResult = await PushNotifications.requestPermissions();
      if (requestResult.receive !== "granted") {
        console.warn("FCM push permission denied");
        return;
      }
    } else if (permResult.receive !== "granted") {
      console.warn("FCM push permission not granted:", permResult.receive);
      return;
    }

    // Register for FCM — this requires google-services.json to be present
    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      console.log("FCM token received:", token.value.substring(0, 20) + "...");
      currentFcmToken = token.value;
      localStorage.setItem(TOKEN_KEY, token.value);
      await saveTokenToSupabase(userId, token.value, "android");
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.warn("FCM registration failed (Firebase may not be configured):", error);
      // This is expected if google-services.json is missing — local notifications still work
    });

    // Remote push received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("FCM push received in foreground:", notification.title);
      const data = notification.data || {};
      addNotification(
        notification.title || "Skillful",
        notification.body || "",
        (data.type as PushNotificationType) || "tip",
        data.actionUrl,
        data.actionLabel
      );
      window.dispatchEvent(new Event("skillful_notifications_updated"));
    });

    // Remote push tapped
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data || {};
      const url = data.actionUrl || "/";
      console.log("FCM push tapped, navigating to:", url);
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = url;
        }, 300);
      }
    });

    fcmInitialized = true;
    console.log("FCM push initialized successfully");
  } catch (err) {
    console.warn("FCM push init failed (Firebase may not be configured):", err);
    // Don't rethrow — local notifications are independent
  }
}

// ─── Web Push (Service Worker + VAPID) ──────────────────────────────

async function initWebPush(userId: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Web push not supported in this browser");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Web notification permission denied");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("VAPID public key not configured, web push registration skipped");
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const token = JSON.stringify(subscription.toJSON());
    currentFcmToken = token;
    localStorage.setItem(TOKEN_KEY, token);
    await saveTokenToSupabase(userId, token, "web");
  } catch (err) {
    console.error("Web push subscription failed:", err);
  }
}

// ─── Token Management ───────────────────────────────────────────────

async function saveTokenToSupabase(
  userId: string,
  token: string,
  platform: "android" | "web"
): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

    if (error) {
      console.error("Failed to save push token:", error.message);
    }
  } catch (err) {
    console.warn("Token save failed:", err);
  }
}

export async function removeToken(userId: string): Promise<void> {
  if (!supabase) return;

  const platform = getPlatform();
  try {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", platform);

    localStorage.removeItem(TOKEN_KEY);
    currentFcmToken = null;
  } catch (err) {
    console.warn("Failed to remove push token:", err);
  }

  if (isNativePlatform()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
    } catch {}
  }
}

export function getCurrentToken(): string | null {
  return currentFcmToken || localStorage.getItem(TOKEN_KEY);
}

// ─── Main Initialization ────────────────────────────────────────────
// Separated into two independent steps:
//   1. Local notifications (always works, no Firebase needed)
//   2. FCM remote push (needs google-services.json — fails gracefully)

export async function initPushNotifications(userId: string): Promise<void> {
  if (isNativePlatform()) {
    // Step 1: Local notifications — always init these
    await initLocalNotifications();

    // Step 2: FCM remote push — try it, but don't block if Firebase isn't set up
    await initFcmPush(userId);
  } else {
    await initWebPush(userId);
  }
}

// ─── Permission Checks ─────────────────────────────────────────────

export async function checkLocalNotificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!isNativePlatform()) return "denied";

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.checkPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

export async function checkPushPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (isNativePlatform()) {
    // On native, check local notification permission (the one that matters for the app)
    return checkLocalNotificationPermission();
  }

  if ("Notification" in window) {
    return Notification.permission as "granted" | "denied" | "prompt";
  }

  return "denied";
}

export async function requestPushPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      // Request both local and push permissions
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const localResult = await LocalNotifications.requestPermissions();

      const { PushNotifications } = await import("@capacitor/push-notifications");
      const pushResult = await PushNotifications.requestPermissions();

      // Success if at least local notifications are granted
      return localResult.display === "granted";
    } catch {
      return false;
    }
  }

  if ("Notification" in window) {
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  return false;
}

// ─── Unified Send ───────────────────────────────────────────────────

export function sendCrossPlatformNotification(payload: PushPayload): boolean {
  // Always add to in-app inbox
  addNotification(
    payload.title,
    payload.body,
    payload.type as any,
    payload.actionUrl,
    payload.actionLabel
  );

  if (isNativePlatform()) {
    // On native, fire an immediate local notification
    scheduleLocalNotification(payload, 0);
    return true;
  }

  // Web: use browser Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const iconUrl = `${window.location.origin}/favicon.png`;

      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: iconUrl,
        badge: iconUrl,
        tag: `skillful-${payload.type}`,
        renotify: true,
      });

      notification.onclick = () => {
        window.focus();
        if (payload.actionUrl) {
          window.location.href = payload.actionUrl;
        }
        notification.close();
      };

      return true;
    } catch {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(payload.title, {
            body: payload.body,
            icon: `${window.location.origin}/favicon.png`,
            tag: `skillful-${payload.type}`,
            data: { actionUrl: payload.actionUrl },
          });
        });
        return true;
      }
    }
  }

  return false;
}

// ─── Server-Side Push (via Supabase Edge Function) ──────────────────

export async function sendPushToUser(
  targetUserId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: {
        userId: targetUserId,
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          actionUrl: payload.actionUrl || "/",
          actionLabel: payload.actionLabel || "Open",
        },
      },
    });

    if (error) {
      console.error("Failed to send push via edge function:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Push send failed:", err);
    return false;
  }
}

// ─── Notification Templates ─────────────────────────────────────────

export const NotificationTemplates = {
  streakReminder: (days: number): PushPayload => ({
    title: `Keep your ${days}-day streak alive! 🔥`,
    body: "Don't break your momentum. Swipe 5 rapid-fire scenarios now!",
    type: "streak",
    actionUrl: "/skills",
    actionLabel: "Continue Streak",
  }),

  streakBroken: (): PushPayload => ({
    title: "Your streak was broken 💔",
    body: "No worries — start a new one today! One swipe is all it takes.",
    type: "streak",
    actionUrl: "/skills",
    actionLabel: "Start New Streak",
  }),

  streakMilestone: (days: number): PushPayload => ({
    title: `${days}-day streak milestone! 🏆`,
    body: `Incredible! You've maintained a ${days}-day learning streak. You're building real mastery.`,
    type: "achievement",
    actionUrl: "/skills",
    actionLabel: "Keep Going",
  }),

  dailyReminder: (): PushPayload => ({
    title: "Daily Practice Reminder! 🦉",
    body: "It's time for your 2-minute scenario check-in. Keep your streak alive and sharpen your instincts!",
    type: "reminder",
    actionUrl: "/skills",
    actionLabel: "Start Swiping",
  }),

  inactivityNudge: (hours: number): PushPayload => ({
    title: "We miss you! 👋",
    body: `It's been ${hours} hours since your last practice. A quick 2-minute session keeps your skills sharp.`,
    type: "inactivity",
    actionUrl: "/skills",
    actionLabel: "Quick Session",
  }),

  achievementUnlocked: (name: string, description: string): PushPayload => ({
    title: `Achievement Unlocked: ${name} 🎖️`,
    body: description,
    type: "achievement",
    actionUrl: "/skills",
    actionLabel: "View Achievement",
  }),

  newContent: (categoryName: string): PushPayload => ({
    title: `New scenarios available! 📚`,
    body: `Fresh ${categoryName} scenarios just dropped. Be the first to practice them!`,
    type: "content",
    actionUrl: "/skills",
    actionLabel: "Try Now",
  }),

  leaderboardUpdate: (rank: number): PushPayload => ({
    title: `You're #${rank} on the leaderboard! 🏅`,
    body: rank <= 3
      ? "You're in the top 3! Keep pushing to maintain your position."
      : "Keep practicing to climb higher on the leaderboard!",
    type: "leaderboard",
    actionUrl: "/leaderboard",
    actionLabel: "View Leaderboard",
  }),

  weeklyDigest: (stats: {
    questionsAnswered: number;
    streak: number;
    accuracy: number;
  }): PushPayload => ({
    title: "Your Weekly Progress Report 📊",
    body: `This week: ${stats.questionsAnswered} questions, ${stats.streak}-day streak, ${stats.accuracy}% accuracy. Keep improving!`,
    type: "tip",
    actionUrl: "/skills",
    actionLabel: "View Stats",
  }),

  mascotTip: (tip: string): PushPayload => ({
    title: "Companion Tip from Skillful! 🦉",
    body: tip,
    type: "tip",
    actionUrl: "/skills",
    actionLabel: "Try a Scenario",
  }),

  welcomeBack: (): PushPayload => ({
    title: "Welcome back! 🎉",
    body: "Great to see you again. Let's pick up where you left off and sharpen those skills!",
    type: "tip",
    actionUrl: "/skills",
    actionLabel: "Resume Practice",
  }),
} as const;

// ─── Helpers ────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
