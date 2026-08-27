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
    { id: "aptitude_reasoning", name: "Aptitude & Logical Reasoning", emoji: "🧮", questionCount: 100 },
    { id: "group_discussion", name: "Group Discussions & Case Rounds", emoji: "💬", questionCount: 100 },
    { id: "resume_linkedin", name: "Resume & LinkedIn That Get Shortlisted", emoji: "📄", questionCount: 100 },
    { id: "hr_behavioural", name: "HR & Behavioural Interview Rounds", emoji: "🧩", questionCount: 100 },
    { id: "tech_interview_readiness", name: "Technical Interview Readiness", emoji: "💻", questionCount: 100 },
    { id: "corporate_etiquette", name: "Corporate Etiquette & Work Readiness", emoji: "👔", questionCount: 100 },
    { id: "email_writing", name: "Professional Email & Business Writing", emoji: "✉️", questionCount: 100 },
    { id: "business_awareness", name: "Business Awareness & Company Research", emoji: "🌐", questionCount: 100 },
    { id: "dsa_fundamentals", name: "Data Structures & Algorithms", emoji: "🔗", questionCount: 50 },
    { id: "dbms_sql", name: "DBMS & SQL", emoji: "🗄️", questionCount: 50 },
    { id: "operating_systems", name: "Operating Systems", emoji: "🖥️", questionCount: 50 },
    { id: "computer_networks", name: "Computer Networks", emoji: "📡", questionCount: 50 },
    { id: "oop_programming", name: "OOP & Programming Concepts", emoji: "🧱", questionCount: 50 },
    { id: "english_verbal", name: "English & Verbal Ability", emoji: "✍️", questionCount: 50 },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));
