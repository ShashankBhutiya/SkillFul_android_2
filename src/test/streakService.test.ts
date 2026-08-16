import { describe, expect, it } from "vitest";
import {
  DAYS_PER_EARNED_FREEZE,
  EMPTY_STREAK,
  MAX_FREEZES,
  computeCheckIn,
  daysBetween,
  projectStreak,
  type StreakState,
} from "@/services/streakService";

/** Build a streak state with sensible defaults. */
function makeStreak(overrides: Partial<StreakState> = {}): StreakState {
  return { ...EMPTY_STREAK, ...overrides };
}

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween("2026-08-10", "2026-08-13")).toBe(3);
  });

  it("returns 0 for the same day", () => {
    expect(daysBetween("2026-08-10", "2026-08-10")).toBe(0);
  });

  it("goes negative when the second date is earlier", () => {
    expect(daysBetween("2026-08-13", "2026-08-10")).toBe(-3);
  });

  it("crosses month and year boundaries", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("handles a leap day", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("computeCheckIn", () => {
  it("starts a streak at 1 from nothing", () => {
    const result = computeCheckIn(makeStreak(), "2026-08-10");

    expect(result.state.current).toBe(1);
    expect(result.state.longest).toBe(1);
    expect(result.isNewDay).toBe(true);
    expect(result.state.totalDays).toBe(1);
  });

  it("is idempotent within the same day", () => {
    const first = computeCheckIn(makeStreak(), "2026-08-10");
    const second = computeCheckIn(first.state, "2026-08-10");

    expect(second.isNewDay).toBe(false);
    expect(second.state.current).toBe(1);
    expect(second.state.totalDays).toBe(1);
    expect(second.state).toEqual(first.state);
  });

  it("increments on consecutive days", () => {
    const state = makeStreak({ current: 4, longest: 4, lastActiveDate: "2026-08-09" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(5);
    expect(result.streakBroken).toBe(false);
  });

  it("tracks the longest streak without lowering it", () => {
    const state = makeStreak({ current: 2, longest: 9, lastActiveDate: "2026-08-09" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(3);
    expect(result.state.longest).toBe(9);
  });

  it("resets to 1 when a day is missed with no freezes", () => {
    const state = makeStreak({ current: 12, longest: 12, lastActiveDate: "2026-08-08" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(1);
    expect(result.streakBroken).toBe(true);
    expect(result.state.longest).toBe(12);
  });

  it("spends one freeze to cover a single missed day", () => {
    const state = makeStreak({
      current: 12,
      longest: 12,
      lastActiveDate: "2026-08-08",
      freezes: 2,
    });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(13);
    expect(result.freezesSpent).toBe(1);
    expect(result.state.freezes).toBe(1);
    expect(result.streakBroken).toBe(false);
    expect(result.state.freezesUsed).toContain("2026-08-09");
  });

  it("spends multiple freezes across a multi-day gap", () => {
    const state = makeStreak({
      current: 20,
      longest: 20,
      lastActiveDate: "2026-08-06",
      freezes: 3,
    });
    // Missed the 7th, 8th and 9th — three freezes cover exactly.
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.freezesSpent).toBe(3);
    expect(result.state.current).toBe(21);
    expect(result.state.freezes).toBe(0);
    expect(result.state.freezesUsed).toEqual(
      expect.arrayContaining(["2026-08-07", "2026-08-08", "2026-08-09"])
    );
  });

  it("breaks the streak when the gap exceeds available freezes", () => {
    const state = makeStreak({
      current: 20,
      longest: 20,
      lastActiveDate: "2026-08-05",
      freezes: 2,
    });
    // Four days missed, only two freezes banked.
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.streakBroken).toBe(true);
    expect(result.state.current).toBe(1);
    // Banked freezes are kept rather than burned on a lost streak.
    expect(result.state.freezes).toBe(2);
  });

  it("earns a freeze on the earning boundary", () => {
    const state = makeStreak({
      current: DAYS_PER_EARNED_FREEZE - 1,
      longest: DAYS_PER_EARNED_FREEZE - 1,
      lastActiveDate: "2026-08-09",
      freezes: 0,
    });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(DAYS_PER_EARNED_FREEZE);
    expect(result.freezesEarned).toBe(1);
    expect(result.state.freezes).toBe(1);
  });

  it("does not earn freezes beyond the cap", () => {
    const state = makeStreak({
      current: DAYS_PER_EARNED_FREEZE - 1,
      longest: DAYS_PER_EARNED_FREEZE - 1,
      lastActiveDate: "2026-08-09",
      freezes: MAX_FREEZES,
    });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.freezesEarned).toBe(0);
    expect(result.state.freezes).toBe(MAX_FREEZES);
  });

  it("flags milestone days", () => {
    const state = makeStreak({ current: 6, longest: 6, lastActiveDate: "2026-08-09" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.state.current).toBe(7);
    expect(result.milestone).toBe(7);
  });

  it("reports no milestone on ordinary days", () => {
    const state = makeStreak({ current: 7, longest: 7, lastActiveDate: "2026-08-09" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.milestone).toBeNull();
  });

  it("ignores a clock set backwards rather than breaking the streak", () => {
    const state = makeStreak({ current: 10, longest: 10, lastActiveDate: "2026-08-12" });
    const result = computeCheckIn(state, "2026-08-10");

    expect(result.streakBroken).toBe(false);
    expect(result.state.longest).toBe(10);
  });
});

describe("projectStreak", () => {
  it("leaves an up-to-date streak untouched", () => {
    const state = makeStreak({ current: 5, longest: 5, lastActiveDate: "2026-08-10" });
    const result = projectStreak(state, "2026-08-10");

    expect(result.state).toEqual(state);
    expect(result.freezesSpent).toBe(0);
  });

  it("leaves yesterday's streak intact and unadvanced", () => {
    const state = makeStreak({ current: 5, longest: 5, lastActiveDate: "2026-08-09" });
    const result = projectStreak(state, "2026-08-10");

    expect(result.state.current).toBe(5);
    expect(result.streakBroken).toBe(false);
  });

  it("shows the streak as broken before any check-in happens", () => {
    const state = makeStreak({ current: 30, longest: 30, lastActiveDate: "2026-08-01" });
    const result = projectStreak(state, "2026-08-10");

    expect(result.streakBroken).toBe(true);
    expect(result.state.current).toBe(0);
  });

  it("applies freezes without advancing the count", () => {
    const state = makeStreak({
      current: 8,
      longest: 8,
      lastActiveDate: "2026-08-08",
      freezes: 2,
    });
    const result = projectStreak(state, "2026-08-10");

    expect(result.state.current).toBe(8);
    expect(result.freezesSpent).toBe(1);
    expect(result.state.freezes).toBe(1);
  });

  it("is a no-op for a user who has never checked in", () => {
    const result = projectStreak(makeStreak(), "2026-08-10");

    expect(result.state.current).toBe(0);
    expect(result.streakBroken).toBe(false);
  });
});
