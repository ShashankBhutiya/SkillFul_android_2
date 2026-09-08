// Shared rate limiter for the edge functions, backed by public.check_rate_limit.
//
// The counter lives in Postgres rather than in module scope because each edge
// function runs as a pool of short-lived Deno isolates — an in-memory Map is
// per-isolate, so a caller spreading requests across isolates would get a fresh
// quota each time. See the migration for the full reasoning.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

export interface RateLimitOptions {
  /** Namespace for the limit, e.g. 'checkout'. Keeps buckets from colliding. */
  name: string
  /** Caller identity within the namespace — a user id, or an IP. */
  identifier: string
  /** Requests permitted per window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
  /**
   * What to do when the limiter itself fails (database unreachable, RPC
   * missing). Default true: serve the request rather than take the feature
   * down over a bookkeeping outage. Pass false on endpoints where an
   * unmetered flood is worse than an outage.
   */
  failOpen?: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
  limit: number
}

/**
 * Best-effort client IP. x-forwarded-for is a comma-separated chain appended to
 * by each hop, and the left-most entry is the original client — but it is also
 * fully client-controlled, so treat IP buckets as a speed bump against casual
 * scripted abuse, not as an identity. Authenticated endpoints should key on the
 * user id instead, which is derived from a verified JWT.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

/** Headers describing the caller's remaining quota, for both allow and deny. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  }
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfter)
  }
  return headers
}

/** Count one request against a bucket. */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { name, identifier, limit, windowSeconds, failOpen = true } = options

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`Rate limit '${name}': service role credentials missing`)
    return { allowed: failOpen, remaining: 0, retryAfter: windowSeconds, limit }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  try {
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_bucket: `${name}:${identifier}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) throw error

    // The function returns a single-row table, which supabase-js surfaces as an
    // array of one.
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('check_rate_limit returned no row')

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfter: row.retry_after,
      limit,
    }
  } catch (err) {
    console.error(`Rate limit '${name}' check failed (failOpen=${failOpen}):`, err)
    return { allowed: failOpen, remaining: 0, retryAfter: windowSeconds, limit }
  }
}

/**
 * Count one request and, if the caller is over their limit, build the 429 to
 * return. Resolves to null when the request should proceed, so call sites read
 * as an early guard:
 *
 *   const limited = await enforceRateLimit({ ... }, corsHeaders)
 *   if (limited) return limited
 */
export async function enforceRateLimit(
  options: RateLimitOptions,
  baseHeaders: Record<string, string> = {},
): Promise<Response | null> {
  const result = await checkRateLimit(options)
  if (result.allowed) return null

  console.warn(
    `Rate limit '${options.name}' exceeded for ${options.identifier} ` +
    `(${options.limit}/${options.windowSeconds}s), retry in ${result.retryAfter}s`,
  )

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please slow down and try again shortly.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...baseHeaders,
        ...rateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    },
  )
}
