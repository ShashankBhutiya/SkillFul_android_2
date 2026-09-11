/** Shapes the TPO dashboard works in, kept separate from the Supabase rows. */

/** One student's raw activity, already narrowed to one institution. */
export interface StudentRecord {
    userId: string;
    name: string;
    rollNumber?: string;
    branch?: string;
    batchYear?: number;
    degree?: string;
    academicYear?: string;
    /** category_id -> accuracy percentage (0-100) from their best attempt. */
    accuracyByCategory: Record<string, number>;
    /** category_id -> number of distinct questions practised. */
    practicedByCategory: Record<string, number>;
    currentStreak: number;
    longestStreak: number;
    /** "YYYY-MM-DD", or null if they have never opened the app. */
    lastActiveDate: string | null;
    totalDays: number;
}

/** One student's scored row — what the student table renders. */
export interface ScoredStudent extends StudentRecord {
    readiness: number;
    /** pillar id -> 0-100. */
    pillarScores: Record<string, number>;
    questionsPracticed: number;
    /** Mean accuracy across categories they have actually attempted. */
    avgAccuracy: number;
    categoriesAttempted: number;
    isActive: boolean;
    /** Pillar ids scoring below the gap threshold, weakest first. */
    weakestPillars: string[];
}

/** A category the cohort is collectively weak on. */
export interface SkillGap {
    categoryId: string;
    categoryName: string;
    emoji: string;
    pillarId: string;
    pillarLabel: string;
    /** Mean category score across the whole cohort, 0-100. */
    cohortScore: number;
    /** Mean accuracy among students who attempted it. */
    avgAccuracy: number;
    /** How many students have never touched it. */
    untouchedCount: number;
    attemptedCount: number;
}

/** Everything the dashboard renders, computed in one pass. */
export interface CohortSummary {
    students: ScoredStudent[];
    totalStudents: number;
    activeStudents: number;
    avgReadiness: number;
    /** band id -> student count. */
    bandCounts: Record<string, number>;
    /** pillar id -> cohort mean, 0-100. */
    pillarAverages: Record<string, number>;
    /** Weakest categories first. */
    skillGaps: SkillGap[];
    /** Pastoral categories, same shape, shown apart from the readiness score. */
    pastoralGaps: SkillGap[];
    totalQuestionsPracticed: number;
    /** Students who have never practised anything. */
    dormantCount: number;
}

export interface Institution {
    id: string;
    name: string;
    /** Legacy shared code. New enrolment uses one-time student codes. */
    code?: string | null;
    city?: string;
}

/** Why the dashboard is showing what it is showing. */
export type CohortSource =
    | { kind: "live"; institution: Institution }
    | {
          kind: "sample";
          reason: "unconfigured" | "not_provisioned" | "no_institution" | "empty";
          /**
           * Known when the TPO resolved fine and simply has no students yet.
           * Kept so the invite panel still works — that is precisely the
           * moment they need the join code most.
           */
          institution?: Institution;
      };
