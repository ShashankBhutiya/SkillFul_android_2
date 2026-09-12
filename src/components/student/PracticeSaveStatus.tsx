import { useEffect, useState } from "react";
import { savePracticeAttempt } from "@/services/aiPracticeService";
import type { PracticeAnswer } from "@/types/aiPractice";

/** Mounted once per finished session; retries use the same attempt ID. */
export function PracticeSaveStatus({ setId, answers }: { setId: string; answers: PracticeAnswer[] }) {
  const [attemptId] = useState(() => crypto.randomUUID());
  // The classic quiz repeats missed cards. Store the first response to each
  // generated question so the graded attempt contains each question once.
  const [snapshot] = useState(() => answers.filter((answer, index) =>
    answers.findIndex((item) => item.questionId === answer.questionId) === index));
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("saving");
  useEffect(() => {
    if (!snapshot.length) { setStatus("empty"); return; }
    let cancelled = false;
    setStatus("saving");
    savePracticeAttempt(setId, snapshot, snapshot.filter((a) => a.correct).length, attemptId)
      .then(() => { if (!cancelled) setStatus("saved"); })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [setId, snapshot, attemptId, retry]);
  return <div role="status" className="relative z-20 border-b border-border bg-background px-4 py-3 text-center text-xs">
    {status === "saving" ? "Saving your practice result…" : status === "saved" ? "Practice result saved" : status === "empty" ? "No answers to save" :
      <>Your result hasn’t been saved. Keep this screen open and <button className="font-semibold underline" onClick={() => setRetry((n) => n + 1)}>retry</button>.</>}
  </div>;
}
