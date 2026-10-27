import type { UserMode } from "@/config/userMode";

export const ONBOARDING_KEY = "skillful_onboarding_v1";
export const ONBOARDING_DRAFT_KEY = "skillful_onboarding_draft_v1";
export interface OnboardingDetails {
  mode: UserMode;
  fullName: string;
  degree: string;
  institution: string;
  academicYear: string;
  graduationYear: string;
  jobTitle: string;
  industry: string;
  experience: string;
  careerGoal: string;
}
export const emptyOnboarding: OnboardingDetails = {
  mode: "student", fullName: "", degree: "", institution: "", academicYear: "",
  graduationYear: "", jobTitle: "", industry: "", experience: "", careerGoal: "",
};
export interface OnboardingDraft { details: OnboardingDetails; email?: string; pendingAuth?: boolean; }
export function readOnboardingDraft(): OnboardingDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY) || "null");
    return value?.details && ["student", "professional"].includes(value.details.mode)
      ? { ...value, details: { ...emptyOnboarding, ...value.details } } : null;
  } catch { return null; }
}
export function writeOnboardingDraft(draft: OnboardingDraft) {
  try { localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft)); } catch { /* In-memory flow still works. */ }
}
export function needsOnboarding() {
  try { return localStorage.getItem(ONBOARDING_KEY) !== "complete"; } catch { return true; }
}
