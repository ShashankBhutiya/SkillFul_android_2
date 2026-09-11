import { GAP_SCORE_THRESHOLD, bandFor } from "../config";
import type { SkillGap } from "../types";

/**
 * The weakest topics across the batch, worst first — the shortlist a TPO
 * builds a training calendar from. Untouched counts sit next to the score
 * because a low score from nobody attempting needs a different intervention
 * than a low score from everyone attempting and failing.
 */
export function SkillGapTable({
    gaps,
    title,
    caption,
    limit = 8,
}: {
    gaps: SkillGap[];
    title: string;
    caption: string;
    limit?: number;
}) {
    const rows = gaps.slice(0, limit);

    // min-w-0: as a grid child this section would otherwise refuse to shrink
    // below the table's min-width and get clipped by the page's overflow-x: clip.
    return (
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>

            <div className="mt-4 -mx-1 overflow-x-auto">
                <table className="w-full min-w-[440px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="px-1 pb-2 font-medium">Topic</th>
                            <th className="px-1 pb-2 text-right font-medium">Score</th>
                            <th className="px-1 pb-2 text-right font-medium">Accuracy</th>
                            <th className="px-1 pb-2 text-right font-medium">Not started</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((gap) => {
                            const band = bandFor(gap.cohortScore);
                            return (
                                <tr key={gap.categoryId} className="border-b border-border/60 last:border-0">
                                    <td className="px-1 py-2.5">
                                        <span className="flex items-center gap-2">
                                            <span aria-hidden>{gap.emoji}</span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-[13px] font-medium text-foreground">
                                                    {gap.categoryName}
                                                </span>
                                                <span className="block text-[11px] text-muted-foreground">
                                                    {gap.pillarLabel}
                                                </span>
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-1 py-2.5 text-right">
                                        <span
                                            className={`font-display text-sm font-semibold tabular-nums ${
                                                gap.cohortScore < GAP_SCORE_THRESHOLD
                                                    ? band.text
                                                    : "text-foreground"
                                            }`}
                                        >
                                            {gap.cohortScore.toFixed(0)}
                                        </span>
                                    </td>
                                    <td className="px-1 py-2.5 text-right tabular-nums text-muted-foreground">
                                        {gap.attemptedCount > 0 ? `${gap.avgAccuracy.toFixed(0)}%` : "—"}
                                    </td>
                                    <td className="px-1 py-2.5 text-right tabular-nums text-muted-foreground">
                                        {gap.untouchedCount}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
