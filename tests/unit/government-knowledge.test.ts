import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import data from '@/data/government/authorities.json'
import { scrubUnverifiedContacts } from '@/lib/government/contact-check'
import {
  allProfiles,
  getAuthorityProfile,
  getProfileSource,
  profilePromptBlock,
} from '@/lib/government/profiles'
import { ENTITY_NAME_TO_SECTOR } from '@/lib/complaints/sectors'

const OFFICIAL_DOMAINS =
  /^https:\/\/(?:[\w-]+\.)*(?:nwc\.com\.sa|se\.com\.sa|cst\.gov\.sa|mc\.gov\.sa|balady\.gov\.sa|momah\.gov\.sa)(?:\/|$)/

describe('verified government profiles', () => {
  it('cover exactly the five supported authorities, keyed by their database names', () => {
    const names = allProfiles()
      .map((p) => p.dbName)
      .sort()
    assert.deepEqual(names, Object.keys(ENTITY_NAME_TO_SECTOR).sort())
  })
  it('every source is on an official domain and every fact cites a known source with a quote', () => {
    for (const s of (data as { sources: { url: string }[] }).sources) {
      assert.match(s.url, OFFICIAL_DOMAINS, s.url)
    }
    for (const p of allProfiles()) {
      for (const c of p.channels) {
        assert.ok(getProfileSource(c.source), `${p.code} channel ${c.value}`)
        assert.ok(c.quote.length > 0)
        if (c.kind === 'url') assert.match(c.value, OFFICIAL_DOMAINS)
      }
      for (const pr of p.procedures)
        assert.ok(getProfileSource(pr.source) && pr.quote, `${p.code} ${pr.topic}`)
    }
  })
  it('the prompt block carries verified facts with their sources and lists unpublished facts', () => {
    const cst = getAuthorityProfile('هيئة الاتصالات والفضاء والتقنية')!
    const block = profilePromptBlock(cst, 'شركة النت ما حلت مشكلتي', 'ar')
    assert.match(block, /5 أيام/)
    assert.match(block, /mutasilind\.cst\.gov\.sa/)
    assert.match(block, /غير منشور/)
    const sec = getAuthorityProfile('السعودية للطاقة')!
    assert.match(profilePromptBlock(sec, 'الكهرباء مقطوعة', 'ar'), /6 ساعات/)
  })
})

describe('unverified contact details are removed from answers', () => {
  it('keeps verified numbers, links and amounts; removes invented ones', () => {
    const r = scrubUnverifiedContacts(
      'اتصل على الرقم 933 أو 920001100. الفاتورة 900 ريال. قدّم عبر https://ebranch.nwc.com.sa/submit-complaint أو https://www.nwc.com.sa/fake-page وراسل support@nwc.com.sa',
      {},
    )
    assert.deepEqual(
      r.removed.sort(),
      ['920001100', 'https://www.nwc.com.sa/fake-page', 'support@nwc.com.sa'].sort(),
    )
    assert.match(r.text, /933/)
    assert.match(r.text, /900 ريال/)
    assert.match(r.text, /ebranch\.nwc\.com\.sa\/submit-complaint/)
  })
  it('keeps a number or link the user wrote themselves', () => {
    const r = scrubUnverifiedContacts('ذكرت أن رقمك 0551234567 للتواصل، اتصل بالرقم 0551234567', {
      userText: 'رقمي 0551234567',
    })
    assert.equal(r.removed.length, 0)
  })
})
