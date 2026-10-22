import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationSettings,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  saveNotificationSettings,
} from "@/services/notificationService";
import {
  checkPushPermission,
  initPushNotifications,
  isNativePlatform,
  requestPushPermission,
} from "@/services/pushNotificationService";

export const NotificationPermissionBox = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!isNativePlatform() && !isBrowserNotificationSupported()) return;
      const permission = await checkPushPermission();
      const settings = getNotificationSettings();
      const enabled = isNativePlatform() ? settings.nativePushEnabled : settings.browserNotificationsEnabled;
      if (active) setVisible(permission !== "granted" || !enabled);
    };
    void refresh();
    window.addEventListener("skillful_settings_changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("skillful_settings_changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const enableNotifications = async () => {
    setPending(true);
    setMessage("");
    try {
      const native = isNativePlatform();
      const granted = native
        ? await requestPushPermission()
        : await requestBrowserNotificationPermission();
      if (!granted) {
        setMessage(native
          ? "Allow notifications for Skillful in your device settings, then try again."
          : "Allow notifications in your browser's site settings, then try again.");
        return;
      }
      if (native) await initPushNotifications(user.id);
      saveNotificationSettings({
        ...(native ? { nativePushEnabled: true } : { browserNotificationsEnabled: true }),
        remindersEnabled: true,
      });
      setVisible(false);
    } catch {
      setMessage("Couldn't turn on notifications. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (!visible) return null;

  return (
    <section aria-label="Practice notifications" className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Turn on notifications</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Get practice reminders and keep your learning streak going.</p>
            {message && <p role="status" className="mt-2 text-xs text-foreground">{message}</p>}
          </div>
        </div>
        <button type="button" onClick={enableNotifications} disabled={pending} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Turning on…" : "Turn on notifications"}
        </button>
      </div>
    </section>
  );
};
