import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { describesProblem } from '@/lib/ai/problem-signal'

describe('describesProblem (authority continuity)', () => {
  const cases: [string, boolean][] = [
    // The production follow-up that wrongly switched water → CST: a mention,
    // not a new problem.
    ['وهل يمكنني متابعة طلبي عبر الإنترنت؟', false],
    ['Can I track my request online?', false],
    ['What are the working hours?', false],
    // Genuine new problems.
    ['النت عندي مقطوع من يومين', true],
    ['الكهرباء طافية عندنا من الصبح', true],
    ['المتجر رفض يرجع فلوسي', true],
    ['My internet has been cut off for two days', true],
    ['The shop refused my refund', true],
    ['انقطعت الكهرباء عن منزلي في الرياض منذ يومين ولم يصلحها أحد، أين أقدم شكوى؟', true],
  ]
  it('a question naming no sector never justifies a switch on its own', async () => {
    const { detectSectorByKeyword } = await import('@/lib/ai/entity-detection')
    // "How long until they reply to the complaint?" mentions a complaint but
    // no sector, so the continuity rule has nothing to switch to.
    assert.equal(detectSectorByKeyword('كم مدة الرد على الشكوى؟'), null)
  })

  for (const [message, expected] of cases) {
    it(`${JSON.stringify(message)} → ${expected}`, () => {
      assert.equal(describesProblem(message), expected)
    })
  }
})
