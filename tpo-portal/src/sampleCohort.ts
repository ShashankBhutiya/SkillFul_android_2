/**
 * A deterministic stand-in cohort.
 *
 * The dashboard is useless to evaluate against an empty table, so before an
 * institution is provisioned it renders this instead — always behind a loud
 * "sample data" banner. Seeded so the numbers do not shuffle between renders
 * and a screenshot stays reproducible.
 */
import { CATALOG } from "./data/catalog";
import { PASTORAL_CATEGORY_IDS, READINESS_PILLARS } from "./config";
import type { StudentRecord } from "./types";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH"];

const FIRST_NAMES = [
    "Aarav", "Diya", "Rohan", "Ishita", "Karthik", "Sneha", "Aditya", "Meera",
    "Vikram", "Ananya", "Rahul", "Priya", "Arjun", "Nandini", "Siddharth",
    "Kavya", "Manish", "Tanvi", "Harsh", "Riya", "Nikhil", "Pooja", "Varun",
    "Shreya", "Abhishek", "Lakshmi", "Rajat", "Divya", "Sameer", "Neha",
    "Akash", "Trisha", "Gaurav", "Anjali", "Yash", "Sanjana", "Devansh",
    "Aishwarya", "Kunal", "Ritika", "Aryan", "Swati", "Naveen", "Bhavana",
    "Suraj", "Megha", "Imran", "Pallavi", "Vivek", "Sakshi", "Farhan",
    "Charita", "Om", "Vaishnavi", "Tarun", "Nikita", "Dhruv", "Aparna",
    "Kabir", "Sanya",
];

const LAST_NAMES = [
    "Sharma", "Iyer", "Reddy", "Patel", "Nair", "Gupta", "Rao", "Menon",
    "Joshi", "Verma", "Desai", "Kulkarni", "Chauhan", "Banerjee", "Pillai",
];

/** mulberry32 — small, seeded, good enough for fixture data. */
function makeRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const ALL_CATEGORY_IDS = [
    ...READINESS_PILLARS.flatMap((p) => p.categoryIds),
    ...PASTORAL_CATEGORY_IDS,
];

const questionCounts = new Map(CATALOG.map((c) => [c.id, c.questionCount]));

function isoDaysAgo(days: number, from: Date): string {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}

export const SAMPLE_INSTITUTION_NAME = "Sample Institute of Technology";

/**
 * 60 students with a believable spread: a strong tail, a long middle, and a
 * dormant group that never got past signup — which is the group a TPO most
 * needs the dashboard to surface.
 */
export function buildSampleCohort(seed = 20260825, today = new Date()): StudentRecord[] {
    const rand = makeRandom(seed);
    const students: StudentRecord[] = [];

    for (let i = 0; i < 60; i += 1) {
        const first = FIRST_NAMES[i % FIRST_NAMES.length];
        const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
        const branch = BRANCHES[Math.floor(rand() * BRANCHES.length)];

        // Baseline effort for this student, which everything else scales off.
        const effort = rand();
        const dormant = effort < 0.12;
        const engagement = dormant ? 0 : 0.25 + effort * 0.75;

        const accuracyByCategory: Record<string, number> = {};
        const practicedByCategory: Record<string, number> = {};

        for (const categoryId of ALL_CATEGORY_IDS) {
            // Pastoral topics get less attention than placement topics, and
            // technical categories are the ones students avoid when weak.
            const isPastoral = PASTORAL_CATEGORY_IDS.includes(categoryId);
            const isTechnical = READINESS_PILLARS[1].categoryIds.includes(categoryId);
            let touchChance = engagement;
            if (isPastoral) touchChance *= 0.45;
            if (isTechnical) touchChance *= 0.7 + effort * 0.4;

            if (rand() > touchChance) continue;

            const available = questionCounts.get(categoryId) ?? 25;
            const practiced = Math.max(
                1,
                Math.round(available * engagement * (0.35 + rand() * 0.65))
            );
            practicedByCategory[categoryId] = Math.min(practiced, available);

            const base = 48 + engagement * 38;
            const noise = (rand() - 0.5) * 22;
            accuracyByCategory[categoryId] = Math.round(
                Math.min(98, Math.max(28, base + noise - (isTechnical ? 6 : 0)))
            );
        }

        const daysSinceActive = dormant
            ? Math.floor(14 + rand() * 40)
            : Math.floor(rand() * (engagement > 0.7 ? 3 : 12));
        const currentStreak = dormant
            ? 0
            : Math.round(engagement * 18 * (daysSinceActive > 2 ? 0 : 1));

        students.push({
            userId: `sample-${i + 1}`,
            name: `${first} ${last}`,
            rollNumber: `21${branch.slice(0, 2).toUpperCase()}${String(i + 1).padStart(3, "0")}`,
            branch,
            batchYear: 2026,
            accuracyByCategory,
            practicedByCategory,
            currentStreak,
            longestStreak: Math.max(currentStreak, Math.round(engagement * 26)),
            lastActiveDate: dormant && rand() < 0.4 ? null : isoDaysAgo(daysSinceActive, today),
            totalDays: Math.round(engagement * 45),
        });
    }

    return students;
}
