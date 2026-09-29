import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentAIPractice from "@/components/student/StudentAIPractice";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isLoading: false,
    user: {
      id: "student-1",
      isGuest: false,
      isPremium: true,
      hasInterviewAccess: true,
      degree: "B.Tech",
      academicYear: "3",
    },
  }),
}));

vi.mock("@/services/aiPracticeService", () => ({
  generatePracticeSet: vi.fn(),
  getPracticeHistory: vi.fn(() => new Promise(() => undefined)),
  hasUsedAIPracticeTrial: vi.fn(() => new Promise(() => undefined)),
}));

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/student/StudentInterviewPractice", () => ({
  default: ({ onSwitchToTopic }: { onSwitchToTopic: () => void }) => (
    <div>
      <p>Interview mode is active</p>
      <button type="button" onClick={onSwitchToTopic}>Return to topics</button>
    </div>
  ),
}));

describe("student AI practice modes", () => {
  beforeEach(() => window.history.replaceState({}, "", "/skills/ai"));

  it("switches between topic and job interview practice", async () => {
    render(<MemoryRouter><StudentAIPractice /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Job Interview" }));
    expect(screen.getByText("Interview mode is active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Return to topics" }));
    expect(screen.getByRole("button", { name: "Job Interview" })).toBeInTheDocument();
  });
});
