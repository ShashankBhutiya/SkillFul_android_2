import { describe, expect, it } from "vitest";
import {
  isStudentCategoryAccessible,
  STUDENT_TRIAL_CATEGORY_ID,
} from "@/config/lockedCategories";

describe("student premium category access", () => {
  it("leaves exactly the configured trial category accessible without Premium", () => {
    expect(isStudentCategoryAccessible(STUDENT_TRIAL_CATEGORY_ID, false)).toBe(true);
    expect(isStudentCategoryAccessible("placements", false)).toBe(false);
    expect(isStudentCategoryAccessible("student_money", false)).toBe(false);
  });

  it("unlocks every student category for Premium users", () => {
    expect(isStudentCategoryAccessible("placements", true)).toBe(true);
    expect(isStudentCategoryAccessible("student_money", true)).toBe(true);
  });
});
