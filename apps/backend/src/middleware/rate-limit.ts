import { createMiddleware } from 'hono/factory'
import { fail } from '../lib/http'

/**
 * Best-effort per-isolate sliding window for credential endpoints.
 *
 * Cloudflare can run many isolates, so this is not a distributed limiter. It
 * still stops the common single-client brute-force / email-resend loop without
 * adding a database round-trip to every auth request. A KV/DO-backed limiter
 * remains the production follow-up.
 */

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 15

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function prune(now: number): void {
  if (buckets.size < 5_000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export const authRateLimit = createMiddleware(async (c, next) => {
  const now = Date.now()
  prune(now)

  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = c.req.header('cf-connecting-ip') ?? forwarded ?? 'unknown'
  const key = `${c.req.path}:${ip}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    bucket.count += 1
    if (bucket.count > MAX_ATTEMPTS) {
      c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
      return fail(c, 'RATE_LIMIT', 'Too many attempts. Try again in a minute.', 429)
    }
  }

  await next()
})
