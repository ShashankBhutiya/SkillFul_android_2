/**
 * Student category catalog — GENERATED, do not edit by hand.
 *
 * Source: src/data/studentQuestions.ts in the SkillFul app repo.
 * Regenerate with: node scripts/generate-tpo-catalog.mjs
 *
 * Only the fields the dashboard actually renders are carried over, so the
 * portal never ships the question text itself.
 */

export interface CatalogCategory {
    id: string;
    name: string;
    emoji: string;
    /** How many questions exist, which sets the coverage denominator. */
    questionCount: number;
}

export const CATALOG: CatalogCategory[] = [
    { id: "placements", name: "Placements & Campus Interviews", emoji: "🎯", questionCount: 25 },
    { id: "internships", name: "Internships & First Job", emoji: "🧑‍💻", questionCount: 25 },
    { id: "study_strategy", name: "Study Skills & Exam Strategy", emoji: "📚", questionCount: 25 },
    { id: "student_money", name: "Money for Students", emoji: "💸", questionCount: 25 },
    { id: "peer_pressure", name: "Campus Friendships & Peer Pressure", emoji: "🤝", questionCount: 25 },
    { id: "public_speaking", name: "Public Speaking & Presentations", emoji: "🎤", questionCount: 25 },
    { id: "student_burnout", name: "Mental Health & Burnout", emoji: "🌱", questionCount: 25 },
    { id: "online_reputation", name: "Digital Safety & Online Reputation", emoji: "🛡️", questionCount: 25 },
    { id: "student_scams", name: "Student Scams & Fake Opportunities", emoji: "🚨", questionCount: 25 },
    { id: "aptitude_reasoning", name: "Aptitude & Logical Reasoning", emoji: "🧮", questionCount: 25 },
    { id: "group_discussion", name: "Group Discussions & Case Rounds", emoji: "💬", questionCount: 25 },
    { id: "resume_linkedin", name: "Resume & LinkedIn That Get Shortlisted", emoji: "📄", questionCount: 25 },
    { id: "hr_behavioural", name: "HR & Behavioural Interview Rounds", emoji: "🧩", questionCount: 25 },
    { id: "tech_interview_readiness", name: "Technical Interview Readiness", emoji: "💻", questionCount: 25 },
    { id: "corporate_etiquette", name: "Corporate Etiquette & Work Readiness", emoji: "👔", questionCount: 25 },
    { id: "email_writing", name: "Professional Email & Business Writing", emoji: "✉️", questionCount: 25 },
    { id: "business_awareness", name: "Business Awareness & Company Research", emoji: "🌐", questionCount: 25 },
    { id: "ai_practice", name: "Personalised AI Practice", emoji: "✨", questionCount: 40 },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));
