import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";
import { questionKey } from "../shared/practiceBank.ts";

type Level = "beginner" | "intermediate" | "advanced";
type QuestionType = "technical" | "behavioral" | "situational" | "role-specific";

interface InterviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  whyAsked: string;
  keyPoints: string[];
  answerFramework: string;
}

interface OpenAIResponseData {
  error?: { code?: string; type?: string; message?: string };
  incomplete_details?: { reason?: string };
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

class PublicError extends Error {
  constructor(public readonly publicMessage: string, public readonly status = 500) {
    super(publicMessage);
  }
}

const BATCH_SIZE = 5;
const MAX_JOB_DESCRIPTION_LENGTH = 6000;
const VALID_TYPES: QuestionType[] = ["technical", "behavioral", "situational", "role-specific"];

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 90 },
    questions: {
      type: "array",
      minItems: BATCH_SIZE,
      maxItems: BATCH_SIZE,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "type", "whyAsked", "keyPoints", "answerFramework"],
        properties: {
          question: { type: "string", minLength: 10, maxLength: 600 },
          type: { type: "string", enum: VALID_TYPES },
          whyAsked: { type: "string", minLength: 10, maxLength: 500 },
          keyPoints: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: { type: "string", minLength: 3, maxLength: 240 },
          },
          answerFramework: { type: "string", minLength: 10, maxLength: 1200 },
        },
      },
    },
  },
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function outputTextFrom(data: OpenAIResponseData) {
  return data.output_text || data.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
}

function validateQuestions(value: unknown): Omit<InterviewQuestion, "id">[] {
  if (!Array.isArray(value) || value.length !== BATCH_SIZE) throw new Error("Wrong question count");
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw.question !== "string" || raw.question.trim().length < 10 ||
      !VALID_TYPES.includes(raw.type) || typeof raw.whyAsked !== "string" || raw.whyAsked.trim().length < 10 ||
      !Array.isArray(raw.keyPoints) || raw.keyPoints.length < 2 || raw.keyPoints.length > 5 ||
      raw.keyPoints.some((point: unknown) => typeof point !== "string" || point.trim().length < 3) ||
      typeof raw.answerFramework !== "string" || raw.answerFramework.trim().length < 10) {
      throw new Error("Invalid interview question");
    }
    const duplicateKey = raw.question.trim().toLowerCase().replace(/\s+/g, " ");
    if (seen.has(duplicateKey)) throw new Error("Duplicate interview question");
    seen.add(duplicateKey);
    return {
      question: cleanText(raw.question, 600),
      type: raw.type as QuestionType,
      whyAsked: cleanText(raw.whyAsked, 500),
      keyPoints: raw.keyPoints.map((point: string) => cleanText(point, 240)),
      answerFramework: cleanText(raw.answerFramework, 1200),
    };
  });
}

