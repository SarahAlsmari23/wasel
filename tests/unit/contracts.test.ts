import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateChatRequest } from '@/lib/ai/contracts'

const base = { conversationId: 'c-1', message: 'مرحبا' }

describe('validateChatRequest', () => {
  it('accepts a minimal request and defaults the locale to Arabic', () => {
    const result = validateChatRequest(base)
    assert.equal(result.valid, true)
    if (result.valid) assert.equal(result.value.locale, 'ar')
  })

  it('accepts English locale and a known authority hint', () => {
    const result = validateChatRequest({
      ...base,
      locale: 'en',
      activeEntityName: ' الشركة الوطنية للمياه ',
    })
    assert.equal(result.valid, true)
    if (result.valid) {
      assert.equal(result.value.locale, 'en')
      // A conversation started under the historical name continues under the official one.
      assert.equal(result.value.activeEntityName, 'شركة المياه الوطنية')
    }
  })

  it('rejects a non-UUID database conversation id', () => {
    const result = validateChatRequest({ ...base, dbConversationId: 'abc' })
    assert.equal(result.valid, false)
  })

  it('accepts a UUID database conversation id', () => {
    const result = validateChatRequest({
      ...base,
      dbConversationId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    })
    assert.equal(result.valid, true)
  })

  it('rejects oversized messages and over-long authority hints', () => {
    assert.equal(validateChatRequest({ ...base, message: 'x'.repeat(2001) }).valid, false)
    assert.equal(validateChatRequest({ ...base, activeEntityName: 'x'.repeat(121) }).valid, false)
  })

  it('returns errors in the requested language', () => {
    const result = validateChatRequest({ conversationId: 'c', message: '', locale: 'en' })
    assert.equal(result.valid, false)
    if (!result.valid) assert.match(result.error, /message/i)
  })

  it('rejects unknown intents', () => {
    assert.equal(validateChatRequest({ ...base, intent: 'hack' }).valid, false)
  })
})
