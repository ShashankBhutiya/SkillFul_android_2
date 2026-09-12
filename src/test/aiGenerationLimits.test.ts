import { describe, expect, it } from "vitest";
import { generationDailyLimit } from "../../supabase/functions/shared/aiGenerationLimits";

const now = new Date("2026-09-12T12:00:00Z");
const streak = (days: number, last = "2026-09-12", freezes = 0) => ({ current_streak: days, last_active_date: last, freezes });

describe("AI generation daily quotas", () => {
  it.each([[0, 40], [1, 50], [2, 60], [6, 100], [7, 110], [13, 170], [14, 180], [25, 290], [26, 300], [29, 300], [30, 300], [365, 300]])("awards the quota for a %i-day streak", (days, quota) => {
    expect(generationDailyLimit(undefined, streak(days), now)).toBe(quota);
  });
  it("uses 40 when no saved streak exists", () => {
    expect(generationDailyLimit(undefined, null, now)).toBe(40);
  });
  it("keeps yesterday's streak but removes an expired or future streak bonus", () => {
    expect(generationDailyLimit(undefined, streak(30, "2026-09-11"), now)).toBe(300);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-10"), now)).toBe(40);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-13"), now)).toBe(40);
  });
  it("honours banked freezes without permitting unlimited freeze coverage", () => {
    expect(generationDailyLimit(undefined, streak(14, "2026-09-10", 1), now)).toBe(180);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-07", 100), now)).toBe(40);
  });
  it("uses IST across the UTC date boundary", () => {
    expect(generationDailyLimit(undefined, streak(7), new Date("2026-09-11T19:00:00Z"))).toBe(110);
  });
  it.each(["20", "0", "NaN", "Infinity", "40.5", "301", "1000"])("falls back to 40 for invalid or obsolete base %s", (base) => {
    expect(generationDailyLimit(base, null, now)).toBe(40);
  });
  it("adds bonuses to an administrator base and caps the total", () => {
    expect(generationDailyLimit("60", streak(7), now)).toBe(130);
    expect(generationDailyLimit("290", streak(30), now)).toBe(300);
  });
  it("ignores malformed saved streaks", () => {
    expect(generationDailyLimit(undefined, streak(30, "invalid"), now)).toBe(40);
    expect(generationDailyLimit(undefined, streak(NaN), now)).toBe(40);
  });
});
