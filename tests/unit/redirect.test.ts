import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  authHrefWithReturn,
  DEFAULT_SIGNED_IN_PATH,
  resolveRedirectPath,
} from '@/lib/auth/redirect'

describe('resolveRedirectPath', () => {
  it('keeps safe same-origin paths', () => {
    assert.equal(resolveRedirectPath('/dashboard/complaints'), '/dashboard/complaints')
    assert.equal(
      resolveRedirectPath('/wasal?mode=complaint&resumePending=true'),
      '/wasal?mode=complaint&resumePending=true',
    )
  })

  it('defaults to the home page, not the dashboard', () => {
    assert.equal(DEFAULT_SIGNED_IN_PATH, '/')
    assert.equal(resolveRedirectPath(null), '/')
    assert.equal(resolveRedirectPath(''), '/')
  })

  for (const vector of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2F%2Fevil.example',
    '/%5Cevil.example',
    '/\tevil',
    '/\n/evil.example',
    'javascript:alert(1)',
    '/auth/sign-in',
    '/auth/callback?next=/x',
    '/%E0%A4%A',
  ]) {
    it(`rejects ${JSON.stringify(vector)}`, () => {
      assert.equal(resolveRedirectPath(vector), '/')
    })
  }
})

describe('authHrefWithReturn', () => {
  it('omits next for the home page and encodes other pages', () => {
    assert.equal(authHrefWithReturn('/auth/sign-in', '/'), '/auth/sign-in')
    assert.equal(authHrefWithReturn('/auth/sign-in', '/entities'), '/auth/sign-in?next=%2Fentities')
  })
  it('never returns the user to an auth page', () => {
    assert.equal(authHrefWithReturn('/auth/sign-up', '/auth/sign-in'), '/auth/sign-up')
  })
})
