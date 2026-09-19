import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSubscriptionActive,
  getGuestTrialState,
  GUEST_TRIAL_START_KEY,
  TRIAL_DURATION_DAYS,
} from "@/contexts/AuthContext";
import { isStudentCategoryAccessible, STUDENT_TRIAL_CATEGORY_ID } from "@/config/lockedCategories";

describe("1-month free trial evaluation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("isSubscriptionActive", () => {
    it("returns true for trialing status with a future period end", () => {
      const future = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive("trialing", future)).toBe(true);
    });

    it("returns false for trialing status with a past period end", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(isSubscriptionActive("trialing", past)).toBe(false);
    });

    it("returns true for active status with a future period end", () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive("active", future)).toBe(true);
    });

    it("returns false for active status with a past period end", () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(isSubscriptionActive("active", past)).toBe(false);
    });

    it("returns false for inactive status", () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive("inactive", future)).toBe(false);
      expect(isSubscriptionActive("inactive", null)).toBe(false);
    });

    it("returns false for null or undefined status", () => {
      expect(isSubscriptionActive(null, null)).toBe(false);
      expect(isSubscriptionActive(undefined, undefined)).toBe(false);
    });
  });

  describe("guest free trial", () => {
    it("initializes a 30-day trial start date in localStorage on first access", () => {
      expect(localStorage.getItem(GUEST_TRIAL_START_KEY)).toBeNull();

      const state = getGuestTrialState();

      expect(localStorage.getItem(GUEST_TRIAL_START_KEY)).not.toBeNull();
      expect(state.isPremium).toBe(true);
      expect(state.subscriptionStatus).toBe("trialing");
      const periodEndMs = new Date(state.subscriptionPeriodEnd).getTime();
      expect(periodEndMs).toBeGreaterThan(Date.now());
    });

    it("returns isPremium: true while within the 30-day window", () => {
      // 10 days into trial
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(GUEST_TRIAL_START_KEY, tenDaysAgo);

      const state = getGuestTrialState();
      expect(state.isPremium).toBe(true);
      expect(state.subscriptionStatus).toBe("trialing");
    });

    it("returns isPremium: false and subscriptionStatus: expired once 30 days have passed", () => {
      // 31 days ago (trial expired)
      const thirtyOneDaysAgo = new Date(
        Date.now() - (TRIAL_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      localStorage.setItem(GUEST_TRIAL_START_KEY, thirtyOneDaysAgo);

      const state = getGuestTrialState();
      expect(state.isPremium).toBe(false);
      expect(state.subscriptionStatus).toBe("expired");
    });
  });

  describe("category accessibility with trial", () => {
    it("allows full student category access when trial is active (isPremium: true)", () => {
      const isTrialActive = true;
      expect(isStudentCategoryAccessible(STUDENT_TRIAL_CATEGORY_ID, isTrialActive)).toBe(true);
      expect(isStudentCategoryAccessible("placements", isTrialActive)).toBe(true);
      expect(isStudentCategoryAccessible("student_money", isTrialActive)).toBe(true);
    });

    it("restricts student categories to only the trial category once trial is expired (isPremium: false)", () => {
      const isTrialExpired = false;
      expect(isStudentCategoryAccessible(STUDENT_TRIAL_CATEGORY_ID, isTrialExpired)).toBe(true);
      expect(isStudentCategoryAccessible("placements", isTrialExpired)).toBe(false);
      expect(isStudentCategoryAccessible("student_money", isTrialExpired)).toBe(false);
    });
  });
});
