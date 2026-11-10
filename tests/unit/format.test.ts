import assert from 'node:assert/strict'
import { test } from 'node:test'
import { intlLocaleFor } from '../../lib/i18n/config'
import { formatDate, formatNumber, formatRelativeTime } from '../../lib/utils/format'

test('Arabic formatting uses Western digits with Arabic month names', () => {
  assert.equal(intlLocaleFor('ar'), 'ar-SA-u-nu-latn')
  assert.equal(formatNumber(0, 'ar'), '0')
  assert.equal(formatNumber(1250, 'ar'), '1,250')
  const date = formatDate('2026-11-10T12:00:00Z', 'ar')
  assert.match(date, /10/)
  assert.match(date, /2026/)
  assert.doesNotMatch(date, /[٠-٩]/)
  assert.match(date, /[؀-ۿ]/, 'month name stays Arabic')
})

test('relative time in Arabic has no Arabic-Indic digits', () => {
  const now = Date.parse('2026-11-10T12:00:00Z')
  const label = formatRelativeTime('2026-11-10T11:47:00Z', 'ar', now)
  assert.match(label, /13/)
  assert.doesNotMatch(label, /[٠-٩]/)
})

test('English formatting is unchanged', () => {
  assert.equal(intlLocaleFor('en'), 'en-GB')
  assert.equal(formatNumber(1250, 'en'), '1,250')
  assert.equal(formatDate('2026-11-10T12:00:00Z', 'en'), '10 November 2026')
})