async function generateBatch(openAIKey: string, input: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json() as OpenAIResponseData;
  if (!response.ok) {
    console.error("Interview generation failed", response.status, data.error?.code || data.error?.type);
    throw new PublicError("Interview question generation is temporarily unavailable.", 502);
  }
  const text = outputTextFrom(data);
  if (!text) throw new Error(`No output: ${data.incomplete_details?.reason || "missing_output"}`);
  const parsed = JSON.parse(text);
  return { title: cleanText(parsed.title, 90) || "Interview practice", questions: validateQuestions(parsed.questions) };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const reference = crypto.randomUUID().slice(0, 8);
  try {
    const authorization = request.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openAIKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceKey || !openAIKey) throw new PublicError("Interview practice is not configured.", 503);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new PublicError("Sign in to use interview practice.", 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
      admin.from("profiles")
        .select("degree,academic_year,subscription_status,subscription_period_end,subscription_tier")
        .eq("id", user.id).maybeSingle(),
      admin.from("institution_members").select("institution_id")
        .eq("user_id", user.id).eq("role", "student").maybeSingle(),
    ]);
    if (profileError || membershipError) throw profileError || membershipError;

    const periodEnd = profile?.subscription_period_end ? new Date(profile.subscription_period_end).getTime() : Number.POSITIVE_INFINITY;
    const paidAndCurrent = profile?.subscription_status === "active" && periodEnd > Date.now();
    const hasInterviewAccess = paidAndCurrent && (
      profile?.subscription_tier === "interview" || !membership
    );
    if (!hasInterviewAccess) {
      throw new PublicError("Interview Practice requires Interview Premium. Upgrade for ₹250/year, or ₹200 if your ₹50 plan is active.", 403);
    }

    const body = await request.json();
    const requestedSessionId = cleanText(body.sessionId, 80);
    let jobDescription = cleanText(body.jobDescription, MAX_JOB_DESCRIPTION_LENGTH);
    let level: Level = ["beginner", "intermediate", "advanced"].includes(body.level) ? body.level : "intermediate";
    let existing: InterviewQuestion[] = [];
    let sessionId = requestedSessionId;
    let createdAt = new Date().toISOString();
    let savedTitle = "Interview practice";

    if (sessionId) {
      const { data: session, error } = await admin.from("interview_practice_sessions")
        .select("id,title,job_description,level,questions,created_at")
        .eq("id", sessionId).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!session) throw new PublicError("This interview session could not be found.", 404);
      jobDescription = cleanText(session.job_description, MAX_JOB_DESCRIPTION_LENGTH);
      level = session.level as Level;
      existing = Array.isArray(session.questions) ? session.questions : [];
      createdAt = session.created_at;
      savedTitle = session.title;
    }

    if (jobDescription.length < 80) {
      throw new PublicError("Paste a fuller job description so the questions can be tailored to the role.", 400);
    }
    const degree = cleanText(profile?.degree, 80);
    const academicYear = cleanText(profile?.academic_year, 40);
    if (!degree || !academicYear) throw new PublicError("Add your degree and current year in Profile Settings first.", 422);

    const previousQuestions = existing.map((item) => item.question).filter(Boolean);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.4";
    const generated = await generateBatch(openAIKey, {
      model,
      store: false,
      safety_identifier: user.id,
      instructions: [
        "You are an expert interviewer creating high-probability interview questions from a supplied job description.",
        `Return exactly ${BATCH_SIZE} distinct questions. Use evidence from the responsibilities, required skills, tools, seniority, and domain in the description.`,
        "Balance technical, role-specific, behavioral, and situational questions according to the role. Do not claim these are the employer's exact questions.",
        "Make every question suitable to ask aloud in a real interview. Avoid trivia and generic filler when the description supports something specific.",
        "For whyAsked, explain the competency being tested. keyPoints must be concise answer ingredients. answerFramework must be an adaptable outline, not a fabricated personal story.",
        "Do not repeat or closely paraphrase any previous question supplied in the input.",
      ].join(" "),
      input: `Job description:\n${jobDescription}\n\nStudent programme: ${degree}\nAcademic year: ${academicYear}\nDifficulty: ${level}\nQuestions already used (${previousQuestions.length}): ${JSON.stringify(previousQuestions)}`,
      text: { format: { type: "json_schema", name: "interview_question_batch", strict: true, schema: responseSchema } },
      max_output_tokens: 7000,
    });

    const previousKeys = new Set(previousQuestions.map((question) => question.trim().toLowerCase().replace(/\s+/g, " ")));
    const nextQuestions: InterviewQuestion[] = [];
    for (const question of generated.questions) {
      const key = question.question.trim().toLowerCase().replace(/\s+/g, " ");
      if (previousKeys.has(key)) throw new PublicError("The generator repeated a question. Please continue again.", 502);
      nextQuestions.push({ ...question, id: await questionKey(question.question) });
    }
    const allQuestions = [...existing, ...nextQuestions];
    const now = new Date().toISOString();

    if (sessionId) {
      const { error } = await admin.from("interview_practice_sessions")
        .update({ questions: allQuestions, updated_at: now })
        .eq("id", sessionId).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { data: saved, error } = await admin.from("interview_practice_sessions").insert({
        user_id: user.id,
        title: generated.title,
        job_description: jobDescription,
        degree,
        academic_year: academicYear,
        level,
        questions: allQuestions,
        updated_at: now,
      }).select("id,created_at").single();
      if (error) throw error;
      sessionId = saved.id;
      createdAt = saved.created_at;
      savedTitle = generated.title;
    }

    return Response.json({
      session: {
        id: sessionId,
        title: savedTitle,
        jobDescription,
        degree,
        academicYear,
        level,
        questions: allQuestions,
        createdAt,
        updatedAt: now,
      },
      addedCount: nextQuestions.length,
    }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("generate-interview failed", { reference, error });
    const publicError = error instanceof PublicError
      ? error
      : new PublicError("We couldn't prepare interview questions right now. Please try again.");
    return Response.json(
      { error: publicError.publicMessage, reference },
      { status: publicError.status, headers: corsHeaders },
    );
  }
});
