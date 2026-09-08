// Keep this version and wording in sync with the database migration.
export const CALL_CONSENT_VERSION = "2026-09-08-v1";
export const CALL_CONSENT_TEXT = "I agree to receive occasional phone calls from Skillful about my learning progress, product updates, or support. I can withdraw this consent anytime.";

export function normalizeCallPhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

export function isValidCallPhone(phone: string): boolean {
  return /^\+[1-9][0-9]{7,14}$/.test(normalizeCallPhone(phone));
}
