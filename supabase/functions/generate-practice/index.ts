import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";
import { generationDailyLimit } from "../shared/aiGenerationLimits.ts";

import { topicKey, questionKey, validateQuestions, type BankQuestion } from "../shared/practiceBank.ts";
import { PRACTICE_CATEGORIES } from "../shared/practiceCategories.ts";

type Level = "beginner" | "intermediate" | "advanced";

interface GenerateRequest {
  topic: string;
  level: Level;
}

interface OpenAIResponseData {
  error?: { code?: string; type?: string; message?: string };
  incomplete_details?: { reason?: string };
  model?: string;
  output_text?: string;
  status?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

class PublicGenerationError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly status = 500,
    public readonly code = "generation_failed",
  ) {
    super(publicMessage);
    this.name = "PublicGenerationError";
  }
}

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 90 },
    questions: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "statement", "answer", "explanation", "concept", "categoryId", "classificationConfidence"],
        properties: {
          id: { type: "string" },
          statement: { type: "string", minLength: 8, maxLength: 500 },
          answer: { type: "boolean" },
          explanation: { type: "string", minLength: 8, maxLength: 700 },
          concept: { type: "string", minLength: 2, maxLength: 70 },
          categoryId: { type: "string", enum: [...Object.keys(PRACTICE_CATEGORIES), "other"] },
          classificationConfidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function callOpenAI(openAIKey: string, body: Record<string, unknown>) {
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let data: OpenAIResponseData;
    try {
      data = JSON.parse(raw) as OpenAIResponseData;
    } catch {
      console.error("OpenAI returned a non-JSON response", response.status, raw.slice(0, 200));
      throw new PublicGenerationError(
        "The AI service returned an invalid response. Please try again.",
        502,
        "invalid_ai_response",
      );
    }
    return { response, data };
  } catch (error) {
    if (error instanceof PublicGenerationError) throw error;
    console.error("OpenAI request failed", error);
    throw new PublicGenerationError(
      "The AI service is temporarily unreachable. Please try again shortly.",
      503,
      "ai_service_unavailable",
    );
  }
}

function outputTextFrom(data: OpenAIResponseData) {
  return data.output_text || data.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
}

function publicOpenAIError(status: number, data: OpenAIResponseData) {
  const errorCode = String(data?.error?.code || data?.error?.type || "unknown");
  console.error("OpenAI response error", status, errorCode, data?.error?.message);

  let publicMessage = "The question generator is busy. Please try again shortly.";
  if (["invalid_api_key", "authentication_error"].includes(errorCode) || status === 401) {
    publicMessage = "The AI service key was rejected. Please ask the administrator to update it.";
  } else if (["insufficient_quota", "billing_not_active", "billing_hard_limit_reached"].includes(errorCode) || status === 429) {
    publicMessage = "The AI service has no available quota. Please ask the administrator to check API billing.";
  } else if (["model_not_found", "invalid_model"].includes(errorCode)) {
    publicMessage = "The configured AI model is unavailable. Please ask the administrator to change it.";
  } else if (status === 400) {
    publicMessage = `The AI service rejected this request (${errorCode}).`;
  }
  return publicMessage;
}

function parsePracticeSet(data: OpenAIResponseData, count: number) {
  const outputText = outputTextFrom(data);
  if (!outputText) {
    const reason = data?.incomplete_details?.reason || data?.status || "missing_output";
    console.error("OpenAI response contained no output text", reason);
    throw new Error(`No output text (${reason})`);
  }
  const parsed = JSON.parse(outputText);
  return {
    title: cleanText(parsed.title, 90) || "Practice set",
    questions: validateQuestions(parsed.questions, count, Object.keys(PRACTICE_CATEGORIES)),
  };
}

