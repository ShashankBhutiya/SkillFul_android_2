import { describe, expect, it } from "vitest";
import { isInterviewSubscriptionActive } from "@/config/subscriptionTiers";

describe("Interview Premium entitlement", () => {
  const future = "2027-01-01T00:00:00.000Z";
  const now = new Date("2026-09-29T00:00:00.000Z").getTime();

  it("allows an active Interview Premium subscription", () => {
    expect(isInterviewSubscriptionActive("active", future, "interview", now)).toBe(true);
  });

  it.each([
    ["active", future, "basic"],
    ["trialing", future, "interview"],
    ["inactive", future, "interview"],
    ["active", "2026-01-01T00:00:00.000Z", "interview"],
  ])("rejects status=%s end=%s tier=%s", (status, end, tier) => {
    expect(isInterviewSubscriptionActive(status, end, tier, now)).toBe(false);
  });
});
