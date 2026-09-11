import { READINESS_BANDS } from "../config";
import type { CohortSummary } from "../types";

/**
 * The triage view: how the batch splits across the four readiness bands.
 * A stacked bar rather than a pie because the comparison that matters is
 * "how much of the bar is amber and red", which lengths answer and angles do not.
 */
export function ReadinessDistribution({
    summary,
    onSelectBand,
    activeBand,
}: {
    summary: CohortSummary;
    onSelectBand: (bandId: string | null) => void;
    activeBand: string | null;
}) {
    const total = Math.max(1, summary.totalStudents);

    return (
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-base font-semibold text-foreground">
                    Batch readiness
                </h2>
                <p className="text-xs text-muted-foreground">
                    {summary.totalStudents} students
                </p>
            </div>

            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {READINESS_BANDS.map((band) => {
                    const count = summary.bandCounts[band.id] ?? 0;
                    if (count === 0) return null;
                    return (
                        <div
                            key={band.id}
                            className={`${band.bar} transition-opacity ${
                                activeBand && activeBand !== band.id ? "opacity-30" : ""
                            }`}
                            style={{ width: `${(count / total) * 100}%` }}
                            title={`${band.label}: ${count}`}
                        />
                    );
                })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {READINESS_BANDS.map((band) => {
                    const count = summary.bandCounts[band.id] ?? 0;
                    const isActive = activeBand === band.id;
                    return (
                        <button
                            key={band.id}
                            type="button"
                            onClick={() => onSelectBand(isActive ? null : band.id)}
                            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                isActive ? band.fill : "border-border bg-background hover:bg-muted/60"
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${band.bar}`} />
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {band.label}
                                </span>
                            </span>
                            {/* Count and share sit on separate lines: side by side
                                they are two adjacent numerals and read as one. */}
                            <span
                                className={`mt-1 block font-display text-xl font-semibold leading-tight tabular-nums ${
                                    isActive ? band.text : "text-foreground"
                                }`}
                            >
                                {count}
                            </span>
                            <span className="block text-[11px] tabular-nums text-muted-foreground">
                                {Math.round((count / total) * 100)}% of batch
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Select a band to filter the student list below.
            </p>
        </section>
    );
}
