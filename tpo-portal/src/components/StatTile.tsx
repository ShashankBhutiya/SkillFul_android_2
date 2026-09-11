import type { LucideIcon } from "lucide-react";

/** One headline number. Label above, value large, context underneath. */
export function StatTile({
    label,
    value,
    context,
    icon: Icon,
    tone = "neutral",
}: {
    label: string;
    value: string | number;
    context?: string;
    icon: LucideIcon;
    tone?: "neutral" | "good" | "warn" | "bad";
}) {
    const toneClass = {
        neutral: "text-foreground",
        good: "text-emerald-600",
        warn: "text-amber-600",
        bad: "text-rose-600",
    }[tone];

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${toneClass}`}>
                {value}
            </p>
            {context && <p className="mt-1 text-xs text-muted-foreground">{context}</p>}
        </div>
    );
}
