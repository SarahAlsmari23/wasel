/**
 * Fixed-window rate limiting for the AI chat endpoint.
 *
 * When a Redis-compatible REST store is configured (Upstash, or Vercel KV,
 * which is Upstash under the hood), counters are shared by every serverless
 * instance — the only reliable option on Vercel. Without one, it falls back
 * to a per-instance in-memory window: still a useful brake on accidental
 * spam, but not a guarantee, and documented as such.
 *
 * Talks to the store over plain REST (fetch) — no client library required.
 * A store outage fails open to the in-memory limiter rather than taking the
 * assistant down.
 */

export type RateLimitRule = {
  /** Identifies the bucket, e.g. `user:<id>` or `ip:<addr>`. */
  key: string
  limit: number
  windowMs: number
}

export type RateLimitBackend = 'shared' | 'memory'

const memoryWindows = new Map<string, { windowStart: number; count: number }>()
const MAX_MEMORY_KEYS = 10_000

function restConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

export function rateLimitBackend(): RateLimitBackend {
  return restConfig() ? 'shared' : 'memory'
}

function windowStartFor(windowMs: number, now: number): number {
  return Math.floor(now / windowMs) * windowMs
}

/** Exported for unit tests. Counts one hit; true when still within the limit. */
export function hitMemory(rule: RateLimitRule, now: number = Date.now()): boolean {
  const windowStart = windowStartFor(rule.windowMs, now)
  const existing = memoryWindows.get(rule.key)
  const entry =
    existing && existing.windowStart === windowStart ? existing : { windowStart, count: 0 }
  entry.count += 1
  memoryWindows.set(rule.key, entry)

  // Bound memory on a long-lived instance: drop expired windows when large.
  if (memoryWindows.size > MAX_MEMORY_KEYS) {
    for (const [key, value] of memoryWindows) {
      if (value.windowStart < windowStart) memoryWindows.delete(key)
    }
  }
  return entry.count <= rule.limit
}

export function resetMemoryRateLimits(): void {
  memoryWindows.clear()
}

async function hitShared(
  config: { url: string; token: string },
  rule: RateLimitRule,
  now: number,
): Promise<boolean> {
  const windowStart = windowStartFor(rule.windowMs, now)
  const bucket = `wasel:rl:${rule.key}:${windowStart}`
  const ttlSeconds = Math.ceil((rule.windowMs * 2) / 1000)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1_500)
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', bucket],
        ['EXPIRE', bucket, String(ttlSeconds)],
      ]),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`rate-limit store HTTP ${response.status}`)
    const results = (await response.json()) as { result?: unknown }[]
    const count = Number(results?.[0]?.result)
    if (!Number.isFinite(count)) throw new Error('rate-limit store returned no count')
    return count <= rule.limit
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Applies every rule; the request is allowed only when all of them allow it.
 * Every rule is counted (no short-circuit), so a burst cannot dodge a broader
 * rule by tripping a narrower one first.
 */
export async function checkRateLimits(
  rules: RateLimitRule[],
  now: number = Date.now(),
): Promise<{ allowed: boolean; backend: RateLimitBackend }> {
  const config = restConfig()
  if (config) {
    try {
      const results = await Promise.all(rules.map((rule) => hitShared(config, rule, now)))
      return { allowed: results.every(Boolean), backend: 'shared' }
    } catch {
      // Fail open to the in-memory limiter — availability over strictness.
    }
  }
  const results = rules.map((rule) => hitMemory(rule, now))
  return { allowed: results.every(Boolean), backend: 'memory' }
}

/**
 * The client address as reported by Vercel's edge. Proxy headers are
 * spoofable elsewhere, so this is only ever a rate-limit key, never an
 * authentication signal.
 */
export function clientIpFrom(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
