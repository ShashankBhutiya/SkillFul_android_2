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

/** Check if a category is locked by default */
export function isCategoryLocked(categoryId: string): boolean {
    return LOCKED_CATEGORY_IDS.includes(categoryId);
}
