import { describe, expect, it } from "vitest";
import { topicKey, questionKey, validateQuestions } from "../../supabase/functions/shared/practiceBank";

describe("AI question reuse and mapping", () => {
  it("matches common topic spelling while preserving important qualifiers", () => {
    expect(topicKey("Database Management System: SQL Joins"))
      .toBe(topicKey("DBMS SQL joins"));
    expect(topicKey("DBMS joins")).not.toBe(topicKey("DBMS indexing"));
  });

  it("uses a stable question identity across saved sets", async () => {
    expect(await questionKey("  A binary tree has nodes.  "))
      .toBe(await questionKey("a binary tree has nodes."));
  });

  it("leaves uncertain or unrelated questions outside placement categories", () => {
    const candidate = { id: "a", statement: "A cell contains mitochondria.", answer: true,
      explanation: "Mitochondria are organelles.", concept: "Cell biology",
      categoryId: "dsa_fundamentals", classificationConfidence: 0.4 };
    expect(validateQuestions([candidate], 1, ["dsa_fundamentals"])[0].categoryId).toBe("other");
    expect(validateQuestions([{ ...candidate, classificationConfidence: 0.95 }], 1,
      ["dsa_fundamentals"])[0].categoryId).toBe("dsa_fundamentals");
  });
});
