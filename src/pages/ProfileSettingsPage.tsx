import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, ChevronRight, HelpCircle, Loader2, Mail, MessageSquare, UserRound, type LucideIcon } from "lucide-react";
import { useAuth, withTimeout } from "@/contexts/AuthContext";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { NotificationPermissionBox } from "@/components/layout/NotificationPermissionBox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SeoHead";
import { toast } from "@/hooks/use-toast";
import { getNotificationSettings, saveNotificationSettings, type NotificationSettings } from "@/services/notificationService";
import { Switch } from "@/components/ui/switch";
import "@/components/onboarding/onboarding.css";

type SettingIcon = "role" | "security" | "settings-lock" | "information" | LucideIcon;

function SettingRow({ title, description, icon, onClick, to, href }: { title: string; description: string; icon: SettingIcon; onClick?: () => void; to?: string; href?: string }) {
  const dimensions = icon === "role" ? [12.3289, 13.6667] : icon === "settings-lock" ? [13.0733, 15.1922] : [16, 16];
  const Icon = typeof icon === "string" ? null : icon;
  const children = <><span className="profile-setting-icon" aria-hidden="true"><img className="icon-circle" src={`/onboarding/${icon === "security" ? "security-circle" : "icon-circle"}.svg`} width={24} height={24} alt="" />{typeof icon === "string" ? <img src={`/onboarding/${icon}.svg`} width={dimensions[0]} height={dimensions[1]} alt="" /> : Icon && <Icon size={14} strokeWidth={1.75} />}</span><span className="profile-setting-copy"><strong>{title}</strong><small>{description}</small></span><ChevronRight className="profile-chevron" /></>;
  if (href) return <a className="profile-setting-row" href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  return to ? <Link className="profile-setting-row" to={to}>{children}</Link> : <button type="button" className="profile-setting-row" onClick={onClick}>{children}</button>;
}
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2><div className="profile-settings-group">{children}</div></section>;
}

export default function ProfileSettingsPage() {
  const { user, signOut } = useAuth();
  const { mode } = useUserMode();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"password" | "notifications" | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState(getNotificationSettings);
  const toggleNotification = (key: keyof NotificationSettings, checked: boolean) => {
    setNotifications(saveNotificationSettings({ [key]: checked }));
  };
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Guest Learner";
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const role = mode === "student" ? "Student" : "Professional";
  const edit = () => user.isGuest ? navigate("/onboarding?login=true") : setEditing(true);
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Your passwords do not match."); return; }
    setBusy(true);
    try {
      if (!supabase) throw new Error("Account services are unavailable.");
      const { error: updateError } = await withTimeout(supabase.auth.updateUser({ password }), 8000, "Change password");
      if (updateError) throw updateError;
      toast({ title: "Password updated", description: "Use your new password the next time you log in." });
      setPanel(null); setPassword(""); setConfirmation("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update your password."); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true); setError("");
    try { await signOut(); navigate("/onboarding?login=true", { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not log out. Try again."); }
    finally { setBusy(false); }
  };
  return <main id="main-content" className="skillful-design profile-design"><SeoHead title="Profile & Settings" description="Manage your Skillful account and learning preferences." path="/profile" />
    <div className="profile-design-inner"><header className="profile-design-header"><Link to="/skills" className="profile-back" aria-label="Back to dashboard"><img src="/onboarding/back-circle.svg" width={40} height={40} alt="" /><ArrowLeft /></Link><div><h1>Profile &amp; Settings</h1><p>Manage your account</p></div></header>
      <section className="profile-summary" aria-label="Your account"><div className="profile-avatar"><img src="/onboarding/avatar.svg" width={60} height={60} alt="" /><span>{initials}</span></div><div className="profile-identity"><h2>{name}</h2><p>{user.email || "Sign in to save your progress"}</p><span className="profile-role-badge">{role}</span></div><button type="button" className="profile-edit" onClick={edit}><img src="/onboarding/edit.svg" width={24} height={24} alt="" />{user.isGuest ? "Sign In" : "Edit Profile"}</button></section>
      <SettingsGroup title="Personal Information"><SettingRow title="Full name" description={name} icon={UserRound} onClick={edit} /><SettingRow title="Email Address" description={user.email || "Sign in to add your email"} icon={Mail} onClick={edit} /><SettingRow title="Role" description={role} icon="role" onClick={edit} /></SettingsGroup>
      <SettingsGroup title="Account Settings"><SettingRow title="Notifications" description="Manage your notifications" icon={Bell} onClick={() => setPanel("notifications")} /><SettingRow title="Privacy & Security" description="Control your data and privacy" icon="security" to="/privacy" /><SettingRow title="Change Password" description="Update your password" icon="settings-lock" onClick={() => { if (user.isGuest) edit(); else { setError(""); setPanel("password"); } }} /></SettingsGroup>
      <SettingsGroup title="Support"><SettingRow title="Help & Support" description="Get help or contact us" icon={HelpCircle} to="/contact" /><SettingRow title="About Skillful" description="About" icon="information" to="/about" /><SettingRow title="Feedback" description="Share your thoughts with us" icon={MessageSquare} href="https://forms.gle/54XXvLbfHAtJX7fF6" /></SettingsGroup>
      {error && !panel && <p role="alert" className="onboarding-status error">{error}</p>}
      <button type="button" disabled={busy} onClick={user.isGuest ? edit : logout} className="profile-logout">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <img src="/onboarding/logout.svg" width={24} height={24} alt="" />}{user.isGuest ? "Log In / Create Account" : "Log Out"}</button>
      <details className="profile-more"><summary>Practice, membership &amp; preferences</summary><div className="profile-more-links"><Link to="/streak">Daily streak</Link><Link to="/leaderboard">Leaderboard</Link><Link to="/refer">Refer &amp; earn</Link><Link to="/premium">{user.isPremium ? "Manage premium" : "Get premium"}</Link><Link to="/skills">Explore skills</Link><Link to="/terms">Terms</Link><button type="button" onClick={edit}>College linking &amp; appearance</button></div></details>
    </div>
    <ProfileSettingsModal isOpen={editing} onClose={() => setEditing(false)} />
    <Dialog open={panel !== null} onOpenChange={open => { if (!open && !busy) { setPanel(null); setError(""); } }}><DialogContent className="max-w-sm rounded-2xl"><DialogTitle>{panel === "password" ? "Change password" : "Notifications"}</DialogTitle><DialogDescription>{panel === "password" ? "Choose a new password for your account." : "Choose how Skillful reminds you to practise."}</DialogDescription>
      {panel === "password" ? <form onSubmit={changePassword} className="space-y-4"><label className="block text-sm">New password<Input aria-label="New password" autoComplete="new-password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-2" /></label><label className="block text-sm">Confirm password<Input aria-label="Confirm password" autoComplete="new-password" type="password" required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" />}Update password</Button></form>
        : <><NotificationPermissionBox /><div className="space-y-4">{([["remindersEnabled", "Daily practice reminders"], ["streakAlertsEnabled", "Streak alerts"], ["achievementAlertsEnabled", "Achievement updates"]] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm" htmlFor={key}>{label}<Switch id={key} checked={notifications[key]} onCheckedChange={checked => toggleNotification(key, checked)} /></label>)}</div><Link className="text-center text-sm text-primary" to="/streak" onClick={() => setPanel(null)}>Manage reminder schedule</Link></>}
    </DialogContent></Dialog>
  </main>;
}
