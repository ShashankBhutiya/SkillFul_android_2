import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Sparkles, X, Flame, ShieldAlert } from "lucide-react";
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission
} from "@/services/notificationService";

export const NotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  const updatePermissionState = () => {
    if (isBrowserNotificationSupported()) {
      setPermissionState(getBrowserNotificationPermission());
    }
  };

  useEffect(() => {
    updatePermissionState();

    if (typeof window === "undefined" || !isBrowserNotificationSupported()) return;

    // Check if permission is already granted
    const currentPermission = getBrowserNotificationPermission();
    if (currentPermission === "granted") return;

    const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown for standard prompt

    const checkAndShowPrompt = (force = false) => {
      const permission = getBrowserNotificationPermission();
      if (permission === "granted") return;

      if (!force) {
        // Check cooldown
        const lastDismissed = localStorage.getItem("skillful_notif_prompt_last_dismissed");
        if (lastDismissed) {
          const timeSinceDismiss = Date.now() - Number(lastDismissed);
          if (timeSinceDismiss < COOLDOWN_MS) {
            return;
          }
        }
      }

      setShowPrompt(true);
    };

    // Show automatically after 12 seconds if cooldown has elapsed
    const initialTimer = setTimeout(() => {
      checkAndShowPrompt(false);
    }, 12000);

    // Listen for custom trigger events (e.g. from QuizSummary)
    const handleTriggerPrompt = () => {
      // Force show, bypassing the standard cooldown (since the user did a high-value action)
      checkAndShowPrompt(true);
    };

    window.addEventListener("trigger_notification_prompt", handleTriggerPrompt);
    // Listen for settings change in case they grant it via Settings tab in NotificationCenter
    const handleSettingsChanged = () => {
      updatePermissionState();
      if (getBrowserNotificationPermission() === "granted") {
        setShowPrompt(false);
      }
    };
    window.addEventListener("skillful_settings_changed", handleSettingsChanged);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("trigger_notification_prompt", handleTriggerPrompt);
      window.removeEventListener("skillful_settings_changed", handleSettingsChanged);
    };
  }, []);

  const handleEnable = async () => {
    const success = await requestBrowserNotificationPermission();
    updatePermissionState();
    if (success) {
      setShowPrompt(false);
    } else {
      if (getBrowserNotificationPermission() === "denied") {
        alert("Notifications are currently blocked by your browser. Please click the lock icon 🔒 next to the website URL in your browser address bar to allow them!");
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("skillful_notif_prompt_last_dismissed", String(Date.now()));
    setShowPrompt(false);
  };

  if (!isBrowserNotificationSupported() || permissionState === "granted") return null;

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
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            aria-label="Dismiss notification prompt"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Prompt Content */}
          <div className="flex gap-4 items-start">
            {/* Styled Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm">
              <Bell className="h-6 w-6 stroke-[1.8] animate-swing text-primary" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                Enable Notifications 🔔
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground font-body">
                {permissionState === "denied"
                  ? "Notifications are currently blocked. Enable them in browser settings to keep your learning momentum!"
                  : "Never miss a practice daily streak! Get instant bite-sized corporate and life scenario notifications directly."}
              </p>
            </div>
          </div>

          {/* Alert instructions if permission is blocked */}
          {permissionState === "denied" ? (
            <div className="mt-3.5 bg-destructive/10 text-destructive rounded-2xl p-3 border border-destructive/20 space-y-1.5 text-[10.5px] font-body">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span>
                  <strong>Blocked by Browser:</strong> Click the lock/settings icon 🔒 next to the website URL in your address bar, toggle "Notifications" to **Allow**, then reload the page!
                </span>
              </div>
            </div>
          ) : (
            /* Benefits Bullet Points if permission is default */
            <div className="mt-3.5 bg-muted/40 rounded-2xl p-3 border border-border/40 space-y-1.5 text-[10.5px] font-body text-muted-foreground">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                <span><strong>Secure Your Streak:</strong> Quick daily alerts to keep learning.</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
                <span><strong>Mascot Career Tips:</strong> Bite-sized lessons from your guide.</span>
              </div>
            </div>
          )}

          {/* Call to Actions */}
          <div className="mt-4 flex gap-2">
            {permissionState === "denied" ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  alert("Please click the lock icon 🔒 in your browser's address bar to change notification settings manually.");
                }}
                className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-4 rounded-xl bg-foreground text-background font-display font-bold text-xs shadow-md cursor-pointer"
              >
                How to Enable 🔒
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnable}
                className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                Allow Alerts ⚡
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
