import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";

type Level = "beginner" | "intermediate" | "advanced";

interface GenerateRequest {
  topic: string;
  degree: string;
  academicYear: string;
  level: Level;
  questionCount: number;
}

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 90 },
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "question", "options", "correctOption", "explanation", "concept"],
        properties: {
          id: { type: "string" },
          question: { type: "string", minLength: 8, maxLength: 500 },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string", minLength: 1, maxLength: 220 },
          },
          correctOption: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string", minLength: 8, maxLength: 700 },
          concept: { type: "string", minLength: 2, maxLength: 70 },
        },
      },
    },
  },
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openAIKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!openAIKey || !supabaseUrl || !anonKey || !serviceKey) throw new Error("AI practice secrets are not configured.");

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sign in to generate personalised questions." }, { status: 401, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceKey);
    const dailyLimit = Math.max(1, Number(Deno.env.get("AI_DAILY_GENERATION_LIMIT") || 20));
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: generatedToday, error: countError } = await admin
      .from("ai_question_sets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart.toISOString());
    if (countError) throw countError;
    if ((generatedToday || 0) >= dailyLimit) {
      return Response.json(
        { error: `You've reached today's limit of ${dailyLimit} generated sets. Your saved sets are still available to practise.` },
        { status: 429, headers: corsHeaders },
      );
    }

    const body = (await request.json()) as GenerateRequest;
    const topic = cleanText(body.topic, 240);
    const degree = cleanText(body.degree, 80);
    const academicYear = cleanText(body.academicYear, 40);
    const level: Level = ["beginner", "intermediate", "advanced"].includes(body.level) ? body.level : "intermediate";
    const questionCount = [5, 10, 15].includes(body.questionCount) ? body.questionCount : 10;
    if (topic.length < 2 || degree.length < 2 || academicYear.length < 2) {
      return Response.json({ error: "Topic, degree, and academic year are required." }, { status: 400, headers: corsHeaders });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5-mini",
        store: false,
        safety_identifier: user.id,
        instructions: [
          "You create rigorous, original multiple-choice practice questions for students.",
          "Return exactly the requested number of questions and exactly four plausible options per question, with one unambiguously correct answer.",
          "Match the student's programme, academic year, and requested challenge level. Test understanding and application, not trivia.",
          "Keep explanations concise, educational, and factually grounded. Avoid duplicated questions and repeated correct-option positions.",
          "If a request is unsafe, asks for cheating on an active assessment, or cannot responsibly be answered, create questions about the underlying safe educational concepts instead.",
        ].join(" "),
        input: `Create ${questionCount} questions about: ${topic}\nStudent programme: ${degree}\nAcademic year: ${academicYear}\nChallenge level: ${level}`,
        text: {
          format: {
            type: "json_schema",
            name: "student_practice_set",
            strict: true,
            schema: questionSchema,
          },
        },
        max_output_tokens: questionCount === 15 ? 7500 : 5000,
      }),
    });

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error("OpenAI response error", aiData?.error?.code, aiData?.error?.message);
      return Response.json({ error: "The question generator is busy. Please try again shortly." }, { status: 502, headers: corsHeaders });
    }

    const outputText = aiData.output_text || aiData.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("The AI response did not contain a practice set.");
    const generated = JSON.parse(outputText);
    if (!Array.isArray(generated.questions) || generated.questions.length !== questionCount) throw new Error("The AI returned the wrong number of questions.");

    const { data: saved, error: saveError } = await admin.from("ai_question_sets").insert({
      user_id: user.id,
      title: generated.title,
      topic,
      degree,
      academic_year: academicYear,
      level,
      question_count: questionCount,
      questions: generated.questions,
      model: aiData.model || Deno.env.get("OPENAI_MODEL") || "gpt-5-mini",
    }).select("id,created_at").single();
    if (saveError) throw saveError;

    return Response.json({
      set: {
        id: saved.id,
        title: generated.title,
        topic,
        degree,
        academicYear,
        level,
        questions: generated.questions,
        createdAt: saved.created_at,
      },
    }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("generate-practice failed", error);
    return Response.json({ error: "Could not generate questions. Please try again." }, { status: 500, headers: corsHeaders });
  }
});
