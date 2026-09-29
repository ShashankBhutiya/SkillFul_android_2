export type SubscriptionTier = "basic" | "interview";

export function isInterviewSubscriptionActive(
  status: string | null | undefined,
  periodEnd: string | null | undefined,
  tier: string | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== "active" || tier !== "interview") return false;
  if (!periodEnd) return true;
  const end = new Date(periodEnd).getTime();
  return !Number.isNaN(end) && end > now;
}
