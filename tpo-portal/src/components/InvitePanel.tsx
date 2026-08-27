import { useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import type { Institution } from "../types";

/**
 * How a TPO actually gets students onto their roster.
 *
 * Two ways to share, because placement cells communicate over both: a link for
 * WhatsApp groups and notice-board QR codes, and a bare code to read out or
 * print. Both resolve to the same join_institution call.
 */
const APP_URL = (import.meta.env.VITE_APP_URL || "https://skillfulglobal.com").replace(
    /\/+$/,
    ""
);

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is blocked on insecure origins; the text is on screen
            // and selectable, so this is a convenience failure, not a dead end.
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={label}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied
                </>
            ) : (
                <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                </>
            )}
        </button>
    );
}

export function InvitePanel({ institution }: { institution: Institution }) {
    const link = `${APP_URL}/skills?join=${encodeURIComponent(institution.code)}`;

    return (
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Add students to this cohort
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
                Students who join with this code appear below as they practise.
            </p>

            <div className="mt-4 space-y-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Join code
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 font-display text-sm font-semibold tracking-wide text-foreground">
                            {institution.code}
                        </code>
                        <CopyButton value={institution.code} label="Copy join code" />
                    </div>
                </div>

                <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Invite link
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                            {link}
                        </code>
                        <CopyButton value={link} label="Copy invite link" />
                    </div>
                </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Students already using SkillFul can also enter the code under{" "}
                <span className="text-foreground">Profile → Your college</span>.
            </p>
        </section>
    );
}
