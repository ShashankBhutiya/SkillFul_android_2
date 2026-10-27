import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/pages/OnboardingPage";
import { emptyOnboarding, ONBOARDING_DRAFT_KEY, ONBOARDING_KEY, writeOnboardingDraft } from "@/config/onboarding";

const mocks = vi.hoisted(() => ({
  user: { id: "guest", isGuest: true, email: "", userMode: "student" },
  signUp: vi.fn(), signIn: vi.fn(), signInWithGoogle: vi.fn(), refreshProfile: vi.fn(),
  setMode: vi.fn(), updateUser: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ...mocks, isLoading: false }),
  withTimeout: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/hooks/useUserMode", () => ({ useUserMode: () => ({ setMode: mocks.setMode }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {
  auth: { updateUser: mocks.updateUser },
  from: () => ({ update: mocks.update }),
} }));

function App() {
  return <MemoryRouter initialEntries={["/onboarding"]}><Routes><Route path="/onboarding" element={<OnboardingPage />} /><Route path="/skills" element={<p>Practice dashboard</p>} /></Routes></MemoryRouter>;
}
function seedPending(email = "learner@example.com") {
  writeOnboardingDraft({ details: { ...emptyOnboarding, fullName: "Test Learner", degree: "Computer Science", academicYear: "2nd year", institution: "Test College", graduationYear: "2028" }, pendingAuth: true, email });
}
describe("Figma onboarding flow", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    mocks.user = { id: "guest", isGuest: true, email: "", userMode: "student" };
    mocks.signUp.mockResolvedValue({ session: null });
    mocks.signInWithGoogle.mockResolvedValue({});
    mocks.refreshProfile.mockResolvedValue(undefined);
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
  });

  it("branches between student and professional screens without losing entered fields", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Degree / Course"), { target: { value: "Computer Science" } });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    fireEvent.click(screen.getByRole("button", { name: /I'm a Professional/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Current Job Title")).toBeInTheDocument();
    expect(screen.queryByLabelText("Degree / Course")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    fireEvent.click(screen.getByRole("button", { name: /I'm a Student/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Degree / Course")).toHaveValue("Computer Science");
  });

  it("keeps email confirmation on the auth screen and retains the pending profile", async () => {
    seedPending(); render(<App />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(screen.queryByText("You're All Set!")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY)!).pendingAuth).toBe(true);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("restores an authenticated pending draft, persists it, then completes onboarding", async () => {
    seedPending(); mocks.user = { id: "user-1", isGuest: false, email: "learner@example.com", userMode: "student" };
    render(<App />);
    await screen.findByText("You're All Set!");
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { onboarding: expect.objectContaining({ degree: "Computer Science", graduationYear: "2028", institution: "Test College" }) } });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Test", last_name: "Learner", academic_year: "2nd year" }));
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(await screen.findByText("Practice dashboard")).toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe("complete");
    expect(mocks.setMode).toHaveBeenCalledWith("student");
  });

  it("does not write a pending draft to a different account", async () => {
    seedPending(); mocks.user = { id: "other", isGuest: false, email: "someone-else@example.com", userMode: "student" };
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("another account");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(screen.queryByText("You're All Set!")).not.toBeInTheDocument();
  });

  it("preserves a failed save for retry and only completes after the retry succeeds", async () => {
    seedPending(); mocks.user = { id: "user-1", isGuest: false, email: "learner@example.com", userMode: "student" };
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("profile is not ready");
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving details" }));
    await screen.findByText("You're All Set!");
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("retains the draft and exposes Google errors without declaring completion", async () => {
    seedPending(); mocks.signInWithGoogle.mockResolvedValue({ error: "Google sign-in timed out" });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("timed out"));
    expect(JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY)!).pendingAuth).toBe(true);
    expect(screen.queryByText("You're All Set!")).not.toBeInTheDocument();
  });
});
