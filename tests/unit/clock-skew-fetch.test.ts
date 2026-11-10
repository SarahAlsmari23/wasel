import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { withClockSkewRetry } from '@/lib/supabase/clock-skew-fetch'

const jwtClaims401 = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), {
    status: 401,
    headers: { 'content-type': 'application/json', 'proxy-status': 'PostgREST; error=PGRST303' },
  })

function sequence(responses: Array<() => Response>) {
  let calls = 0
  const fetchStub = (async () =>
    responses[Math.min(calls++, responses.length - 1)]()) as typeof fetch
  return { fetchStub, calls: () => calls }
}

describe('withClockSkewRetry', () => {
  it('retries a PGRST303 rejection and returns the successful response', async () => {
    const s = sequence([jwtClaims401, () => new Response('[]', { status: 200 })])
    const res = await withClockSkewRetry(s.fetchStub, [0, 0])('https://x/rest/v1/t')
    assert.equal(res.status, 200)
    assert.equal(s.calls(), 2)
  })

  it('gives up after the configured retries', async () => {
    const s = sequence([jwtClaims401])
    const res = await withClockSkewRetry(s.fetchStub, [0, 0])('https://x/rest/v1/t')
    assert.equal(res.status, 401)
    assert.equal(s.calls(), 3)
  })

  it('detects the code in the body when the proxy header is absent', async () => {
    const s = sequence([
      () => new Response(JSON.stringify({ code: 'PGRST303' }), { status: 401 }),
      () => new Response('[]', { status: 200 }),
    ])
    const res = await withClockSkewRetry(s.fetchStub, [0])('https://x/rest/v1/t')
    assert.equal(res.status, 200)
  })

  it('does not retry other 401s or errors', async () => {
    for (const make of [
      () => new Response(JSON.stringify({ code: 'PGRST301' }), { status: 401 }),
      () => new Response(JSON.stringify({ code: '42501' }), { status: 403 }),
      () => new Response('oops', { status: 500 }),
    ]) {
      const s = sequence([make, () => new Response('[]', { status: 200 })])
      const res = await withClockSkewRetry(s.fetchStub, [0, 0])('https://x/rest/v1/t')
      assert.notEqual(res.status, 200)
      assert.equal(s.calls(), 1)
    }
  })
})
