// Conservative reuse: preserve qualifiers and match the entire normalised topic.
// Do not substitute a broad category match for the student's actual request.
export function topicKey(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/\bdata structures? (?:and|&) algorithms?\b/g, "dsa")
    .replace(/\bdatabase management systems?\b/g, "dbms")
    .replace(/\bstructured query language\b/g, "sql")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ").trim().replace(/\s+/g, " ");
}

export async function questionKey(statement: string): Promise<string> {
  const normalised = statement.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalised));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface BankQuestion {
  id: string; statement: string; answer: boolean; explanation: string; concept: string;
  categoryId: string; classificationConfidence: number;
}

export function validateQuestions(input: unknown, count: number, categoryIds: readonly string[]): BankQuestion[] {
  if (!Array.isArray(input) || input.length !== count) throw new Error("Wrong question count");
  const statements = new Set<string>();
  return input.map((q) => {
    if (!q || typeof q.statement !== "string" || q.statement.trim().length < 8 ||
      typeof q.answer !== "boolean" || typeof q.explanation !== "string" || q.explanation.trim().length < 8 ||
      typeof q.concept !== "string" || !q.concept.trim()) throw new Error("Invalid question");
    const key = q.statement.trim().toLowerCase().replace(/\s+/g, " ");
    if (statements.has(key)) throw new Error("Duplicate question");
    statements.add(key);
    const confidence = typeof q.classificationConfidence === "number" ? q.classificationConfidence : 0;
    return { ...q, categoryId: confidence >= 0.85 && categoryIds.includes(q.categoryId) ? q.categoryId : "other",
      classificationConfidence: Math.max(0, Math.min(1, confidence)) };
  });
}
