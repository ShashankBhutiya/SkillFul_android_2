import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Flame,
  Zap,
  Unlock,
  Sparkles,
  X,
  BellOff,
  Check,
  Clock,
  Trash2,
  Brain,
  ToggleLeft,
  ToggleRight,
  Trophy,
  Share,
  PlusSquare,
  ArrowUpRight,
  Smartphone,
  Award,
  BookOpen,
  Moon,
  BellRing,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePwaInstallState } from "@/hooks/usePwaInstallState";
import { triggerPwaInstall } from "@/services/pwaInstallService";
import {
  getNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  requestBrowserNotificationPermission,
  isBrowserNotificationSupported,
  schedule5SecondTestReminder,
  NotificationItem,
  NotificationSettings,
  pullNotificationsFromDB,
} from "@/services/notificationService";
import {
  isNativePlatform,
  requestPushPermission,
  initPushNotifications,
  initLocalNotifications,
  scheduleLocalNotification,
  NotificationTemplates,
} from "@/services/pushNotificationService";
import { useStreak } from "@/hooks/useStreak";
import { useAuth } from "@/contexts/AuthContext";

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [unreadCount, setUnreadCount] = useState(0);
  const [testModeActive, setTestModeActive] = useState(false);
  const { streak: dailyStreak } = useStreak();
  const streak = dailyStreak.current;
  const navigate = useNavigate();
  
  const { isInstallable, isIOSInstallable } = usePwaInstallState();
  const [showIosModal, setShowIosModal] = useState(false);

  // Pull notifications on mount or when user ID changes
  useEffect(() => {
    if (user?.id) {
      pullNotificationsFromDB(user.id);
    }
  }, [user?.id]);

  const handlePwaInstall = async () => {
    if (isIOSInstallable) {
      setShowIosModal(true);
      setIsOpen(false); // Close dropdown to display modal
      return;
    }
    const success = await triggerPwaInstall();
    if (success) {
      setIsOpen(false); // Close dropdown
    }
  };

  // Load notifications and settings
  const loadData = () => {
    setNotifications(getNotifications());
    setSettings(getNotificationSettings());
    setUnreadCount(getUnreadCount());
  };

  useEffect(() => {
    loadData();

    // Listen to custom events from our service
    window.addEventListener("skillful_notifications_updated", loadData);
    window.addEventListener("skillful_settings_changed", loadData);
    window.addEventListener("skillful_streak_changed", loadData);

    return () => {
      window.removeEventListener("skillful_notifications_updated", loadData);
      window.removeEventListener("skillful_settings_changed", loadData);
      window.removeEventListener("skillful_streak_changed", loadData);
    };
  }, []);

  const handleMarkAllRead = () => {
    markAllAsRead(user?.id);
    loadData();
  };

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    loadData();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
    loadData();
  };

  const handleToggleReminder = () => {
    const newVal = !settings.remindersEnabled;
    saveNotificationSettings({ remindersEnabled: newVal });
  };

  const handleToggleTips = () => {
    const newVal = !settings.mascotTipsEnabled;
    saveNotificationSettings({ mascotTipsEnabled: newVal });
  };

  const handleTogglePush = async () => {
    if (isNativePlatform()) {
      if (settings.nativePushEnabled) {
        saveNotificationSettings({ nativePushEnabled: false });
      } else {
        const granted = await requestPushPermission();
        if (granted) {
          saveNotificationSettings({ nativePushEnabled: true });
          await initLocalNotifications();
          await initPushNotifications(user.id);
        } else {
          alert("Please enable notification permissions in your device settings!");
        }
      }
    } else {
      if (settings.browserNotificationsEnabled) {
        saveNotificationSettings({ browserNotificationsEnabled: false });
      } else {
        const success = await requestBrowserNotificationPermission();
        if (!success) {
          alert("Please enable notification permissions in your browser address bar first!");
        }
      }
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    saveNotificationSettings({ reminderTime: e.target.value });
  };

  const handleTestReminderTrigger = () => {
    const pushEnabled = isNativePlatform()
      ? settings.nativePushEnabled
      : settings.browserNotificationsEnabled;

    if (!pushEnabled) {
      alert(
        isNativePlatform()
          ? "Please enable Push Notifications first!"
          : "Please enable Browser Notifications first to receive the desktop push!"
      );
      return;
    }

    setTestModeActive(true);

    if (isNativePlatform()) {
      scheduleLocalNotification(
        NotificationTemplates.streakReminder(dailyStreak.current || 1),
        5000,
        7777
      );
    } else {
      schedule5SecondTestReminder();
    }

    setTimeout(() => {
      setTestModeActive(false);
      setIsOpen(false);
    }, 2000);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  const getNotifIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "streak":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 shrink-0">
            <Flame className="h-4 w-4 fill-current" />
          </div>
        );
      case "challenge":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 shrink-0">
            <Zap className="h-4 w-4 fill-current" />
          </div>
        );
      case "leaderboard":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case "unlock":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
            <Unlock className="h-4 w-4" />
          </div>
        );
      case "achievement":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 shrink-0">
            <Award className="h-4 w-4" />
          </div>
        );
      case "content":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
        );
      case "inactivity":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 shrink-0">
            <BellRing className="h-4 w-4" />
          </div>
        );
      case "reminder":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        );
      case "tip":
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shrink-0">
            <Brain className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9.5 w-9.5 items-center justify-center rounded-full bg-card/85 hover:bg-muted border border-border/60 shadow-sm transition-all text-foreground shrink-0 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
        
        {/* Pulsing Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm ring-2 ring-background"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-destructive/60 opacity-75" />
              <span className="relative">{unreadCount}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-outside Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -10 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="fixed inset-x-4 top-18 z-50 mx-auto w-auto max-w-md md:absolute md:right-0 md:inset-x-auto md:top-full md:mt-3 md:w-96 md:max-w-none bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/65 overflow-hidden text-foreground flex flex-col max-h-[80vh] md:max-h-[550px]"
            >
              {/* Header */}
              <div className="px-5 py-4.5 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-base tracking-tight">Notifications</h3>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                      🔥 {streak}d Streak
                    </span>
                  )}
                </div>
                {unreadCount > 0 && activeTab === "inbox" && (
                  <button
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              {/* Tabs Menu */}
              <div className="flex border-b border-border/30 px-3 py-1 bg-muted/10 shrink-0">
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`flex-1 py-2 text-center text-xs font-bold font-display rounded-xl transition-all ${
                    activeTab === "inbox"
                      ? "bg-card text-foreground shadow-sm border border-border/40"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex-1 py-2 text-center text-xs font-bold font-display rounded-xl transition-all ${
                    activeTab === "settings"
                      ? "bg-card text-foreground shadow-sm border border-border/40"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  Settings
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {activeTab === "inbox" ? (
                  // INBOX TAB
                  <div className="p-2 space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mb-4 text-muted-foreground/60 border border-border/30 shadow-inner">
                          <BellOff className="h-8 w-8 stroke-[1.5]" />
                        </div>
                        <p className="font-display font-bold text-sm text-foreground">Inbox is empty</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                          We will notify you here when new daily scenarios, streak achievements, or mascot tips are ready!
                        </p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleMarkRead(item.id)}
                          className={`group relative flex items-start gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                            item.read
                              ? "bg-card/45 hover:bg-muted/30 border-border/30"
                              : "bg-primary/5 hover:bg-primary/8 border-primary/15 shadow-sm"
                          }`}
                        >
                          {/* Dot indicator if unread */}
                          {!item.read && (
                            <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-primary" />
                          )}

                          {/* Icon */}
                          {getNotifIcon(item.type)}

                          {/* Copy */}
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-display font-extrabold text-xs leading-tight text-foreground truncate">
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-[11px] leading-relaxed text-muted-foreground mt-1 font-body">
                              {item.description}
                            </p>
                            
                            {/* Action CTA Button */}
                            {item.actionUrl && (
                              <div className="mt-2.5 flex items-center">
                                {item.actionUrl.startsWith("/") ? (
                                  <Link
                                    to={item.actionUrl}
                                    onClick={() => setIsOpen(false)}
                                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[10px] font-bold text-background hover:scale-[1.03] transition-transform shadow-sm"
                                  >
                                    {item.actionLabel || "Explore"}
                                    <Zap className="h-2.5 w-2.5 fill-current" />
                                  </Link>
                                ) : (
                                  <a
                                    href={item.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsOpen(false)}
                                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[10px] font-bold text-background hover:scale-[1.03] transition-transform shadow-sm"
                                  >
                                    {item.actionLabel || "Visit Link"}
                                  </a>
                                )}
                              </div>
                            )}

                            <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 mt-2 font-medium">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          </div>

                          {/* Delete Hover Button */}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-all shrink-0 self-center absolute right-2"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // SETTINGS TAB
                  <div className="p-5 space-y-5">
                    <p className="text-xs text-muted-foreground leading-relaxed font-body">
                      Customize how you build your practice habit. These settings are persisted to your local device.
                    </p>

                    {/* Switch toggles */}
                    <div className="space-y-4.5">
                      {/* Toggle 1: Daily reminders */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            Daily Practice reminders
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            Show friendly scenario pushes
                          </span>
                        </div>
                        <button
                          onClick={handleToggleReminder}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                        >
                          {settings.remindersEnabled ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>

                      {/* Toggle 2: Push Alerts (native or browser) */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            {isNativePlatform() ? "Push Notifications" : "Desktop Push Alerts"}
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            {isNativePlatform()
                              ? "Receive alerts even when the app is closed"
                              : "Remind me even when the tab is closed"}
                          </span>
                        </div>
                        <button
                          onClick={handleTogglePush}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                          disabled={!isNativePlatform() && !isBrowserNotificationSupported()}
                        >
                          {(isNativePlatform() ? settings.nativePushEnabled : settings.browserNotificationsEnabled) ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>

                      {/* Toggle 3: Mascot Companion tips */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            Mascot Companion Advice
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            Friendly tips popped into your inbox
                          </span>
                        </div>
                        <button
                          onClick={handleToggleTips}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                        >
                          {settings.mascotTipsEnabled ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>

                      {/* Toggle 4: Streak Alerts */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            Streak Alerts
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            Reminders to keep your streak alive
                          </span>
                        </div>
                        <button
                          onClick={() => saveNotificationSettings({ streakAlertsEnabled: !settings.streakAlertsEnabled })}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                        >
                          {settings.streakAlertsEnabled ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>

                      {/* Toggle 5: Achievement Alerts */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            Achievement Alerts
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            Milestone and unlock celebrations
                          </span>
                        </div>
                        <button
                          onClick={() => saveNotificationSettings({ achievementAlertsEnabled: !settings.achievementAlertsEnabled })}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                        >
                          {settings.achievementAlertsEnabled ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>

                      {/* Toggle 6: Leaderboard Updates */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-display font-extrabold text-xs text-foreground block">
                            Leaderboard Updates
                          </label>
                          <span className="text-[10px] text-muted-foreground font-body block mt-0.5">
                            Rank changes and position alerts
                          </span>
                        </div>
                        <button
                          onClick={() => saveNotificationSettings({ leaderboardAlertsEnabled: !settings.leaderboardAlertsEnabled })}
                          className="text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                        >
                          {settings.leaderboardAlertsEnabled ? (
                            <ToggleRight className="h-9 w-9" />
                          ) : (
                            <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
                          )}
                        </button>
                      </div>
                    </div>                    {/* PWA App Install Promotion */}
                    {(isInstallable || isIOSInstallable) && (
                      <div className="border-t border-border/30 pt-4">
                        <div className="rounded-2xl bg-primary/5 border border-primary/15 p-3 flex flex-col gap-2.5">
                          <div>
                            <span className="font-display font-extrabold text-xs text-foreground block">
                              Install Standalone App 📱
                            </span>
                            <span className="text-[10px] text-muted-foreground font-body block mt-0.5 leading-normal">
                              Installing adds Skillful to your home screen! This **helps by reminding you** daily with highly visible alerts to secure your learning streak.
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePwaInstall}
                            className="w-full inline-flex justify-center items-center py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-[11px] shadow-sm cursor-pointer"
                          >
                            {isIOSInstallable ? "How to Install 📱" : "Add to Home Screen ⚡"}
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Preferred Time Dropdown */}
                    <div className="border-t border-border/30 pt-4">
                      <label className="font-display font-extrabold text-xs text-foreground block mb-2">
                        Preferred Practice Time
                      </label>
                      <div className="relative">
                        <select
                          value={settings.reminderTime}
                          onChange={handleTimeChange}
                          className="w-full bg-muted/40 hover:bg-muted/75 border border-border/40 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors cursor-pointer"
                        >
                          <option value="08:00">Morning (8:00 AM)</option>
                          <option value="09:00">Morning (9:00 AM)</option>
                          <option value="12:00">Midday (12:00 PM)</option>
                          <option value="13:00">Afternoon (1:00 PM)</option>
                          <option value="18:00">Evening (6:00 PM)</option>
                          <option value="21:00">Night (9:00 PM)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="border-t border-border/30 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                        <label className="font-display font-extrabold text-xs text-foreground">
                          Quiet Hours
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body mb-2.5">
                        No notifications during these hours.
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          value={settings.quietHoursStart || "22:00"}
                          onChange={(e) => saveNotificationSettings({ quietHoursStart: e.target.value })}
                          className="flex-1 bg-muted/40 hover:bg-muted/75 border border-border/40 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const h = String(i).padStart(2, "0");
                            return <option key={h} value={`${h}:00`}>{h}:00</option>;
                          })}
                        </select>
                        <span className="text-xs text-muted-foreground font-bold">to</span>
                        <select
                          value={settings.quietHoursEnd || "08:00"}
                          onChange={(e) => saveNotificationSettings({ quietHoursEnd: e.target.value })}
                          className="flex-1 bg-muted/40 hover:bg-muted/75 border border-border/40 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const h = String(i).padStart(2, "0");
                            return <option key={h} value={`${h}:00`}>{h}:00</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    {/* WOW Factor Test Notification Demo */}
                    <div className="border-t border-border/30 pt-4">
                      <div className="rounded-2xl bg-primary/5 border border-primary/15 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground leading-normal font-body mb-2.5">
                          <strong>💡 Test in real-time:</strong> Turn on Browser Notifications, click below, and immediately minimize your browser window. In 5 seconds, a beautiful learning alert will pop up on your screen!
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleTestReminderTrigger}
                          disabled={testModeActive}
                          className="w-full inline-flex justify-center items-center gap-1.5 py-2 px-4 rounded-xl bg-foreground text-background font-display font-bold text-[11px] shadow-md disabled:opacity-60 cursor-pointer"
                        >
                          {testModeActive ? "Scheduling in 5s..." : "Send Test Reminder (5s delay)"}
                          <Sparkles className="h-3 w-3 fill-current animate-pulse" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* iOS Step-by-Step Guidance Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-sm overflow-hidden bg-card/95 border border-border/60 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl text-foreground relative font-body"
            >
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 shadow-sm mb-3">
                  <Smartphone className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h3 className="font-display font-extrabold text-lg tracking-tight">Install on iOS Safari</h3>
                <p className="text-xs text-muted-foreground mt-1">Add Skillful to your Home Screen in 3 simple steps:</p>
              </div>

              <div className="space-y-4 text-xs text-muted-foreground font-body">
                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Open Safari's Share Menu</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap the **Share** button <Share className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> located at the bottom of Safari.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Add to Home Screen</p>
                    <p className="text-[11px] leading-relaxed">
                      Scroll down in the sharing options menu and select **Add to Home Screen** <PlusSquare className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" />.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-muted/30 rounded-2xl border border-border/40">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-[11px]">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-semibold">Confirm Installation</p>
                    <p className="text-[11px] leading-relaxed">
                      Tap **Add** in the top-right corner <ArrowUpRight className="inline-block h-3.5 w-3.5 mx-1 text-primary stroke-[2]" /> to place the app on your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowIosModal(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xs shadow-md shadow-primary/10 cursor-pointer"
              >
                Got It, Thanks!
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default NotificationCenter;
