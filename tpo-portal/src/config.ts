/**
 * TPO dashboard — placement readiness model.
 *
 * A Training & Placement Officer does not care about individual swipes. They
 * care about two questions: "is this batch ready to sit in front of a panel?"
 * and "what do I run the next workshop on?" Everything here exists to answer
 * those two, so the student catalog is folded into a handful of pillars that
 * map to how campus drives are actually structured.
 */
/** A pillar is one round of a typical campus drive. */
export interface ReadinessPillar {
    id: string;
    label: string;
    /** What the TPO is looking at when this number is low. */
    blurb: string;
    /** Student category ids that roll up into this pillar. */
    categoryIds: string[];
    /** Contribution to the overall readiness score. Weights sum to 1. */
    weight: number;
}

/**
 * Weights follow the order rounds actually eliminate people in: aptitude and
 * technical screens cut the most candidates, so they carry the most.
 */
export const READINESS_PILLARS: ReadinessPillar[] = [
    {
        id: "aptitude",
        label: "Aptitude & Reasoning",
        blurb: "The first-round filter most students are eliminated by.",
        categoryIds: ["aptitude_reasoning"],
        weight: 0.2,
    },
    {
        id: "technical",
        label: "Technical Fundamentals",
        blurb: "CS core — DSA, DBMS, OS, networks, OOP — plus interview handling.",
        categoryIds: [
            "dsa_fundamentals",
            "dbms_sql",
            "operating_systems",
            "computer_networks",
            "oop_programming",
            "tech_interview_readiness",
        ],
        weight: 0.3,
    },
    {
        id: "communication",
        label: "Communication",
        blurb: "Verbal ability, group discussions, presenting and written English.",
        categoryIds: [
            "english_verbal",
            "group_discussion",
            "public_speaking",
            "email_writing",
        ],
        weight: 0.2,
    },
    {
        id: "interview",
        label: "Interview Craft",
        blurb: "HR rounds, resume quality and knowing the company they applied to.",
        categoryIds: [
            "hr_behavioural",
            "resume_linkedin",
            "placements",
            "business_awareness",
        ],
        weight: 0.2,
    },
    {
        id: "work_readiness",
        label: "Work Readiness",
        blurb: "Etiquette and habits that decide whether the offer survives probation.",
        categoryIds: ["corporate_etiquette", "internships", "study_strategy"],
        weight: 0.1,
    },
];

/**
 * Pastoral topics. Deliberately outside the readiness score — a student who
 * has not read about burnout is not less placeable, but a cohort ignoring
 * these is still something a TPO wants to see.
 */
export const PASTORAL_CATEGORY_IDS = [
    "student_burnout",
    "peer_pressure",
    "student_money",
    "online_reputation",
    "student_scams",
];

/** Readiness score is 0-100. Bands are what the TPO sorts and triages on. */
export interface ReadinessBand {
    id: "ready" | "on_track" | "needs_work" | "at_risk";
    label: string;
    /** Inclusive lower bound. */
    min: number;
    /** Tailwind classes — text, subtle fill, and a solid bar fill. */
    text: string;
    fill: string;
    bar: string;
}

export const READINESS_BANDS: ReadinessBand[] = [
    {
        id: "ready",
        label: "Interview ready",
        min: 75,
        text: "text-emerald-700",
        fill: "bg-emerald-50 border-emerald-200",
        bar: "bg-emerald-500",
    },
    {
        id: "on_track",
        label: "On track",
        min: 55,
        text: "text-sky-700",
        fill: "bg-sky-50 border-sky-200",
        bar: "bg-sky-500",
    },
    {
        id: "needs_work",
        label: "Needs work",
        min: 35,
        text: "text-amber-700",
        fill: "bg-amber-50 border-amber-200",
        bar: "bg-amber-500",
    },
    {
        id: "at_risk",
        label: "At risk",
        min: 0,
        text: "text-rose-700",
        fill: "bg-rose-50 border-rose-200",
        bar: "bg-rose-500",
    },
];

export function bandFor(score: number): ReadinessBand {
    return (
        READINESS_BANDS.find((b) => score >= b.min) ??
        READINESS_BANDS[READINESS_BANDS.length - 1]
    );
}

/**
 * How a single category is scored. Accuracy dominates because it is the
 * signal about judgment; coverage is there so a student cannot look ready off
 * five lucky questions.
 */
export const ACCURACY_WEIGHT = 0.65;
export const COVERAGE_WEIGHT = 0.35;

/** Practising this many questions in a category counts as full coverage. */
export const COVERAGE_TARGET_PER_CATEGORY = 40;

/** A student counts as active if they checked in within this many days. */
export const ACTIVE_WINDOW_DAYS = 7;

/** Below this, a category is flagged as a cohort-wide gap worth a workshop. */
export const GAP_SCORE_THRESHOLD = 55;
