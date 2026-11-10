import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  checkRateLimits,
  hitMemory,
  rateLimitBackend,
  resetMemoryRateLimits,
} from '@/lib/security/rate-limit'

describe('memory rate limiter', () => {
  beforeEach(() => resetMemoryRateLimits())

  it('allows up to the limit within a window, then blocks', () => {
    const rule = { key: 'k', limit: 3, windowMs: 60_000 }
    const now = 1_000_000_000_000
    assert.equal(hitMemory(rule, now), true)
    assert.equal(hitMemory(rule, now + 1), true)
    assert.equal(hitMemory(rule, now + 2), true)
    assert.equal(hitMemory(rule, now + 3), false)
  })

  it('starts a fresh window', () => {
    const rule = { key: 'k', limit: 1, windowMs: 60_000 }
    const start = 1_000_000_020_000
    assert.equal(hitMemory(rule, start), true)
    assert.equal(hitMemory(rule, start + 1), false)
    assert.equal(hitMemory(rule, start + 60_000), true)
  })

  it('keeps keys independent', () => {
    const now = 1_000_000_000_000
    assert.equal(hitMemory({ key: 'a', limit: 1, windowMs: 60_000 }, now), true)
    assert.equal(hitMemory({ key: 'b', limit: 1, windowMs: 60_000 }, now), true)
  })

  it('requires every rule to allow (per-conversation and per-IP)', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.KV_REST_API_URL
    assert.equal(rateLimitBackend(), 'memory')
    const now = 1_000_000_000_000
    const rules = [
      { key: 'conv:1', limit: 2, windowMs: 60_000 },
      { key: 'ip:x', limit: 100, windowMs: 60_000 },
    ]
    assert.equal((await checkRateLimits(rules, now)).allowed, true)
    assert.equal((await checkRateLimits(rules, now)).allowed, true)
    assert.equal((await checkRateLimits(rules, now)).allowed, false)
    // A different conversation from the same IP is still allowed.
    const other = [{ key: 'conv:2', limit: 2, windowMs: 60_000 }, rules[1]]
    assert.equal((await checkRateLimits(other, now)).allowed, true)
  })
})
