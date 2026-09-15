import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AIPracticeQuiz from "@/components/student/AIPracticeQuiz";
import QuizGame from "@/components/QuizGame";
import type { AIPracticeSet } from "@/types/aiPractice";

const practice = vi.hoisted(() => ({ recordVisit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/hooks/useStreak", () => ({ useStreak: () => practice }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "guest_test", isGuest: true } }) }));
vi.mock("@/components/SwipeCard", () => ({ default: ({ onSwipe }: { onSwipe: (direction: string) => void }) => <button onClick={() => onSwipe("left")}>Answer false</button> }));
vi.mock("@/utils/analytics", () => ({ trackSwipe: vi.fn(), trackQuizComplete: vi.fn(), trackLoginGate: vi.fn() }));
vi.mock("@/hooks/useSounds", () => ({ getSoundsEnabled: () => false, playCorrect: vi.fn(), playWrong: vi.fn(), playCombo: vi.fn(), setSoundsEnabled: vi.fn() }));
vi.mock("@/hooks/useHaptics", () => ({ hapticSuccess: vi.fn(), hapticError: vi.fn(), hapticCelebration: vi.fn() }));
vi.mock("@/components/AuthModal", () => ({ default: () => null }));
vi.mock("@/components/student/PracticeSaveStatus", () => ({ PracticeSaveStatus: () => null }));

const makeSet = (questions: unknown[]) => ({ id: "set-1", title: "Practice", topic: "Science", level: "beginner", questions }) as AIPracticeSet;
afterEach(cleanup);
beforeEach(() => { localStorage.clear(); practice.recordVisit.mockClear(); });

describe("practice counts towards the daily streak", () => {
  it("counts an incorrect multiple-choice AI answer before completing the set", () => {
    render(<AIPracticeQuiz set={makeSet([{ id: "q1", question: "Choose one", options: ["Wrong", "Right"], correctOption: 1, concept: "Test", explanation: "Explanation" }])} onExit={vi.fn()} onNewSet={vi.fn()} />);
    expect(practice.recordVisit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Wrong/ }));
    expect(practice.recordVisit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Exit practice" }));
    expect(practice.recordVisit).toHaveBeenCalledTimes(1);
  });

  it("counts an incorrect swipe in a generated AI set", () => {
    render(<QuizGame categoryId="practice-set-1" difficulty="easy" generatedSet={makeSet([{ statement: "True statement", answer: true, explanation: "Explanation" }])} onBack={vi.fn()} onHome={vi.fn()} onSwitchDifficulty={vi.fn()} />);
    expect(practice.recordVisit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Answer false" }));
    expect(practice.recordVisit).toHaveBeenCalledTimes(1);
  });
});
