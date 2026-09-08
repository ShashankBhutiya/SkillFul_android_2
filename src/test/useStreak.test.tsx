import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreak } from "@/hooks/useStreak";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "practice-user", isGuest: false } }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: null }));
vi.mock("@/services/pushNotificationService", () => ({
  scheduleLocalNotification: vi.fn(),
  sendCrossPlatformNotification: vi.fn(),
  NotificationTemplates: {},
}));

describe("milestone practice streak", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("does not award a day when mounted or brought to the foreground", async () => {
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.streak.current).toBe(0);
    expect(result.current.checkedInToday).toBe(false);
    expect(localStorage.getItem("skillful_streak")).toBeNull();
  });

  it("counts a completed milestone once per day and updates other subscribers", async () => {
    const practice = renderHook(() => useStreak());
    const display = renderHook(() => useStreak());
    await act(async () => { await practice.result.current.recordMilestonePractice(); });
    expect(practice.result.current.streak.current).toBe(1);
    expect(display.result.current.checkedInToday).toBe(true);
    await act(async () => { await practice.result.current.recordMilestonePractice(); });
    expect(practice.result.current.streak.totalDays).toBe(1);
  });
});
