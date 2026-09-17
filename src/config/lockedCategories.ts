/**
 * Locked categories configuration.
 * 
 * Change the IDs in LOCKED_CATEGORY_IDS to lock/unlock different categories.
 * These categories require a valid referral to unlock.
 */

// IDs of categories that are locked by default.
// Change these to lock different categories.
// To find category IDs, see src/data/questions.ts → categories array.
export const LOCKED_CATEGORY_IDS: string[] = [
    "personality",
    "stocks",
    "rizz",
];

export const REFERRALS_PER_UNLOCK = 1; // 1 referral unlocks 1 category

// Non-premium students receive one complete category as their free trial.
// This rule is student-only; professional category access remains unchanged.
export const STUDENT_TRIAL_CATEGORY_ID = "aptitude_reasoning";

export function isStudentCategoryAccessible(categoryId: string, isPremium: boolean): boolean {
    return isPremium || categoryId === STUDENT_TRIAL_CATEGORY_ID;
}

/** Check if a category is locked by default */
export function isCategoryLocked(categoryId: string): boolean {
    return LOCKED_CATEGORY_IDS.includes(categoryId);
}
