import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DailyStreakPrompt from "@/components/streak/DailyStreakPrompt";
import { EMPTY_STREAK } from "@/services/streakService";

const state = vi.hoisted(() => ({ hydrated: true, loading: false, chosen: true, recordVisit: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "test-user" }, isLoading: state.loading }) }));
vi.mock("@/hooks/useUserMode", () => ({ useUserMode: () => ({ ready: true, hasChosen: state.chosen }) }));
vi.mock("@/hooks/useStreak", () => ({ useStreak: () => ({ streak: EMPTY_STREAK, checkedInToday: false, isHydrated: state.hydrated, recordVisit: state.recordVisit }) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));

const renderPrompt = (path = "/skills/ai") => render(
  <MemoryRouter initialEntries={[path]}><DailyStreakPrompt /><Link to="/info">Go to profile</Link></MemoryRouter>
);

afterEach(cleanup);
beforeEach(() => {
  state.hydrated = true; state.loading = false; state.chosen = true;
  state.recordVisit.mockClear();
});

describe("daily streak on app open", () => {
  it("opens over AI practice without awarding a day, and can be dismissed", async () => {
    renderPrompt();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(state.recordVisit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Let's practise" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: "Go to profile" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("waits for auth, onboarding, and streak hydration", () => {
    state.loading = true; state.chosen = false; state.hydrated = false;
    renderPrompt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not interrupt sign-in callbacks or public pages", () => {
    renderPrompt("/auth/callback");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows again on the next local day when the app resumes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 8, 14, 12));
      renderPrompt();
      fireEvent.click(await screen.findByRole("button", { name: "Let's practise" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      vi.setSystemTime(new Date(2026, 8, 15, 12));
      act(() => document.dispatchEvent(new Event("visibilitychange")));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});
