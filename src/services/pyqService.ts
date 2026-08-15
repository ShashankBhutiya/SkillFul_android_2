import { supabase } from "@/lib/supabase";

export interface PYQQuestionOption {
  id: string;
  text: string;
  image_url?: string;
}

export type PYQQuestionType = "single_correct" | "multiple_correct" | "numerical" | "assertion_reasoning";

export interface PYQQuestion {
  id: string;
  exam: "jee_main" | "jee_advanced" | "neet";
  subject: "physics" | "chemistry" | "mathematics" | "biology";
  chapters: string[];
  tags: string[];
  repeatability_score: number;
  importance_score: number;
  year: number;
  session?: string;
  question_type: PYQQuestionType;
  question_text: string;
  question_image_url?: string;
  options?: PYQQuestionOption[] | null;
  correct_answer: any; // string[] for MCQ, number/string or {value: number, tolerance?: number} for numerical
  explanation?: string;
  explanation_image_url?: string;
  difficulty: "easy" | "medium" | "hard";
  marks_correct: number;
  marks_wrong: number;
  marks_partial?: number;
}

export interface PYQAttempt {
  question_id: string;
  exam: string;
  subject: string;
  is_correct: boolean;
  user_answer: any;
  marks_obtained: number;
  time_taken_ms?: number;
}

