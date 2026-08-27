/**
 * Fetches one institution's cohort.
 *
 * The institution model (see the migration in the app repo) is the only
 * new schema this dashboard needs; everything else is read from the tables the
 * app already writes — user_progress, leaderboard_scores, user_streaks and
 * profiles. Joins are done client-side so the dashboard works on the anon key
 * without a view or an RPC to provision.
 */
import { supabase } from "./lib/supabase";
import { buildSampleCohort } from "./sampleCohort";
import { summariseCohort } from "./readiness";
import type {
    CohortSource,
    CohortSummary,
    Institution,
    StudentRecord,
} from "./types";

export interface CohortResult {
    summary: CohortSummary;
    source: CohortSource;
    /**
     * False when user_streaks could not be read. Engagement then has to be
     * shown as unknown rather than zero — telling a placement officer that
     * nobody is active when we simply cannot see is worse than saying nothing.
     */
    engagementAvailable: boolean;
}

/** Supabase reports a missing table as PGRST205 / 42P01. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    return (
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /relation .* does not exist|could not find the table/i.test(error.message ?? "")
    );
}

function sampleResult(
    reason: Extract<CohortSource, { kind: "sample" }>["reason"],
    institution?: Institution
): CohortResult {
    return {
        summary: summariseCohort(buildSampleCohort()),
        source: { kind: "sample", reason, institution },
        engagementAvailable: true,
    };
}

interface MemberRow {
    user_id: string;
    roll_number: string | null;
    branch: string | null;
    batch_year: number | null;
}

/** Which institution does this signed-in user run placements for? */
export async function fetchTpoInstitution(userId: string): Promise<Institution | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("institution_members")
        .select("institutions ( id, name, code, city )")
        .eq("user_id", userId)
        .eq("role", "tpo")
        .limit(1)
        .maybeSingle();

    if (error || !data?.institutions) return null;

    // PostgREST returns the embedded row as an object for a to-one relationship.
    const inst = data.institutions as unknown as Institution;
    return { id: inst.id, name: inst.name, code: inst.code, city: inst.city };
}

/**
 * Load and score a cohort. Falls back to the sample cohort — always labelled
 * as such by the caller — when Supabase is absent, the tables have not been
 * created yet, the signed-in user runs no institution, or it has no students.
 */
export async function fetchCohort(userId: string | null): Promise<CohortResult> {
    if (!supabase) return sampleResult("unconfigured");
    if (!userId) return sampleResult("no_institution");

    let institution: Institution | null = null;
    try {
        const probe = await supabase
            .from("institution_members")
            .select("user_id")
            .limit(1);
        if (isMissingTable(probe.error)) return sampleResult("not_provisioned");

        institution = await fetchTpoInstitution(userId);
    } catch {
        return sampleResult("not_provisioned");
    }

    if (!institution) return sampleResult("no_institution");

    const { data: memberRows } = await supabase
        .from("institution_members")
        .select("user_id, roll_number, branch, batch_year")
        .eq("institution_id", institution.id)
        .eq("role", "student");

    const members = (memberRows ?? []) as MemberRow[];
    if (members.length === 0) return sampleResult("empty", institution);

    const userIds = members.map((m) => m.user_id);

    // Four independent reads — issue them together rather than in sequence.
    const [profilesRes, progressRes, scoresRes, streaksRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name").in("id", userIds),
        supabase
            .from("user_progress")
            .select("user_id, category_id, practiced_ids")
            .in("user_id", userIds),
        supabase
            .from("leaderboard_scores")
            .select("user_id, category_id, accuracy_pct")
            .in("user_id", userIds),
        supabase
            .from("user_streaks")
            .select("user_id, current_streak, longest_streak, last_active_date, total_days")
            .in("user_id", userIds),
    ]);

    const nameById = new Map<string, string>();
    for (const row of profilesRes.data ?? []) {
        const full = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
        nameById.set(row.id, full);
    }

    const practicedByUser = new Map<string, Record<string, number>>();
    for (const row of progressRes.data ?? []) {
        const bucket = practicedByUser.get(row.user_id) ?? {};
        bucket[row.category_id] = (row.practiced_ids ?? []).length;
        practicedByUser.set(row.user_id, bucket);
    }

    // Keep the best attempt per category — that is what the student would
    // walk into an interview with.
    const accuracyByUser = new Map<string, Record<string, number>>();
    for (const row of scoresRes.data ?? []) {
        const bucket = accuracyByUser.get(row.user_id) ?? {};
        const pct = Number(row.accuracy_pct) || 0;
        bucket[row.category_id] = Math.max(bucket[row.category_id] ?? 0, pct);
        accuracyByUser.set(row.user_id, bucket);
    }

    const streakByUser = new Map(
        (streaksRes.data ?? []).map((row) => [row.user_id, row])
    );

    const records: StudentRecord[] = members.map((member) => {
        const streak = streakByUser.get(member.user_id);
        return {
            userId: member.user_id,
            name: nameById.get(member.user_id) || member.roll_number || "Unnamed student",
            rollNumber: member.roll_number ?? undefined,
            branch: member.branch ?? undefined,
            batchYear: member.batch_year ?? undefined,
            accuracyByCategory: accuracyByUser.get(member.user_id) ?? {},
            practicedByCategory: practicedByUser.get(member.user_id) ?? {},
            currentStreak: streak?.current_streak ?? 0,
            longestStreak: streak?.longest_streak ?? 0,
            lastActiveDate: streak?.last_active_date ?? null,
            totalDays: streak?.total_days ?? 0,
        };
    });

    return {
        summary: summariseCohort(records),
        source: { kind: "live", institution },
        engagementAvailable: !streaksRes.error,
    };
}
