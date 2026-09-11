import { READINESS_PILLARS, bandFor } from "../config";
import type { CohortSummary } from "../types";

/**
 * Cohort average per round of a campus drive. This is the chart that decides
 * what the next training session is about, so the pillars stay in a fixed
 * order — a TPO comparing week to week needs the rows to stay put.
 */
export function PillarBreakdown({ summary }: { summary: CohortSummary }) {
    return (
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-foreground">
                Where the batch stands, by round
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
                Cohort average out of 100. Weighting shown per row.
            </p>

            <ul className="mt-4 space-y-3.5">
                {READINESS_PILLARS.map((pillar) => {
                    const score = summary.pillarAverages[pillar.id] ?? 0;
                    const band = bandFor(score);
                    return (
                        <li key={pillar.id}>
                            {/* The weight rides with the label, not the score —
                                two numbers side by side read as one number. */}
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 text-sm font-medium text-foreground">
                                    {pillar.label}
                                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal tabular-nums text-muted-foreground">
                                        {Math.round(pillar.weight * 100)}% weight
                                    </span>
                                </span>
                                <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-foreground">
                                    {score.toFixed(0)}
                                </span>
                            </div>
                            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full ${band.bar}`}
                                    style={{ width: `${Math.max(2, score)}%` }}
                                />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{pillar.blurb}</p>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
