import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Sparkles, X, Flame, ShieldAlert } from "lucide-react";
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  saveNotificationSettings,
} from "@/services/notificationService";
import {
  isNativePlatform,
  checkPushPermission,
  requestPushPermission,
  initPushNotifications,
  initLocalNotifications,
} from "@/services/pushNotificationService";
import { useAuth } from "@/contexts/AuthContext";

export const NotificationPrompt = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt">("prompt");

  const updatePermissionState = async () => {
    if (isNativePlatform()) {
      const perm = await checkPushPermission();
      setPermissionState(perm);
    } else if (isBrowserNotificationSupported()) {
      setPermissionState(getBrowserNotificationPermission() as "granted" | "denied" | "prompt");
    }
  };

  useEffect(() => {
    updatePermissionState();

    if (typeof window === "undefined") return;

    const isSupported = isNativePlatform() || isBrowserNotificationSupported();
    if (!isSupported) return;

    const COOLDOWN_MS = 60 * 60 * 1000;

    const checkAndShowPrompt = async (force = false) => {
      const perm = await checkPushPermission();
      if (perm === "granted") return;

      if (!force) {
        const lastDismissed = localStorage.getItem("skillful_notif_prompt_last_dismissed");
        if (lastDismissed) {
          const timeSinceDismiss = Date.now() - Number(lastDismissed);
          if (timeSinceDismiss < COOLDOWN_MS) return;
        }
      }

      setShowPrompt(true);
    };

    const initialTimer = setTimeout(() => {
      checkAndShowPrompt(false);
    }, 12000);

    const handleTriggerPrompt = () => {
      checkAndShowPrompt(true);
    };

    window.addEventListener("trigger_notification_prompt", handleTriggerPrompt);

    const handleSettingsChanged = async () => {
      await updatePermissionState();
      const perm = await checkPushPermission();
      if (perm === "granted") setShowPrompt(false);
    };
    window.addEventListener("skillful_settings_changed", handleSettingsChanged);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("trigger_notification_prompt", handleTriggerPrompt);
      window.removeEventListener("skillful_settings_changed", handleSettingsChanged);
    };
  }, []);

  const handleEnable = async () => {
    if (isNativePlatform()) {
      const granted = await requestPushPermission();
      await updatePermissionState();
      if (granted) {
        saveNotificationSettings({ nativePushEnabled: true });
        await initLocalNotifications();
        await initPushNotifications(user.id);
        setShowPrompt(false);
      }
    } else {
      const success = await requestBrowserNotificationPermission();
      await updatePermissionState();
      if (success) {
        setShowPrompt(false);
      } else if (getBrowserNotificationPermission() === "denied") {
        alert("Notifications are currently blocked by your browser. Please click the lock icon next to the website URL to allow them!");
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("skillful_notif_prompt_last_dismissed", String(Date.now()));
    setShowPrompt(false);
  };

  const isSupported = isNativePlatform() || isBrowserNotificationSupported();
  if (!isSupported || permissionState === "granted") return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 220 }}
          className="fixed bottom-6 left-6 right-6 md:right-auto md:w-96 z-[99] bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-primary/20 p-5 pr-11 text-foreground"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            aria-label="Dismiss notification prompt"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-4 items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm">
              <Bell className="h-6 w-6 stroke-[1.8] animate-swing text-primary" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                Enable Notifications
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground font-body">
                {permissionState === "denied"
                  ? isNativePlatform()
                    ? "Notifications are blocked. Enable them in your device settings to keep your learning momentum!"
                    : "Notifications are currently blocked. Enable them in browser settings to keep your learning momentum!"
                  : "Never miss a daily streak! Get instant reminders, streak alerts, and achievement celebrations."}
              </p>
            </div>
          </div>

          {permissionState === "denied" ? (
            <div className="mt-3.5 bg-destructive/10 text-destructive rounded-2xl p-3 border border-destructive/20 space-y-1.5 text-[10.5px] font-body">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span>
                  {isNativePlatform() ? (
                    <><strong>Blocked:</strong> Go to your device Settings &gt; Apps &gt; Skillful &gt; Notifications and enable them.</>
                  ) : (
                    <><strong>Blocked by Browser:</strong> Click the lock/settings icon next to the website URL in your address bar, toggle "Notifications" to <strong>Allow</strong>, then reload the page!</>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3.5 bg-muted/40 rounded-2xl p-3 border border-border/40 space-y-1.5 text-[10.5px] font-body text-muted-foreground">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                <span><strong>Secure Your Streak:</strong> Quick daily alerts to keep learning.</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
                <span><strong>Achievement Alerts:</strong> Celebrate milestones as you grow.</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {permissionState === "denied" ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isNativePlatform()) {
                    alert("Please open your device Settings > Apps > Skillful > Notifications to enable them.");
                  } else {
                    alert("Please click the lock icon in your browser's address bar to change notification settings manually.");
                  }
                }}
                className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-4 rounded-xl bg-foreground text-background font-display font-bold text-xs shadow-md cursor-pointer"
              >
                How to Enable
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnable}
                className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                Allow Alerts
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDismiss}
              className="flex-1 inline-flex justify-center items-center py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 text-muted-foreground font-display font-bold text-xs transition-colors cursor-pointer"
            >
              Maybe Later
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default NotificationPrompt;
