import { supabase } from "@/lib/supabase";
import type { AIPracticeSet, PracticeAnswer, PracticeLevel } from "@/types/aiPractice";

const LOCAL_HISTORY_KEY = "skillful_ai_practice_history";

export interface GeneratePracticeInput {
  topic: string;
  level: PracticeLevel;
  degree: string;
  academicYear: string;
}

interface PracticeSetRow {
  id: string;
  title: string;
  topic: string;
  degree: string;
  academic_year: string;
  level: PracticeLevel;
  questions: AIPracticeSet["questions"];
  created_at: string;
}

function readLocalHistory(): AIPracticeSet[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cachePracticeSet(set: AIPracticeSet) {
  try {
    const next = [set, ...readLocalHistory().filter((item) => item.id !== set.id)].slice(0, 12);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not cache AI practice history", error);
  }
}

export async function generatePracticeSet(input: GeneratePracticeInput): Promise<AIPracticeSet> {
  if (!supabase) throw new Error("AI practice is not connected yet. Please configure Supabase first.");

  const { data, error } = await supabase.functions.invoke("generate-practice", {
    body: { ...input, questionCount: 5 },
  });
  if (error) {
    let message = error.message || "Could not generate this practice set.";
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // Keep the SDK message when the response has no JSON error body.
      }
    }
    throw new Error(message);
  }
  if (!data?.set?.questions?.length) throw new Error(data?.error || "The AI returned an empty practice set.");

  const set = data.set as AIPracticeSet;
  if (!set.questions.every((question) =>
    "statement" in question && typeof question.statement === "string" &&
    "answer" in question && typeof question.answer === "boolean" &&
    typeof question.explanation === "string"
  )) {
    throw new Error("The generator returned an older question format. Please try again shortly.");
  }
  cachePracticeSet(set);
  return set;
}

export async function getPracticeHistory(): Promise<AIPracticeSet[]> {
  const local = readLocalHistory();
  if (!supabase) return local;

  const { data, error } = await supabase
    .from("ai_question_sets")
    .select("id,title,topic,degree,academic_year,level,questions,created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return local;

  const remote: AIPracticeSet[] = ((data || []) as PracticeSetRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    degree: row.degree,
    academicYear: row.academic_year,
    level: row.level,
    questions: row.questions,
    createdAt: row.created_at,
  }));

  return [...remote, ...local.filter((item) => !remote.some((remoteItem) => remoteItem.id === item.id))].slice(0, 12);
}

export async function savePracticeAttempt(
  setId: string,
  answers: PracticeAnswer[],
  score: number,
  attemptId: string = crypto.randomUUID(),
) {
  if (!supabase) throw new Error("Practice storage is unavailable.");
  const { error } = await supabase.from("ai_practice_attempts").insert({
    id: attemptId,
    question_set_id: setId,
    answers,
    score,
    total_questions: answers.length,
  });
  if (error && error.code !== "23505") throw error;
}
