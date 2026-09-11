import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
import { generateStudentAccessCodes } from "../tpoService";
import type { Institution } from "../types";

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    }

    return (
        <button type="button" onClick={() => void copy()} aria-label={label}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy all"}
        </button>
    );
}

/** Issues one-time codes without exposing their stored hashes. */
export function InvitePanel({ institution }: { institution: Institution }) {
    const [count, setCount] = useState(10);
    const [codes, setCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function generate() {
        setLoading(true);
        setError("");
        try {
            setCodes(await generateStudentAccessCodes(institution.id, count));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not generate student codes.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Add students to this cohort
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Generate a different one-time code for each student. In the SkillFul app, the student selects{" "}
                {institution.name} and enters their code while signing in or from Profile Settings.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Number of codes
                    <input type="number" min={1} max={1000} value={count}
                        onChange={(event) => setCount(Math.min(1000, Math.max(1, Number(event.target.value) || 1)))}
                        className="block h-9 w-28 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <button type="button" onClick={() => void generate()} disabled={loading}
                    className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Generate one-time codes
                </button>
            </div>

            {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}

            {codes.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-amber-900">Save these codes now</p>
                            <p className="mt-0.5 text-[11px] text-amber-800">For security, only hashes are stored and these codes cannot be shown again.</p>
                        </div>
                        <CopyButton value={codes.join("\n")} label="Copy all generated codes" />
                    </div>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {codes.map((code) => (
                            <code key={code} className="select-all rounded border border-amber-200 bg-white px-2 py-1.5 text-xs font-semibold tracking-wide text-amber-950">{code}</code>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
