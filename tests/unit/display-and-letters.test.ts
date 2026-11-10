import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { localizedFieldQuestion } from '@/lib/ai/server-copy'
import {
  getComplaintStatusPresentation,
  getDisplayTitle,
  localizeTitle,
} from '@/lib/complaints/display'
import { buildFormalComplaintLetter } from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'
import { directionFor, htmlLangFor, resolveLocale } from '@/lib/i18n/config'
import { entityDisplayName } from '@/lib/mock/government-entities'

describe('locale helpers', () => {
  it('resolves and maps locales', () => {
    assert.equal(resolveLocale('en'), 'en')
    assert.equal(resolveLocale('fr'), 'ar')
    assert.equal(resolveLocale(undefined), 'ar')
    assert.equal(directionFor('ar'), 'rtl')
    assert.equal(directionFor('en'), 'ltr')
    assert.equal(htmlLangFor('ar'), 'ar-SA')
  })
})

describe('display helpers', () => {
  it('localizes stored placeholder titles only', () => {
    assert.equal(localizeTitle('إعداد بلاغ جديد', 'en'), 'New complaint')
    assert.equal(
      localizeTitle('انقطاع الكهرباء في حي النرجس', 'en'),
      'انقطاع الكهرباء في حي النرجس',
    )
    assert.equal(localizeTitle('إعداد بلاغ جديد', 'ar'), 'إعداد بلاغ جديد')
  })

  it('uses a localized fallback title', () => {
    assert.equal(getDisplayTitle({ title: '' }, 'en'), 'Untitled conversation')
  })

  it('presents submitted complaints as submitted', () => {
    assert.equal(getComplaintStatusPresentation('generated', null, 'en').label, 'Ready to submit')
    assert.equal(
      getComplaintStatusPresentation('generated', '2026-01-01T00:00:00Z', 'en').badgeVariant,
      'submitted',
    )
  })

  it('uses official English authority names', () => {
    assert.equal(entityDisplayName('السعودية للطاقة', 'en'), 'Saudi Energy (SE)')
    assert.equal(entityDisplayName('الشركة الوطنية للمياه', 'ar'), 'الشركة الوطنية للمياه')
  })

  it('localizes deterministic field questions', () => {
    assert.equal(localizedFieldQuestion('city', 'المدينة؟', 'ar'), 'المدينة؟')
    assert.equal(localizedFieldQuestion('city', 'المدينة؟', 'en'), 'Which city is this in?')
  })
})

describe('formal letters', () => {
  const input = {
    entityName: 'الشركة الوطنية للمياه',
    fullName: 'Sara Ahmed',
    collectedFields: {
      problem_description: 'Water has been cut off for three days.',
      city: 'Riyadh',
      bill_reference: 'B-123',
    },
  }

  it('builds an English letter with the official name and the user details', () => {
    const letter = buildEnglishFormalComplaintLetter(input)
    assert.match(letter.complaintText, /^To: National Water Company/)
    assert.match(letter.complaintText, /Riyadh/)
    assert.match(letter.complaintText, /Water has been cut off for three days\./)
    assert.match(letter.complaintText, /Bill number: B-123/)
    assert.match(letter.complaintText, /Name: Sara Ahmed$/)
    assert.equal(letter.subject, 'Complaint regarding interruption of the water supply')
    assert.equal(letter.generatedFromData.language, 'en')
  })

  it('never includes sensitive fields', () => {
    const letter = buildEnglishFormalComplaintLetter({
      ...input,
      collectedFields: { ...input.collectedFields, national_id: '1234567890' },
    })
    assert.ok(!letter.complaintText.includes('1234567890'))
  })

  it('keeps the Arabic letter deterministic', () => {
    const a = buildFormalComplaintLetter({ ...input, fullName: 'سارة' })
    const b = buildFormalComplaintLetter({ ...input, fullName: 'سارة' })
    assert.equal(a.complaintText, b.complaintText)
    assert.match(a.complaintText, /^إلى: الشركة الوطنية للمياه/)
  })
})
