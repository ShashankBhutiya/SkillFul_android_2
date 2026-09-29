import { supabase } from "@/lib/supabase";
import type { PracticeLevel } from "@/types/aiPractice";
import type { InterviewPracticeSession } from "@/types/interviewPractice";

interface GenerateInterviewInput {
  jobDescription?: string;
  level?: PracticeLevel;
  sessionId?: string;
}

interface InterviewSessionRow {
  id: string;
  title: string;
  job_description: string;
  degree: string;
  academic_year: string;
  level: PracticeLevel;
  questions: InterviewPracticeSession["questions"];
  created_at: string;
  updated_at: string;
}

function mapSession(row: InterviewSessionRow): InterviewPracticeSession {
  return {
    id: row.id,
    title: row.title,
    jobDescription: row.job_description,
    degree: row.degree,
    academicYear: row.academic_year,
    level: row.level,
    questions: Array.isArray(row.questions) ? row.questions : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function errorMessage(error: unknown, fallback: string) {
  const candidate = error && typeof error === "object"
    ? error as { context?: unknown; message?: unknown }
    : null;
  if (candidate?.context instanceof Response) {
    try {
      const payload = await candidate.context.clone().json();
      return payload?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return typeof candidate?.message === "string" ? candidate.message : fallback;
}

export async function generateInterviewQuestions(input: GenerateInterviewInput): Promise<InterviewPracticeSession> {
  if (!supabase) throw new Error("Interview practice is not connected yet.");
  const { data, error } = await supabase.functions.invoke("generate-interview", { body: input });
  if (error || !data?.session) {
    throw new Error(await errorMessage(error, data?.error || "Could not generate interview questions."));
  }
  return data.session as InterviewPracticeSession;
}

export async function getInterviewHistory(): Promise<InterviewPracticeSession[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("interview_practice_sessions")
    .select("id,title,job_description,degree,academic_year,level,questions,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return ((data || []) as InterviewSessionRow[]).map(mapSession);
}