// ────────────────────────────────────────────────────────
// High-Fidelity Mock Seed Data (JEE / NEET formats)
// ────────────────────────────────────────────────────────
const MOCK_QUESTIONS: PYQQuestion[] = [
  {
    id: "mock_jee_p1",
    exam: "jee_main",
    subject: "physics",
    chapters: ["Kinematics", "Motion in a Plane"],
    tags: ["Projectile Motion", "Maximum Range", "Gravity"],
    repeatability_score: 8,
    importance_score: 4,
    year: 2024,
    session: "January 27 Shift 1",
    question_type: "single_correct",
    question_text: "A projectile is thrown with an initial velocity of (6i + 8j) m/s. If g = 10 m/s², then the horizontal range of the projectile is:",
    options: [
      { id: "A", text: "4.8 m" },
      { id: "B", text: "9.6 m" },
      { id: "C", text: "12.0 m" },
      { id: "D", text: "19.2 m" }
    ],
    correct_answer: ["B"],
    explanation: "Initial velocity u = 6i + 8j. So u_x = 6 m/s and u_y = 8 m/s.\nTime of flight T = 2 * u_y / g = 2 * 8 / 10 = 1.6 s.\nHorizontal range R = u_x * T = 6 * 1.6 = 9.6 m.",
    difficulty: "medium",
    marks_correct: 4,
    marks_wrong: -1
  },
  {
    id: "mock_jee_p2",
    exam: "jee_main",
    subject: "physics",
    chapters: ["Electrostatics", "Electric Potential"],
    tags: ["Potential difference", "Conservative Field"],
    repeatability_score: 9,
    importance_score: 5,
    year: 2023,
    session: "April 15 Shift 2",
    question_type: "numerical",
    question_text: "An electric charge of 10 μC is moved from point A to B in an electric field. The work done by the external agent is 2 mJ. What is the potential difference V_B - V_A in Volts?",
    options: null,
    correct_answer: 200,
    explanation: "Work done W = q * (V_B - V_A).\nGiven W = 2 * 10^-3 J and q = 10 * 10^-6 C.\nSo, V_B - V_A = W / q = (2 * 10^-3) / (10 * 10^-6) = 200 V.",
    difficulty: "easy",
    marks_correct: 4,
    marks_wrong: 0
  },
  {
    id: "mock_jee_a1",
    exam: "jee_advanced",
    subject: "mathematics",
    chapters: ["Limits", "Calculus"],
    tags: ["L'Hopital Rule", "Trigonometric Limits"],
    repeatability_score: 7,
    importance_score: 5,
    year: 2023,
    question_type: "multiple_correct",
    question_text: "Let f(x) = (sin x) / x for x > 0. Which of the following statements is/are true?",
    options: [
      { id: "A", text: "f(x) is strictly decreasing on the interval (0, π/2)" },
      { id: "B", text: "The limit of f(x) as x approaches 0 is 1" },
      { id: "C", text: "f(x) has a local minimum in the interval (0, π)" },
      { id: "D", text: "f(x) < 1 for all x in (0, π/2)" }
    ],
    correct_answer: ["A", "B", "D"],
    explanation: "1) f'(x) = (x cos x - sin x) / x² = cos x (x - tan x) / x². Since x < tan x for x in (0, π/2), f'(x) < 0. Thus, f(x) is strictly decreasing on (0, π/2). (Option A correct)\n2) lim(x->0) sin(x)/x = 1. (Option B correct)\n3) Since f(x) is decreasing, sin(x)/x < 1. (Option D correct)",
    difficulty: "hard",
    marks_correct: 4,
    marks_wrong: -2,
    marks_partial: 1
  },
  {
    id: "mock_neet_b1",
    exam: "neet",
    subject: "biology",
    chapters: ["Genetics", "Mendelian Inheritance"],
    tags: ["Monohybrid Cross", "F2 Generation", "Phenotype"],
    repeatability_score: 10,
    importance_score: 5,
    year: 2024,
    question_type: "assertion_reasoning",
    question_text: "Assertion (A): In a monohybrid cross between tall and dwarf pea plants, all plants in F1 generation are tall.\nReason (R): Tallness is a dominant trait, while dwarfness is a recessive trait in pea plants.",
    options: [
      { id: "A", text: "Both (A) and (R) are true and (R) is the correct explanation of (A)" },
      { id: "B", text: "Both (A) and (R) are true but (R) is NOT the correct explanation of (A)" },
      { id: "C", text: "(A) is true but (R) is false" },
      { id: "D", text: "Both (A) and (R) are false" }
    ],
    correct_answer: ["A"],
    explanation: "F1 generation inherits one dominant allele (T) from the tall parent and one recessive allele (t) from the dwarf parent, resulting in heterozygous tall plants (Tt). The dominant trait (tallness) masks the recessive trait (dwarfness). Therefore, both statements are true and the reason correctly explains the assertion.",
    difficulty: "easy",
    marks_correct: 4,
    marks_wrong: -1
  },
  {
    id: "mock_neet_c1",
    exam: "neet",
    subject: "chemistry",
    chapters: ["Chemical Bonding", "Molecular Structure"],
    tags: ["VSEPR Theory", "Hybridization", "Noble Gas"],
    repeatability_score: 9,
    importance_score: 4,
    year: 2023,
    question_type: "single_correct",
    question_text: "Which of the following molecules has a square planar shape according to VSEPR theory?",
    options: [
      { id: "A", text: "SF4" },
      { id: "B", text: "BF3" },
      { id: "C", text: "XeF4" },
      { id: "D", text: "CCl4" }
    ],
    correct_answer: ["C"],
    explanation: "XeF4 has Xenon with 8 valence electrons, bonded to 4 Fluorines, leaving 2 lone pairs. Total steric number = 4 bond pairs + 2 lone pairs = 6 (octahedral geometry, square planar shape).",
    difficulty: "medium",
    marks_correct: 4,
    marks_wrong: -1
  }
];

// Helper to determine if we should fall back to mock data
async function shouldUseMock(exam: string, subject: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { count, error } = await supabase
      .from("pyq_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam", exam)
      .eq("subject", subject);
    if (error || count === 0) return true;
    return false;
  } catch {
    return true;
  }
}

// ───────── API Functions ─────────

/**
 * Fetches PYQ Questions for a specific exam and subject.
 * Integrates database fetching with a local high-fidelity mock fallback.
 */
