const ANNUAL_TERM_MS = 365 * 24 * 60 * 60 * 1000

export function isPaidSubscriptionActive(
  status: string | null | undefined,
  periodEnd: string | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== 'active') return false
  if (!periodEnd) return true

  const end = new Date(periodEnd).getTime()
  return !Number.isNaN(end) && end > now
}

export function resolveUpgradePeriodEnd(
  periodEnd: string | null | undefined,
  now = Date.now(),
): Date | null {
  if (!periodEnd) return new Date(now + ANNUAL_TERM_MS)

  const end = new Date(periodEnd)
  return !Number.isNaN(end.getTime()) && end.getTime() > now ? end : null
}
