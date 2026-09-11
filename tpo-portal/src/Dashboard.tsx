import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    ClipboardList,
    Gauge,
    MoonStar,
    Users,
} from "lucide-react";
import {
    ACCURACY_WEIGHT,
    ACTIVE_WINDOW_DAYS,
    COVERAGE_TARGET_PER_CATEGORY,
    COVERAGE_WEIGHT,
    GAP_SCORE_THRESHOLD,
} from "./config";
import { fetchCohort } from "./tpoService";
import type { CohortResult } from "./tpoService";
import { SAMPLE_INSTITUTION_NAME } from "./sampleCohort";
import { PillarBreakdown } from "./components/PillarBreakdown";
import { ReadinessDistribution } from "./components/ReadinessDistribution";
import { SkillGapTable } from "./components/SkillGapTable";
import { SourceBanner } from "./components/SourceBanner";
import { StatTile } from "./components/StatTile";
import { StudentTable } from "./components/StudentTable";
import { TpoLayout } from "./components/TpoLayout";
import { InvitePanel } from "./components/InvitePanel";

/**
 * Reads the same tables the student app writes and rolls them into the two
 * things a placement cell acts on: who is not ready, and what to train next.
 */
export function Dashboard({
    userId,
    email,
    onSignOut,
}: {
    userId: string | null;
    email: string | null;
    onSignOut: () => void;
}) {
    const [result, setResult] = useState<CohortResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [bandFilter, setBandFilter] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError("");

        fetchCohort(userId)
            .then((next) => {
                if (!cancelled) setResult(next);
            })
            .catch((err) => {
                console.error("Failed to load cohort:", err);
                if (!cancelled) setLoadError(err instanceof Error ? err.message : "The cohort could not be loaded.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // Present on the live path, and also when the TPO resolved but has no
    // students yet — so they can issue the first one-time codes.
    const institution =
        result?.source.kind === "live"
            ? result.source.institution
            : result?.source.institution;

    const institutionName = institution?.name ?? SAMPLE_INSTITUTION_NAME;

    const summary = result?.summary;
    const engagementAvailable = result?.engagementAvailable ?? true;
    const aiPracticeAvailable = result?.aiPracticeAvailable ?? true;

    const activePct = useMemo(() => {
        if (!summary || summary.totalStudents === 0) return 0;
        return Math.round((summary.activeStudents / summary.totalStudents) * 100);
    }, [summary]);

    const readyCount = summary
        ? (summary.bandCounts.ready ?? 0) + (summary.bandCounts.on_track ?? 0)
        : 0;

    if (!loading && loadError) {
        return (
            <TpoLayout institutionName={institutionName} email={email} onSignOut={onSignOut}>
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5">
                    <h2 className="font-display text-base font-semibold text-rose-900">Dashboard data is unavailable</h2>
                    <p className="mt-1 text-sm text-rose-800">{loadError}</p>
                    <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-rose-900 px-4 py-2 text-sm font-semibold text-white">
                        Try again
                    </button>
                </div>
            </TpoLayout>
        );
    }

    if (loading || !summary) {
        return (
            <TpoLayout institutionName={institutionName} email={email} onSignOut={onSignOut}>
                <div className="space-y-4">
                    <div className="h-24 animate-pulse rounded-xl bg-muted" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-xl bg-muted" />
                </div>
            </TpoLayout>
        );
    }

    return (
        <TpoLayout
            institutionName={institutionName}
            email={email}
            onSignOut={onSignOut}
            subtitle={institution ? "Placement readiness · one-time student access" : "Placement readiness dashboard"}
        >
            {result && <SourceBanner source={result.source} />}

            {!engagementAvailable && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">
                            Daily check-in data is unavailable
                        </p>
                        <p className="mt-0.5 text-xs text-amber-800">
                            The user_streaks table could not be read, so streaks and last-active
                            dates show as unknown rather than zero. Readiness scores are
                            unaffected — they come from practice records, not check-ins.
                        </p>
                    </div>
                </div>
            )}

            {!aiPracticeAvailable && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">AI practice data is unavailable</p>
                        <p className="mt-0.5 text-xs text-amber-800">
                            Apply the AI practice migration to include personalised practice in technical readiness. Fixed-catalog scores remain available.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Cohort"
                    value={summary.totalStudents}
                    context={`${readyCount} at 'on track' or better`}
                    icon={Users}
                />
                <StatTile
                    label="Avg readiness"
                    value={summary.avgReadiness.toFixed(0)}
                    context="Weighted across all five rounds"
                    icon={Gauge}
                    tone={
                        summary.avgReadiness >= 75
                            ? "good"
                            : summary.avgReadiness >= 55
                              ? "neutral"
                              : "warn"
                    }
                />
                <StatTile
                    label={`Active (${ACTIVE_WINDOW_DAYS}d)`}
                    value={engagementAvailable ? `${activePct}%` : "—"}
                    context={
                        engagementAvailable
                            ? `${summary.activeStudents} of ${summary.totalStudents} practised recently`
                            : "Check-in data unavailable"
                    }
                    icon={Activity}
                    tone={
                        !engagementAvailable
                            ? "neutral"
                            : activePct >= 60
                              ? "good"
                              : activePct >= 30
                                ? "warn"
                                : "bad"
                    }
                />
                <StatTile
                    label="Never started"
                    value={summary.dormantCount}
                    context="Signed up but practised nothing"
                    icon={MoonStar}
                    tone={summary.dormantCount === 0 ? "good" : "bad"}
                />
            </div>

            {institution && (
                <div className="mt-4">
                    <InvitePanel institution={institution} />
                </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <ReadinessDistribution
                    summary={summary}
                    activeBand={bandFilter}
                    onSelectBand={setBandFilter}
                />
                <PillarBreakdown summary={summary} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <SkillGapTable
                    gaps={summary.skillGaps}
                    title="Train these next"
                    caption={`Weakest placement topics across the batch. Anything under ${GAP_SCORE_THRESHOLD} is flagged.`}
                />
                <SkillGapTable
                    gaps={summary.pastoralGaps}
                    title="Wellbeing & safety awareness"
                    caption="Not part of the readiness score — tracked separately for student welfare."
                    limit={5}
                />
            </div>

            <div className="mt-4">
                <StudentTable
                    students={summary.students}
                    institutionName={institutionName}
                    institutionId={institution?.id ?? ""}
                    bandFilter={bandFilter}
                    onClearBandFilter={() => setBandFilter(null)}
                    engagementAvailable={engagementAvailable}
                />
            </div>

            <details className="mt-6 rounded-xl border border-border bg-card p-5">
                <summary className="flex cursor-pointer items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    How the readiness score is calculated
                </summary>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    <p>
                        Each topic scores {Math.round(ACCURACY_WEIGHT * 100)}% on the student's
                        best accuracy and {Math.round(COVERAGE_WEIGHT * 100)}% on how much of it
                        they have covered, where {COVERAGE_TARGET_PER_CATEGORY} questions counts
                        as full coverage. Topic scores average into the five rounds, which are
                        then weighted into the headline number.
                    </p>
                    <p>
                        A fixed topic a student has never opened scores zero rather than being skipped.
                        Personalised AI attempts roll into a clearly labelled AI-practice topic,
                        so free-form subjects contribute without being mislabelled as a fixed course.
                    </p>
                    <p className="flex items-start gap-2 text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            Readiness measures practice on the SkillFul app only. It is a signal
                            for who needs attention, not a substitute for mock interviews or
                            academic records.
                        </span>
                    </p>
                </div>
            </details>
        </TpoLayout>
    );
}
