import { describe, expect, it } from "vitest";
import {
    isActiveWithin,
    scoreCategory,
    scoreStudent,
    summariseCohort,
} from "../readiness";
import { READINESS_PILLARS, bandFor } from "../config";
import { buildSampleCohort } from "../sampleCohort";
import type { StudentRecord } from "../types";

function makeStudent(overrides: Partial<StudentRecord> = {}): StudentRecord {
    return {
        userId: "u1",
        name: "Test Student",
        accuracyByCategory: {},
        practicedByCategory: {},
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalDays: 0,
        ...overrides,
    };
}

describe("scoreCategory", () => {
    it("scores an untouched category as zero", () => {
        expect(scoreCategory(makeStudent(), "dsa_fundamentals")).toBe(0);
    });

    it("blends accuracy and coverage", () => {
        // 80% accuracy over 20 of the 40-question coverage target:
        // 0.65 * 80 + 0.35 * 50 = 69.5
        const student = makeStudent({
            accuracyByCategory: { dsa_fundamentals: 80 },
            practicedByCategory: { dsa_fundamentals: 20 },
        });
        expect(scoreCategory(student, "dsa_fundamentals")).toBeCloseTo(69.5, 5);
    });

    it("does not let coverage exceed the target", () => {
        const heavy = makeStudent({
            accuracyByCategory: { dsa_fundamentals: 100 },
            practicedByCategory: { dsa_fundamentals: 500 },
        });
        expect(scoreCategory(heavy, "dsa_fundamentals")).toBe(100);
    });
});

describe("scoreStudent", () => {
    it("gives a student with no activity a readiness of zero", () => {
        const scored = scoreStudent(makeStudent());
        expect(scored.readiness).toBe(0);
        expect(scored.categoriesAttempted).toBe(0);
        expect(scored.weakestPillars).toHaveLength(READINESS_PILLARS.length);
        expect(bandFor(scored.readiness).id).toBe("at_risk");
    });

    it("caps a fully practised, fully accurate student at 100", () => {
        const perfect = makeStudent();
        for (const pillar of READINESS_PILLARS) {
            for (const categoryId of pillar.categoryIds) {
                perfect.accuracyByCategory[categoryId] = 100;
                perfect.practicedByCategory[categoryId] = 100;
            }
        }
        const scored = scoreStudent(perfect);
        expect(scored.readiness).toBe(100);
        expect(scored.weakestPillars).toHaveLength(0);
    });

    it("only counts a pillar the student actually practised", () => {
        const aptitudeOnly = makeStudent({
            accuracyByCategory: { aptitude_reasoning: 100 },
            practicedByCategory: { aptitude_reasoning: 100 },
        });
        const scored = scoreStudent(aptitudeOnly);
        // Aptitude carries 20% of the score and nothing else was touched.
        expect(scored.readiness).toBeCloseTo(20, 1);
        expect(scored.pillarScores.aptitude).toBe(100);
        expect(scored.pillarScores.technical).toBe(0);
    });

    it("ignores pastoral topics when scoring readiness", () => {
        const pastoralOnly = makeStudent({
            accuracyByCategory: { student_burnout: 100, student_scams: 100 },
            practicedByCategory: { student_burnout: 100, student_scams: 100 },
        });
        expect(scoreStudent(pastoralOnly).readiness).toBe(0);
    });
});

describe("isActiveWithin", () => {
    const today = new Date(2026, 7, 25); // 25 Aug 2026, local

    it("counts today as active", () => {
        expect(isActiveWithin("2026-08-25", 7, today)).toBe(true);
    });

    it("counts the last day of the window as active", () => {
        expect(isActiveWithin("2026-08-19", 7, today)).toBe(true);
    });

    it("excludes the day the window closes", () => {
        expect(isActiveWithin("2026-08-18", 7, today)).toBe(false);
    });

    it("treats a missing or unparseable date as inactive", () => {
        expect(isActiveWithin(null, 7, today)).toBe(false);
        expect(isActiveWithin("not-a-date", 7, today)).toBe(false);
    });
});

describe("summariseCohort", () => {
    it("handles an empty cohort without dividing by zero", () => {
        const summary = summariseCohort([]);
        expect(summary.totalStudents).toBe(0);
        expect(summary.avgReadiness).toBe(0);
        expect(summary.activeStudents).toBe(0);
        expect(Object.values(summary.bandCounts).every((n) => n === 0)).toBe(true);
    });

    it("sorts students by readiness, best first", () => {
        const summary = summariseCohort(buildSampleCohort());
        const scores = summary.students.map((s) => s.readiness);
        expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    });

    it("puts every student in exactly one band", () => {
        const summary = summariseCohort(buildSampleCohort());
        const banded = Object.values(summary.bandCounts).reduce((a, b) => a + b, 0);
        expect(banded).toBe(summary.totalStudents);
    });

    it("orders skill gaps weakest first", () => {
        const summary = summariseCohort(buildSampleCohort());
        const scores = summary.skillGaps.map((g) => g.cohortScore);
        expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    });

    it("is deterministic for a given seed", () => {
        const a = summariseCohort(buildSampleCohort(42));
        const b = summariseCohort(buildSampleCohort(42));
        expect(a.avgReadiness).toBe(b.avgReadiness);
        expect(a.students.map((s) => s.userId)).toEqual(b.students.map((s) => s.userId));
    });
});
