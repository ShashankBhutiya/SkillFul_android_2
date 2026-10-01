import { describe, expect, it } from "vitest";
import {
  isPaidSubscriptionActive,
  resolveUpgradePeriodEnd,
} from "../../supabase/functions/shared/subscription";

describe("payment subscription eligibility", () => {
  const now = new Date("2026-09-30T00:00:00.000Z").getTime();

  it("accepts a legacy active subscription without an end date", () => {
    expect(isPaidSubscriptionActive("active", null, now)).toBe(true);
    expect(resolveUpgradePeriodEnd(null, now)?.toISOString()).toBe("2027-09-30T00:00:00.000Z");
  });

  it("preserves an unexpired subscription end date", () => {
    const end = "2026-12-15T00:00:00.000Z";
    expect(isPaidSubscriptionActive("active", end, now)).toBe(true);
    expect(resolveUpgradePeriodEnd(end, now)?.toISOString()).toBe(end);
  });

  it("rejects expired, malformed, and inactive subscriptions", () => {
    expect(isPaidSubscriptionActive("active", "2026-09-01T00:00:00.000Z", now)).toBe(false);
    expect(isPaidSubscriptionActive("active", "not-a-date", now)).toBe(false);
    expect(isPaidSubscriptionActive("inactive", null, now)).toBe(false);
    expect(resolveUpgradePeriodEnd("2026-09-01T00:00:00.000Z", now)).toBeNull();
  });
});
