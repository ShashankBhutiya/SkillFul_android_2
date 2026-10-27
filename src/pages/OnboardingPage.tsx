import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth, withTimeout } from "@/contexts/AuthContext";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brand, DetailField, OnboardingShell } from "@/components/onboarding/OnboardingUI";
import { emptyOnboarding, ONBOARDING_DRAFT_KEY, ONBOARDING_KEY, readOnboardingDraft, writeOnboardingDraft, type OnboardingDetails } from "@/config/onboarding";
import { rememberTutorial } from "@/config/tutorial";
import type { UserMode } from "@/config/userMode";

type Step = "welcome" | "role" | "details" | "auth" | "complete";
const academicYears = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate"];
const industries = ["Technology", "Education", "Finance", "Healthcare", "Manufacturing", "Retail", "Consulting", "Other"];

export default function OnboardingPage({ onDone }: { onDone?: (mode: UserMode) => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isLoading, signUp, signIn, signInWithGoogle, refreshProfile } = useAuth();
  const { setMode } = useUserMode();
  const [draft] = useState(readOnboardingDraft);
  const [details, setDetails] = useState<OnboardingDetails>(draft?.details || emptyOnboarding);
  const [step, setStep] = useState<Step>(draft?.pendingAuth || params.get("login") ? "auth" : "welcome");
  const [login, setLogin] = useState(params.get("login") === "true");
  const [email, setEmail] = useState(draft?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [needsSave, setNeedsSave] = useState(!!draft?.pendingAuth && !params.get("login"));
  const saving = useRef(false);
  const pendingEmail = useRef(draft?.email || "");
  const change = (key: keyof OnboardingDetails, value: string) => setDetails(current => ({ ...current, [key]: value }));
  const go = (next: Step) => { setError(""); setMessage(""); setStep(next); window.scrollTo(0, 0); };

  // Drafts survive Google redirects/email verification. Persist only to the
  // account that requested this onboarding, never another signed-in account.
  useEffect(() => {
    if (user.isGuest || isLoading || step !== "auth" || saving.current || authenticated) return;
    if (needsSave && pendingEmail.current && user.email?.toLowerCase() !== pendingEmail.current.toLowerCase()) {
      setError("This sign-in belongs to another account. Sign out before continuing with these details.");
      return;
    }
    if (!needsSave) { setAuthenticated(true); go("complete"); return; }
    saving.current = true;
    setBusy(true);
    const save = async () => {
      try {
        if (!supabase) throw new Error("Account services are unavailable. Please try again.");
        const { error: metadataError } = await withTimeout(supabase.auth.updateUser({ data: { onboarding: details } }), 8000, "Save learning details");
        if (metadataError) throw metadataError;
        const names = details.fullName.trim().split(/\s+/);
        const { data: savedProfile, error: profileError } = await withTimeout(Promise.resolve(supabase.from("profiles").update({
          user_mode: details.mode,
          ...(details.fullName.trim() ? { first_name: names[0], last_name: names.slice(1).join(" ") } : {}),
          ...(details.mode === "student" ? { degree: details.degree, academic_year: details.academicYear } : {}),
        }).eq("id", user.id).select("id").maybeSingle()), 8000, "Save profile");
        if (profileError) throw profileError;
        if (!savedProfile) throw new Error("Your profile is not ready yet. Please retry saving your details.");
        await refreshProfile();
        try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* optional storage */ }
        setAuthenticated(true);
        go("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save your details. Please retry.");
      } finally { saving.current = false; setBusy(false); }
    };
    void save();
  }, [user.id, user.isGuest, user.email, isLoading, step, needsSave, authenticated, details, refreshProfile]);

  const finish = () => {
    if (!authenticated) return;
    setMode(user.userMode || details.mode);
    try { localStorage.setItem(ONBOARDING_KEY, "complete"); } catch { /* session still proceeds */ }
    rememberTutorial();
    onDone?.(user.userMode || details.mode);
    navigate("/skills", { replace: true });
  };
  const saveDraft = (pendingAuth: boolean, targetEmail?: string) => {
    pendingEmail.current = targetEmail || "";
    writeOnboardingDraft({ details, pendingAuth, email: targetEmail });
    setNeedsSave(pendingAuth);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (!login) saveDraft(true, email.trim());
      const referral = localStorage.getItem("pending_referral_code") || undefined;
      const result = login ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, referral, false, undefined, false, false, details.mode);
      if (result.error) throw new Error(result.error);
      if (!login && "session" in result && !result.session) setMessage("Account created! Check your email to confirm your account, then log in here to continue.");
    } catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setError(""); setBusy(true);
    try {
      if (!login) saveDraft(true);
      const result = await signInWithGoogle(localStorage.getItem("pending_referral_code") || undefined);
      if (result.error) throw new Error(result.error);
      setMessage("Continue in Google to finish signing in.");
    } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed."); }
    finally { setBusy(false); }
  };
  const status = <>{error && <p role="alert" className="onboarding-status error">{error}</p>}{message && <p role="status" className="onboarding-status">{message}</p>}</>;

  if (step === "welcome") return <OnboardingShell key={step} kind="welcome-screen">
    <Brand /><img className="welcome-art" src="/onboarding/learning.png" width={300} height={300} alt="A learner studying with a book and laptop" />
    <h1 className="welcome-title">Build Skills.<span>Grow Every Day.</span></h1>
    <p className="welcome-copy">Learn new skills, build confidence,<br />and grow a little every day.</p>
    <div className="welcome-actions"><Button className="onboarding-primary" onClick={() => go("role")}>Get Started</Button><Button variant="outline" className="onboarding-secondary" onClick={() => { setLogin(true); setNeedsSave(false); go("auth"); }}>I already have an account</Button></div>
  </OnboardingShell>;

  if (step === "role") return <OnboardingShell key={step} kind="role-screen" back={() => go("welcome")}>
    <Brand asset="role" /><h1 className="onboarding-heading">How will you use Skillful?</h1><p className="onboarding-description">Choose the option that best describes you.</p>
    <div className="onboarding-roles" role="group" aria-label="Choose your role">{(["student", "professional"] as const).map(mode => <button type="button" key={mode} className="onboarding-role" aria-pressed={details.mode === mode} onClick={() => change("mode", mode)}>
      <span className="onboarding-role-title"><img src={`/onboarding/${mode === "student" ? "student" : "briefcase"}.svg`} width={24} height={24} alt="" />I'm a {mode === "student" ? "Student" : "Professional"}</span><p>{mode === "student" ? "Learn new skills and grow your knowledge." : "Build career skills and advance at work."}</p>
    </button>)}</div><Button className="onboarding-primary" onClick={() => go("details")}>Continue</Button>
  </OnboardingShell>;

  if (step === "details") {
    const student = details.mode === "student";
    return <OnboardingShell key={step} kind={`details-screen ${student ? "student-screen" : "professional-screen"}`} back={() => go("role")}>
      <Brand asset={student ? "student" : "professional"} /><h1 className="onboarding-heading">Tell us about your {student ? "studies" : "work"}</h1><p className="onboarding-description">{student ? "Help us personalize your learning journey." : "Help us personalize your professional learning journey."}</p>
      <form className="onboarding-details-form" onSubmit={event => { event.preventDefault(); saveDraft(!user.isGuest, user.isGuest ? undefined : user.email); setLogin(false); go("auth"); }}>
        {student ? <><DetailField label="Degree / Course" value={details.degree} onChange={v => change("degree", v)} placeholder="e.g. B.E. Computer Engineering" /><DetailField label="College / University" value={details.institution} onChange={v => change("institution", v)} placeholder="Enter your institution" /><DetailField label="Current Year of Study" value={details.academicYear} onChange={v => change("academicYear", v)} placeholder="Select your year" options={academicYears} /><DetailField label="Expected Graduation Year" value={details.graduationYear} onChange={v => change("graduationYear", v)} placeholder="Select year" options={Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i))} /></>
          : <><DetailField label="Current Job Title" value={details.jobTitle} onChange={v => change("jobTitle", v)} placeholder="e.g. Software Developer" /><DetailField label="Industry" value={details.industry} onChange={v => change("industry", v)} placeholder="Select your industry" options={industries} /><DetailField label="Work Experience" value={details.experience} onChange={v => change("experience", v)} placeholder="Select experience" options={["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"]} /><DetailField label="Career Goal" value={details.careerGoal} onChange={v => change("careerGoal", v)} placeholder="e.g. Grow into a leadership role" /></>}
        <Button type="submit" className="onboarding-primary">Continue</Button>
      </form>
    </OnboardingShell>;
  }

  if (step === "complete") return <OnboardingShell key={step} kind="completed-screen"><Brand centered asset="completed" /><img className="completed-art" src="/onboarding/completed.png" width={267} height={267} alt="A learner celebrating completing their setup" /><h1 className="completed-title">You're All Set!</h1><p className="completed-copy">Your learning journey starts here.<br />Let's make every day count.</p><Button className="onboarding-primary" onClick={finish}>Go to Dashboard <ArrowRight /></Button></OnboardingShell>;

  return <OnboardingShell key={step} kind="auth-screen" back={busy ? undefined : () => go(login ? "welcome" : "details")}>
    <Brand centered asset="auth" /><img className="auth-art" src="/onboarding/authentication.png" width={120} height={120} alt="" /><h1 className="onboarding-heading">{login ? "Welcome back" : "Create your account"}</h1><p className="onboarding-description">{login ? "Log in to continue your learning journey." : "Start your learning journey with Skillful."}</p>
    {status}
    {!user.isGuest ? <div className="mt-8">{busy ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving your learning profile…</p> : <Button className="onboarding-primary" onClick={() => { setError(""); setDetails(current => ({ ...current })); }}>Retry saving details</Button>}</div>
      : <><form onSubmit={submit} className="onboarding-auth-form"><fieldset disabled={busy}>
        {!login && <div className="auth-input-wrap"><span className="auth-icon"><img src="/onboarding/auth-lock.svg" width={17} height={17} alt="" /></span><Input className="onboarding-input" aria-label="Full Name" autoComplete="name" name="name" placeholder="Full Name" required maxLength={160} value={details.fullName} onChange={e => change("fullName", e.target.value)} /></div>}
        <div className="auth-input-wrap"><img src="/onboarding/auth-email.svg" width={24} height={24} alt="" /><Input className="onboarding-input" aria-label="Email Address" name="email" autoComplete="email" type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="auth-input-wrap"><span className="auth-icon"><img src="/onboarding/auth-user.svg" width={18.86} height={22.0383} alt="" /></span><Input className="onboarding-input" aria-label="Password" name="password" autoComplete={login ? "current-password" : "new-password"} type={showPassword ? "text" : "password"} placeholder="Password" required minLength={login ? undefined : 6} value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>
        <Button type="submit" className="onboarding-primary">{busy && <Loader2 className="animate-spin" />}{login ? "Log In" : "Create Account"}</Button>
      </fieldset></form><p className="auth-divider">OR</p><Button variant="outline" className="onboarding-secondary google-button" onClick={google} disabled={busy}>Continue with Google</Button>
      <p className="auth-switch">{login ? "New to Skillful? " : "Already have an account? "}<button type="button" disabled={busy} onClick={() => { if (login) { setLogin(false); setNeedsSave(false); go("role"); } else { setLogin(true); setNeedsSave(needsSave || !!message); setError(""); } }}>{login ? "Get started" : "Log in"}</button></p></>}
  </OnboardingShell>;
}
