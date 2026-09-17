import { describe, expect, it } from "vitest";
import { generationDailyLimit } from "../../supabase/functions/shared/aiGenerationLimits";

const now = new Date("2026-09-12T12:00:00Z");
const streak = (days: number, last = "2026-09-12", freezes = 0) => ({ current_streak: days, last_active_date: last, freezes });

describe("AI generation daily quotas", () => {
  it.each([[0, 100], [1, 110], [2, 120], [6, 160], [7, 170], [13, 230], [14, 240], [89, 990], [90, 1000], [365, 1000]])("awards the quota for a %i-day streak", (days, quota) => {
    expect(generationDailyLimit(undefined, streak(days), now)).toBe(quota);
  });
  it("uses 100 when no saved streak exists", () => {
    expect(generationDailyLimit(undefined, null, now)).toBe(100);
  });
  it("keeps yesterday's streak but removes an expired or future streak bonus", () => {
    expect(generationDailyLimit(undefined, streak(30, "2026-09-11"), now)).toBe(400);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-10"), now)).toBe(100);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-13"), now)).toBe(100);
  });
  it("honours banked freezes without permitting unlimited freeze coverage", () => {
    expect(generationDailyLimit(undefined, streak(14, "2026-09-10", 1), now)).toBe(240);
    expect(generationDailyLimit(undefined, streak(30, "2026-09-07", 100), now)).toBe(100);
  });
  it("uses IST across the UTC date boundary", () => {
    expect(generationDailyLimit(undefined, streak(7), new Date("2026-09-11T19:00:00Z"))).toBe(170);
  });
  it.each(["20", "0", "NaN", "Infinity", "100.5", "99", "1001"])("falls back to 100 for invalid base %s", (base) => {
    expect(generationDailyLimit(base, null, now)).toBe(100);
  });
  it("adds bonuses to an administrator base and caps the total", () => {
    expect(generationDailyLimit("200", streak(7), now)).toBe(270);
    expect(generationDailyLimit("990", streak(30), now)).toBe(1000);
  });
  it("ignores malformed saved streaks", () => {
    expect(generationDailyLimit(undefined, streak(30, "invalid"), now)).toBe(100);
    expect(generationDailyLimit(undefined, streak(NaN), now)).toBe(100);
  });
});