async function requestPracticeSet(openAIKey: string, body: Record<string, unknown>, count: number) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { response, data } = await callOpenAI(openAIKey, body);
    if (!response.ok) {
      throw new PublicGenerationError(publicOpenAIError(response.status, data), 502, "ai_service_error");
    }
    try {
      return { data, set: parsePracticeSet(data, count) };
    } catch (error) {
      console.warn("Invalid structured practice response", { attempt, error });
    }
  }
  throw new PublicGenerationError(
    "The AI could not produce a valid practice set. Please try a more specific topic.",
    502,
    "invalid_ai_response",
  );
}

function attemptedQuestionIds(answers: unknown): string[] {
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((answer) =>
    answer && typeof answer.questionId === "string" ? [answer.questionId] : []);
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  let stage = "starting";
  const reference = crypto.randomUUID().slice(0, 8);
  let cleanupSupabaseUrl = "";
  let cleanupServiceKey = "";
  let trialReservationUserId: string | null = null;
  try {
    stage = "configuration";
    const authorization = request.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openAIKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("AI practice secrets are not configured.");
    cleanupSupabaseUrl = supabaseUrl;
    cleanupServiceKey = serviceKey;

    stage = "authentication";
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sign in to generate personalised questions." }, { status: 401, headers: corsHeaders });

    stage = "profile";
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("degree,academic_year,subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const degree = cleanText(profile?.degree, 80);
    const academicYear = cleanText(profile?.academic_year, 40);
    if (!degree || !academicYear) {
      return Response.json({ error: "Add your degree and current year in Profile Settings before generating questions." }, { status: 422, headers: corsHeaders });
    }
    const body = (await request.json()) as GenerateRequest;
    const topic = cleanText(body.topic, 240);
    const level: Level = ["beginner", "intermediate", "advanced"].includes(body.level) ? body.level : "intermediate";
    const questionCount = 10;
    if (topic.length < 2) {
      return Response.json({ error: "Enter a topic to practise." }, { status: 400, headers: corsHeaders });
    }

    const isPremium = profile?.subscription_status === "active";
    if (!isPremium) {
      stage = "trial access";
      const { data: trial, error: trialError } = await admin.rpc("reserve_student_ai_trial", {
        p_user_id: user.id,
      });
      if (trialError || typeof trial?.allowed !== "boolean") {
        console.error("Student AI trial reservation failed", { reference, error: trialError });
        throw new PublicGenerationError(
          "AI trial access is temporarily unavailable. Please try again shortly.",
          503,
          "trial_service_unavailable",
        );
      }
      if (!trial.allowed) {
        return Response.json({
          error: "Your free AI practice set has been used. Upgrade to Premium to generate more sets.",
          code: "premium_required",
        }, { status: 403, headers: corsHeaders });
      }
      trialReservationUserId = user.id;
    }

    stage = "practice history";
    const contextKey = [topicKey(degree), topicKey(academicYear), level].join("|");
    const requestTopicKey = topicKey(topic);
    const { data: attemptRows, error: attemptsError } = await admin.from("ai_practice_attempts")
      .select("answers,ai_question_sets!inner(topic,degree,academic_year,level,questions)")
      .eq("user_id", user.id)
      .eq("ai_question_sets.degree", degree)
      .eq("ai_question_sets.academic_year", academicYear)
      .eq("ai_question_sets.level", level)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (attemptsError) throw attemptsError;
    const practicedQuestionIds = new Set<string>();
    const practicedStatements: string[] = [];
    for (const row of attemptRows || []) {
      const rowQuestionIds = new Set(attemptedQuestionIds(row.answers));
      const set = Array.isArray(row.ai_question_sets) ? row.ai_question_sets[0] : row.ai_question_sets;
      if (topicKey(cleanText(set?.topic, 240)) !== requestTopicKey) continue;
      for (const questionId of rowQuestionIds) practicedQuestionIds.add(questionId);
      if (!Array.isArray(set?.questions)) continue;
      for (const question of set.questions) {
        if (!question || typeof question.id !== "string" || !rowQuestionIds.has(question.id) ||
          typeof question.statement !== "string") continue;
        if (!practicedStatements.includes(question.statement)) practicedStatements.push(question.statement);
      }
    }
    stage = "question bank";
    const { data: existingBank, error: bankProbeError } = await admin.from("ai_question_bank")
      .select("id").eq("context_key", contextKey)
      .eq("topic_key", requestTopicKey).limit(1);
    if (bankProbeError) throw bankProbeError;
    if (!existingBank?.length) {
    // Seed the new bank from this student's existing true/false sets once.
    // Legacy multiple-choice sets are not mixed into this quiz format.
    const { data: priorSets, error: priorError } = await admin.from("ai_question_sets")
      .select("topic,questions,model")
      .eq("user_id", user.id).eq("degree", degree).eq("academic_year", academicYear)
      .eq("level", level).order("created_at", { ascending: false }).limit(100);
    if (priorError) throw priorError;
    const seeded: { user_id: string; context_key: string; topic_key: string; question_key: string; question: BankQuestion; model: string }[] = [];
    for (const set of priorSets || []) {
      if (topicKey(set.topic) !== requestTopicKey || !Array.isArray(set.questions)) continue;
      for (const raw of set.questions) {
        if (!raw || typeof raw.statement !== "string") continue;
        try {
          const [question] = validateQuestions([raw], 1, Object.keys(PRACTICE_CATEGORIES));
          question.id = await questionKey(question.statement);
          if (!seeded.some((row) => row.question_key === question.id)) seeded.push({
            user_id: user.id, context_key: contextKey, topic_key: requestTopicKey,
            question_key: question.id, question, model: set.model || "historical",
          });
        } catch { /* Only valid statements enter the bank. */ }
      }
    }
    if (seeded.length) {
      const { error: seedError } = await admin.from("ai_question_bank").upsert(seeded,
        { onConflict: "user_id,context_key,topic_key,question_key", ignoreDuplicates: true });
      if (seedError) throw seedError;
    }
    }
    const { data: bankRows, error: bankError } = await admin.from("ai_question_bank")
      .select("question_key,question,last_served_at")
      .eq("context_key", contextKey).eq("topic_key", requestTopicKey)
      .eq("disabled", false).order("last_served_at", { ascending: true, nullsFirst: true }).limit(50);
    if (bankError) throw bankError;
    const reused: BankQuestion[] = [];
    for (const row of bankRows || []) {
      try {
        if (typeof row.question_key === "string" && practicedQuestionIds.has(row.question_key)) continue;
        const [q] = validateQuestions([row.question], 1, Object.keys(PRACTICE_CATEGORIES));
        if (typeof q.id === "string" && practicedQuestionIds.has(q.id)) continue;
        if (typeof q.id === "string" && !reused.some((item) => item.id === q.id)) reused.push(q);
      } catch { /* Skip obsolete or malformed stored content. */ }
      if (reused.length === questionCount) break;
    }
    const missingCount = questionCount - reused.length;
    let generated: { title: string; questions: BankQuestion[] } = { title: "Practice set", questions: [] };
    let model = "question-bank";
    if (missingCount > 0) {
    if (!openAIKey) {
      throw new PublicGenerationError(
        "AI practice is temporarily unavailable. Please try again later.",
        503,
        "service_unavailable",
      );
    }
    if (isPremium) {
      stage = "generation quota";
      const { data: streak, error: streakError } = await admin
        .from("user_streaks")
        .select("current_streak,last_active_date,freezes")
        .eq("user_id", user.id)
        .maybeSingle();
      // Streak bonuses are optional. Schema drift or a temporary streak read
      // failure must not block the base generation allowance.
      if (streakError) console.warn("Streak bonus unavailable; using base quota", {
        reference, code: streakError.code,
      });
      const dailyLimit = generationDailyLimit(Deno.env.get("AI_DAILY_GENERATION_LIMIT"), streakError ? null : streak);
      const { data: quota, error: quotaError } = await admin.rpc("reserve_ai_generation", {
        p_user_id: user.id,
        // Reservations count whole ten-question sets, so never round up the quota.
        p_daily_limit: Math.floor(dailyLimit / questionCount),
      });
      if (quotaError || typeof quota?.allowed !== "boolean") {
        console.error("Generation quota reservation failed", { reference, error: quotaError });
        throw new PublicGenerationError(
          "Question generation is temporarily unavailable. Your daily allowance was not used; please try again shortly.",
          503,
          "quota_service_unavailable",
        );
      }
      if (!quota.allowed) {
        return Response.json({
          error: quota.reason === "daily_quota"
            ? `You don't have enough of today's ${dailyLimit}-question quota left for another ten-question set. It resets at 00:00 UTC (5:30 AM IST). You can still practise saved sets.`
            : `Please wait ${quota.retryAfter} seconds before generating another set.`,
          retryAfter: quota.retryAfter,
          code: quota.reason,
        }, { status: 429, headers: { ...corsHeaders, "Retry-After": String(quota.retryAfter) } });
      }
    }

    stage = "question generation";
    const generationModel = Deno.env.get("OPENAI_MODEL") || "gpt-5.4";
    const reviewModel = Deno.env.get("OPENAI_REVIEW_MODEL") || "gpt-5.4";
    const { data: aiData, set: candidate } = await requestPracticeSet(openAIKey, {
        model: generationModel,
        store: false,
        safety_identifier: user.id,
        instructions: [
          "You create rigorous, original true-or-false practice statements for students.",
          `Return exactly ${missingCount} independently verifiable statements. Set answer to the factual truth value of each statement.`,
          "Where at least two questions are requested, include a meaningful mix of true and false answers. False statements must have a clear, unambiguous error; avoid trick wording and subjective claims.",
          "Match the student's programme, academic year, and requested challenge level. Test understanding and application, not trivia.",
          "Classify each question by its actual content using the supplied categories. Use other when no category clearly fits; confidence is your estimated confidence in that mapping. Never force unrelated academic subjects into placement categories.",
          `Categories: ${JSON.stringify(PRACTICE_CATEGORIES)}`,
          "Keep explanations concise, educational, and factually grounded. Avoid duplicated statements. Never invent facts or citations.",
          "If a request is unsafe, asks for cheating on an active assessment, or cannot responsibly be answered, create questions about the underlying safe educational concepts instead.",
        ].join(" "),
        input: `Create ${missingCount} questions about: ${topic}\nStudent programme: ${degree}\nAcademic year: ${academicYear}\nChallenge level: ${level}\nDo not repeat these stored or already practised statements: ${JSON.stringify([...reused.map((q) => q.statement), ...practicedStatements])}`,
        text: {
          format: {
            type: "json_schema",
            name: "student_practice_set",
            strict: true,
            schema: { ...questionSchema, properties: { ...questionSchema.properties, questions: { ...questionSchema.properties.questions, minItems: missingCount, maxItems: missingCount } } },
          },
        },
        max_output_tokens: 7000,
      }, missingCount);

    stage = "quality review";
    let reviewed = candidate;
    let reviewData: OpenAIResponseData | null = null;
    try {
      const reviewResult = await requestPracticeSet(openAIKey, {
      model: reviewModel,
      store: false,
      safety_identifier: user.id,
      instructions: [
        "You are the quality-review module for student true-or-false practice questions.",
        "Review every generated question for factual correctness, unambiguous truth value, age/programme suitability, topic relevance, duplicate meaning, and explanation quality.",
        "Return exactly the requested count in the same JSON schema. Prefer preserving good questions. Rewrite only when needed to fix correctness, ambiguity, topic fit, classification, or explanation clarity.",
        "Keep questions independently verifiable. Do not add citations. Avoid subjective claims, trick wording, and duplicated concepts.",
        `Categories: ${JSON.stringify(PRACTICE_CATEGORIES)}`,
      ].join(" "),
      input: `Review and return ${missingCount} approved questions for this context.\nTopic: ${topic}\nStudent programme: ${degree}\nAcademic year: ${academicYear}\nChallenge level: ${level}\nExisting stored or already practised statements to avoid: ${JSON.stringify([...reused.map((q) => q.statement), ...practicedStatements])}\nGenerated draft: ${JSON.stringify(candidate)}`,
      text: {
        format: {
          type: "json_schema",
          name: "reviewed_student_practice_set",
          strict: true,
          schema: { ...questionSchema, properties: { ...questionSchema.properties, questions: { ...questionSchema.properties.questions, minItems: missingCount, maxItems: missingCount } } },
        },
      },
      max_output_tokens: 7000,
      }, missingCount);
      reviewed = reviewResult.set;
      reviewData = reviewResult.data;
    } catch (error) {
      // The first pass is already schema-validated. Review improves quality but
      // should not make the whole feature unavailable during a transient outage.
      console.warn("Practice quality review unavailable; using validated draft", { reference, error });
    }
    generated = reviewed;
    model = reviewData
      ? `generator:${aiData.model || generationModel};reviewer:${reviewData.model || reviewModel}`
      : `generator:${aiData.model || generationModel};reviewer:unavailable`;
    for (const question of generated.questions) question.id = await questionKey(question.statement);
    } // Cache hits never reserve generation quota or call the model.

    stage = "saving questions";
    const questions = [...reused, ...generated.questions];
    if (new Set(questions.map((q) => q.id)).size !== questionCount) throw new Error("Duplicate generated questions");
    if (generated.questions.length > 0) {
      const { error: bankSaveError } = await admin.from("ai_question_bank").upsert(generated.questions.map((question) => ({
        user_id: user.id, context_key: contextKey, topic_key: requestTopicKey,
        question_key: question.id, question, model,
      })), { onConflict: "user_id,context_key,topic_key,question_key" });
      if (bankSaveError) throw bankSaveError;
    }

    const { data: saved, error: saveError } = await admin.from("ai_question_sets").insert({
      user_id: user.id,
      title: generated.title,
      topic,
      degree,
      academic_year: academicYear,
      level,
      question_count: questionCount,
      questions,
      model,
      reused_count: reused.length,
    }).select("id,created_at").single();
    if (saveError) throw saveError;
    trialReservationUserId = null;

    // Rotation is best effort; the saved set is already durable.
    const { error: rotationError } = await admin.from("ai_question_bank").update({ last_served_at: new Date().toISOString() })
      .eq("context_key", contextKey).eq("topic_key", requestTopicKey)
      .in("question_key", questions.map((q) => q.id));
    if (rotationError) console.warn("Question bank rotation failed", rotationError.code);

    return Response.json({
      reusedCount: reused.length,
      set: {
        id: saved.id,
        title: generated.title,
        topic,
        degree,
        academicYear,
        level,
        questions,
        createdAt: saved.created_at,
      },
    }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    if (trialReservationUserId && cleanupSupabaseUrl && cleanupServiceKey) {
      const cleanupAdmin = createClient(cleanupSupabaseUrl, cleanupServiceKey);
      const { error: cleanupError } = await cleanupAdmin
        .from("student_ai_trial_reservations")
        .delete()
        .eq("user_id", trialReservationUserId);
      if (cleanupError) console.error("Could not release failed AI trial reservation", {
        reference, error: cleanupError,
      });
    }
    console.error("generate-practice failed", { reference, stage, error });
    const publicError = error instanceof PublicGenerationError
      ? error
      : new PublicGenerationError("We couldn't prepare your questions right now. Please try again.");
    return Response.json(
      { error: publicError.publicMessage, code: publicError.code, reference },
      { status: publicError.status, headers: corsHeaders },
    );
  }
});
