/**
 * Scoring for the TPO dashboard. Pure functions only — no Supabase, no React —
 * so the numbers a placement cell reports upward can be unit tested.
 */
import { CATALOG_BY_ID } from "./data/catalog";
import {
    ACCURACY_WEIGHT,
    ACTIVE_WINDOW_DAYS,
    COVERAGE_TARGET_PER_CATEGORY,
    COVERAGE_WEIGHT,
    GAP_SCORE_THRESHOLD,
    PASTORAL_CATEGORY_IDS,
    READINESS_BANDS,
    READINESS_PILLARS,
    bandFor,
} from "./config";
import type {
    CohortSummary,
    ScoredStudent,
    SkillGap,
    StudentRecord,
} from "./types";

/** Every category that rolls into the readiness score, in pillar order. */
const SCORED_CATEGORY_IDS = READINESS_PILLARS.flatMap((p) => p.categoryIds);
const GAP_CATEGORY_IDS = SCORED_CATEGORY_IDS.filter((id) => id !== "ai_practice");

function clamp(value: number, min = 0, max = 100): number {
    return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
    return Math.round(value * 10) / 10;
}

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Score one category for one student.
 *
 * Untouched categories score 0 rather than being skipped. That is deliberate:
 * a student who has never opened DBMS is not "unmeasured" to a TPO, they are
 * a gap, and averaging them away would flatter the batch.
 */
export function scoreCategory(student: StudentRecord, categoryId: string): number {
    const accuracy = student.accuracyByCategory[categoryId] ?? 0;
    const practiced = student.practicedByCategory[categoryId] ?? 0;
    if (accuracy === 0 && practiced === 0) return 0;

    const category = CATALOG_BY_ID.get(categoryId);
    const target = Math.min(
        COVERAGE_TARGET_PER_CATEGORY,
        category?.questionCount ?? COVERAGE_TARGET_PER_CATEGORY
    );
    const coverage = target > 0 ? clamp((practiced / target) * 100) : 0;

    return clamp(ACCURACY_WEIGHT * clamp(accuracy) + COVERAGE_WEIGHT * coverage);
}

/** Mean category score across one pillar. */
export function scorePillar(student: StudentRecord, pillarId: string): number {
    const pillar = READINESS_PILLARS.find((p) => p.id === pillarId);
    if (!pillar) return 0;
    // AI practice is additional free-form evidence, not a compulsory course.
    // It contributes when used but does not cap a student who completes the
    // fixed catalog without generating AI sets.
    const applicableIds = pillar.categoryIds.filter(
        (id) => id !== "ai_practice" || (student.practicedByCategory.ai_practice ?? 0) > 0
    );
    return mean(applicableIds.map((id) => scoreCategory(student, id)));
}

/** Weighted roll-up of the pillars — the headline number. */
export function scoreStudent(student: StudentRecord): ScoredStudent {
    const pillarScores: Record<string, number> = {};
    let readiness = 0;

    for (const pillar of READINESS_PILLARS) {
        const score = scorePillar(student, pillar.id);
        pillarScores[pillar.id] = round(score);
        readiness += score * pillar.weight;
    }

    const attempted = SCORED_CATEGORY_IDS.filter(
        (id) => (student.practicedByCategory[id] ?? 0) > 0
    );
    const accuracies = attempted
        .map((id) => student.accuracyByCategory[id])
        .filter((a): a is number => typeof a === "number" && a > 0);

    const weakestPillars = READINESS_PILLARS.filter(
        (p) => pillarScores[p.id] < GAP_SCORE_THRESHOLD
    )
        .sort((a, b) => pillarScores[a.id] - pillarScores[b.id])
        .map((p) => p.id);

    return {
        ...student,
        readiness: round(clamp(readiness)),
        pillarScores,
        questionsPracticed: Object.values(student.practicedByCategory).reduce(
            (sum, n) => sum + n,
            0
        ),
        avgAccuracy: round(mean(accuracies)),
        categoriesAttempted: attempted.length,
        isActive: isActiveWithin(student.lastActiveDate, ACTIVE_WINDOW_DAYS),
        weakestPillars,
    };
}

/** Did they check in within the window? `today` is injectable for tests. */
export function isActiveWithin(
    lastActiveDate: string | null,
    days: number,
    today = new Date()
): boolean {
    if (!lastActiveDate) return false;
    const last = new Date(`${lastActiveDate}T00:00:00`);
    if (Number.isNaN(last.getTime())) return false;
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const elapsed = (midnight.getTime() - last.getTime()) / 86_400_000;
    return elapsed >= 0 && elapsed < days;
}

function buildGaps(
    students: ScoredStudent[],
    categoryIds: string[]
): SkillGap[] {
    return categoryIds
        .map((categoryId) => {
            const category = CATALOG_BY_ID.get(categoryId);
            const pillar = READINESS_PILLARS.find((p) =>
                p.categoryIds.includes(categoryId)
            );

            const scores = students.map((s) => scoreCategory(s, categoryId));
            const attempted = students.filter(
                (s) => (s.practicedByCategory[categoryId] ?? 0) > 0
            );
            const accuracies = attempted
                .map((s) => s.accuracyByCategory[categoryId])
                .filter((a): a is number => typeof a === "number" && a > 0);

            return {
                categoryId,
                categoryName: category?.name ?? categoryId,
                emoji: category?.emoji ?? "📌",
                pillarId: pillar?.id ?? "pastoral",
                pillarLabel: pillar?.label ?? "Wellbeing & safety",
                cohortScore: round(mean(scores)),
                avgAccuracy: round(mean(accuracies)),
                untouchedCount: students.length - attempted.length,
                attemptedCount: attempted.length,
            };
        })
        .sort((a, b) => a.cohortScore - b.cohortScore);
}

/** One pass over the cohort producing everything the dashboard renders. */
export function summariseCohort(records: StudentRecord[]): CohortSummary {
    const students = records
        .map(scoreStudent)
        .sort((a, b) => b.readiness - a.readiness);

    const bandCounts: Record<string, number> = Object.fromEntries(
        READINESS_BANDS.map((b) => [b.id, 0])
    );
    for (const student of students) {
        bandCounts[bandFor(student.readiness).id] += 1;
    }

    const pillarAverages: Record<string, number> = {};
    for (const pillar of READINESS_PILLARS) {
        pillarAverages[pillar.id] = round(
            mean(students.map((s) => s.pillarScores[pillar.id]))
        );
    }

    return {
        students,
        totalStudents: students.length,
        activeStudents: students.filter((s) => s.isActive).length,
        avgReadiness: round(mean(students.map((s) => s.readiness))),
        bandCounts,
        pillarAverages,
        skillGaps: buildGaps(students, GAP_CATEGORY_IDS),
        pastoralGaps: buildGaps(students, PASTORAL_CATEGORY_IDS),
        totalQuestionsPracticed: students.reduce(
            (sum, s) => sum + s.questionsPracticed,
            0
        ),
        dormantCount: students.filter((s) => s.questionsPracticed === 0).length,
    };
}