export async function fetchPYQQuestions(
  exam: "jee_main" | "jee_advanced" | "neet",
  subject: "physics" | "chemistry" | "mathematics" | "biology"
): Promise<PYQQuestion[]> {
  const isMock = await shouldUseMock(exam, subject);
  
  if (isMock) {
    console.log(`[pyqService] Using mock seed questions for ${exam} - ${subject}`);
    return MOCK_QUESTIONS.filter((q) => q.exam === exam && q.subject === subject);
  }

  try {
    const { data, error } = await supabase!
      .from("pyq_questions")
      .select("*")
      .eq("exam", exam)
      .eq("subject", subject)
      .eq("is_active", true)
      .order("year", { ascending: false });

    if (error) throw error;
    return (data || []) as PYQQuestion[];
  } catch (err) {
    console.warn(`[pyqService] Fetch error, returning mock questions instead:`, err);
    return MOCK_QUESTIONS.filter((q) => q.exam === exam && q.subject === subject);
  }
}

/**
 * Saves a user's answer attempt for a PYQ question to Supabase.
 */
export async function savePYQAttempt(attempt: PYQAttempt, userId: string): Promise<void> {
  // If user is a guest, we only print to console or save to memory-cache if needed.
  // But standard progress table allows inserts for guest IDs as well.
  if (!supabase) {
    console.log("[pyqService] Saved attempt locally (Supabase not configured):", attempt);
    return;
  }

  try {
    const { error } = await supabase
      .from("pyq_progress")
      .upsert({
        user_id: userId,
        question_id: attempt.question_id,
        exam: attempt.exam,
        subject: attempt.subject,
        is_correct: attempt.is_correct,
        user_answer: attempt.user_answer,
        marks_obtained: attempt.marks_obtained,
        time_taken_ms: attempt.time_taken_ms,
        attempted_at: new Date().toISOString()
      }, {
        onConflict: "user_id,question_id"
      });

    if (error) throw error;
  } catch (err) {
    console.warn("[pyqService] Failed to save attempt to Supabase:", err);
  }
}

/**
 * Fetches counts of attempted questions vs total questions per subject for an exam.
 */
export async function fetchSubjectProgress(
  userId: string,
  exam: "jee_main" | "jee_advanced" | "neet"
): Promise<Record<string, { attempted: number; total: number }>> {
  const subjectsMap: Record<string, { attempted: number; total: number }> = {
    physics: { attempted: 0, total: 0 },
    chemistry: { attempted: 0, total: 0 },
    mathematics: { attempted: 0, total: 0 },
    biology: { attempted: 0, total: 0 }
  };

  // Determine total counts first
  const isMock = !supabase || (await (async () => {
    try {
      const { count } = await supabase!.from("pyq_questions").select("id", { count: "exact", head: true }).eq("exam", exam);
      return !count || count === 0;
    } catch {
      return true;
    }
  })());

  if (isMock) {
    // Accumulate total questions from Mock Data
    MOCK_QUESTIONS.forEach((q) => {
      if (q.exam === exam && subjectsMap[q.subject]) {
        subjectsMap[q.subject].total += 1;
      }
    });
  } else {
    try {
      const { data, error } = await supabase!
        .from("pyq_questions")
        .select("subject")
        .eq("exam", exam)
        .eq("is_active", true);

      if (!error && data) {
        data.forEach((row) => {
          if (subjectsMap[row.subject]) {
            subjectsMap[row.subject].total += 1;
          }
        });
      }
    } catch (err) {
      console.warn("[pyqService] Failed to query total counts from DB:", err);
    }
  }

  // Determine attempted counts
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pyq_progress")
        .select("subject")
        .eq("user_id", userId)
        .eq("exam", exam);

      if (!error && data) {
        data.forEach((row) => {
          if (subjectsMap[row.subject]) {
            subjectsMap[row.subject].attempted += 1;
          }
        });
      }
    } catch (err) {
      console.warn("[pyqService] Failed to query attempts from DB:", err);
    }
  }

  return subjectsMap;
}
