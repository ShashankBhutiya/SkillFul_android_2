import { FormEvent, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { signIn } from "../auth";

/**
 * Sign-in for placement officers.
 *
 * Deliberately has no sign-up: a TPO account is provisioned by an
 * administrator and granted the 'tpo' role in institution_members, so
 * self-registration here would only create accounts that see nothing.
 */
export function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const message = await signIn(email.trim(), password);
        if (message) {
            setError(message);
            setBusy(false);
        }
        // On success the auth listener swaps this screen out, so there is no
        // success path to handle here.
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center text-center">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GraduationCap className="h-6 w-6" />
                    </span>
                    <h1 className="font-display text-xl font-semibold text-foreground">
                        SkillFul for Institutions
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Placement readiness dashboard for training &amp; placement officers.
                    </p>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="email">
                        Work email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    <label
                        className="mt-4 block text-xs font-medium text-muted-foreground"
                        htmlFor="password"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    {error && (
                        <p role="alert" className="mt-3 text-xs text-rose-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        Sign in
                    </button>
                </form>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Accounts are issued by SkillFul. Contact your administrator for access.
                </p>
            </div>
        </div>
    );
}
