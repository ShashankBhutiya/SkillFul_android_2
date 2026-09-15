import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  upsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({
  upsert: db.upsert,
  select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: async () => ({ data: db.row }) }) }) }),
}) } }));

beforeEach(() => {
  vi.resetModules(); localStorage.clear(); db.row = null; db.upsert.mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 14, 12));
});
afterEach(() => vi.useRealTimers());

describe("persisted practice streaks", () => {
  it("restores the server streak before concurrent practice answers advance it once", async () => {
    db.row = { current_streak: 6, longest_streak: 6, last_active_date: "2026-09-13", total_days: 6, freezes: 1 };
    const { checkIn } = await import("@/services/streakService");
    const results = await Promise.all([checkIn("learner"), checkIn("learner")]);
    expect(results.map(result => result.state.current)).toEqual([7, 7]);
    expect(results.filter(result => result.isNewDay)).toHaveLength(1);
    expect(db.upsert).toHaveBeenCalledTimes(1);
  });

  it("keeps accounts separate and counts the next local day once", async () => {
    const { checkIn, getStreak } = await import("@/services/streakService");
    await checkIn("learner-a");
    expect(getStreak("learner-b").current).toBe(0);
    await checkIn("learner-a");
    vi.setSystemTime(new Date(2026, 8, 15, 0, 1));
    const nextDay = await checkIn("learner-a");
    expect(nextDay.state.current).toBe(2);
    expect(nextDay.state.history).toEqual(["2026-09-14", "2026-09-15"]);
  });

  it("migrates the old practice counter without losing the streak", async () => {
    localStorage.setItem("skillful_daily_streak", JSON.stringify({ currentStreak: 4, lastPracticeDate: "2026-09-13" }));
    const { getStreak, checkIn } = await import("@/services/streakService");
    expect(getStreak("learner").current).toBe(4);
    expect(getStreak("another-learner").current).toBe(0);
    expect((await checkIn("learner")).state.current).toBe(5);
  });

  it("does not persist a projected freeze as practice before an answer", async () => {
    db.row = { current_streak: 6, longest_streak: 6, last_active_date: "2026-09-12", total_days: 6, freezes: 1 };
    const { pullStreakFromDB, checkIn } = await import("@/services/streakService");
    await pullStreakFromDB("learner");
    expect(JSON.parse(localStorage.getItem("skillful_streak:learner")!).lastActiveDate).toBe("2026-09-12");
    const result = await checkIn("learner");
    expect(result.freezesSpent).toBe(1);
    expect(result.state.current).toBe(7);
    expect(result.state.freezes).toBe(0);
  });
});
