import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { coerceGenerateOutput, parseModelJson } from '@/lib/ai/generation-shared'

describe('parseModelJson', () => {
  it('parses plain JSON', () => {
    assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 })
  })
  it('parses fenced JSON', () => {
    assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 })
  })
  it('extracts JSON surrounded by prose', () => {
    assert.deepEqual(parseModelJson('Here you go: {"a":1} hope it helps'), { a: 1 })
  })
  it('returns undefined for non-JSON', () => {
    assert.equal(parseModelJson('no json here'), undefined)
  })
})

describe('coerceGenerateOutput', () => {
  it('fills conservative defaults for missing optional fields', () => {
    const output = coerceGenerateOutput({ answer: ' مرحبا ', intent: 'entity_information' })
    assert.ok(output)
    assert.equal(output.answer, 'مرحبا')
    assert.equal(output.confidence, 'medium')
    assert.equal(output.grounded, false)
    assert.deepEqual(output.missingFields, [])
    assert.deepEqual(output.suggestedQuestions, [])
  })

  it('rejects an empty answer or missing intent', () => {
    assert.equal(coerceGenerateOutput({ answer: '   ', intent: 'x' }), null)
    assert.equal(coerceGenerateOutput({ answer: 'ok' }), null)
    assert.equal(coerceGenerateOutput(null), null)
  })

  it('drops wrongly-typed optional fields instead of failing', () => {
    const output = coerceGenerateOutput({
      answer: 'ok',
      intent: 'complaint_guidance',
      confidence: 'certain',
      nextQuestion: 5,
      readyToGenerateComplaint: 'yes',
      missingFields: ['a', 2],
    })
    assert.ok(output)
    assert.equal(output.confidence, 'medium')
    assert.equal(output.nextQuestion, undefined)
    assert.equal(output.readyToGenerateComplaint, undefined)
    assert.deepEqual(output.missingFields, ['a'])
  })
})
