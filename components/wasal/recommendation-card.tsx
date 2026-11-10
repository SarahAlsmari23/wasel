'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Check, Copy, ExternalLink, FileSignature, Info } from 'lucide-react'
import { useState } from 'react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ENGLISH_FIELD_LABELS } from '@/lib/ai/server-copy'
import { COMPLAINT_FIELD_LABELS } from '@/lib/complaints/formal-letter'
import { defineCopy } from '@/lib/i18n/config'
import { getGovernmentEntityByName, localizeEntity } from '@/lib/mock/government-entities'
import {
  getAuthorityProfile,
  getProfileSource,
  primaryProcedure,
  PROFILES_VERIFIED_AT,
} from '@/lib/government/profiles'
import type { ComplaintAnalysis } from '@/types/wasal'

/*
 * No confidence score here by design: once the analysis has settled on a
 * final authority, an internal certainty metric only undermines the result.
 *
 * Only information Wasel can stand behind is shown: the authority, why it was
 * selected, its verified official website and — from the reviewed official
 * profiles (data/government/authorities.json) — the verified contact
 * channels, submission steps, published times and fees, each traceable to
 * the official page it was read on. Anything not published is not shown.
 */
const COPY = defineCopy({
  ar: {
    authority: 'الجهة المختصة',
    why: 'سبب الاختيار',
    whyFallback: 'تم الاختيار بناءً على وصفك وبيانات الجهات الموثّقة في واصل.',
    category: 'تصنيف الشكوى',
    details: 'التفاصيل المجمّعة',
    noDetails: 'سيظهر هنا ما تقدّمه من تفاصيل أثناء المحادثة.',
    officialChannel: 'قناة التقديم الرسمية',
    unverifiedNote:
      'المستندات المطلوبة وخطوات التقديم ومدة المعالجة وبيانات التواصل غير متوفرة بعد في مصادر واصل الموثّقة — راجعها في الموقع الرسمي للجهة.',
    openOfficial: 'الانتقال إلى الموقع الرسمي',
    verifiedInfo: 'قنوات التقديم والخطوات الموثّقة',
    openLink: 'فتح',
    channels: 'قنوات التواصل',
    steps: 'خطوات التقديم',
    serviceTime: 'المدة المنشورة',
    fee: 'الرسوم',
    sourceLine: (date: string) => `المصدر: الموقع الرسمي للجهة — تم التحقق في ${date}`,
    notListed: 'ما لا يظهر هنا غير منشور في المصادر الرسمية التي راجعناها.',
    create: 'إنشاء البلاغ',
    creating: 'جارٍ إنشاء البلاغ...',
    copy: 'نسخ التفاصيل',
    copied: 'تم النسخ',
    copiedToast: 'تم نسخ التفاصيل',
    copyFailed: 'تعذر النسخ. حاول مرة أخرى.',
  },
  en: {
    authority: 'Responsible authority',
    why: 'Why this authority',
    whyFallback: "Selected from your description and Wasel's verified authority information.",
    category: 'Complaint category',
    details: 'Details collected',
    noDetails: 'The details you provide during the conversation will appear here.',
    officialChannel: 'Official submission channel',
    unverifiedNote:
      "Required documents, submission steps, processing times and contact details aren't yet available in Wasel's verified sources — please check them on the authority's official website.",
    openOfficial: 'Go to the official website',
    verifiedInfo: 'Verified channels and steps',
    openLink: 'Open',
    channels: 'Contact channels',
    steps: 'How to submit',
    serviceTime: 'Published time',
    fee: 'Fee',
    sourceLine: (date: string) => `Source: the authority's official website — verified on ${date}`,
    notListed: "Anything not shown here isn't published in the official sources we reviewed.",
    create: 'Create the complaint',
    creating: 'Creating the complaint...',
    copy: 'Copy details',
    copied: 'Copied',
    copiedToast: 'Details copied',
    copyFailed: "Couldn't copy. Please try again.",
  },
})

const DETAIL_KEYS = [
  'problem_description',
  'city',
  'service_provider',
  'merchant_name',
  'prior_provider_contact',
  'location_or_address',
  'account_or_meter_number',
  'bill_reference',
  'previous_report_number',
  'purchase_proof',
] as const

type RecommendationCardProps = {
  analysis: ComplaintAnalysis
  onSave: () => void
  isSaving?: boolean
  /** When present, the create button is disabled and this notice is shown. */
  saveDisabledNotice?: string
}

export function RecommendationCard({
  analysis,
  onSave,
  isSaving = false,
  saveDisabledNotice,
}: RecommendationCardProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const prefersReducedMotion = useReducedMotion()
  const [justCopied, setJustCopied] = useState(false)

  const entity = getGovernmentEntityByName(analysis.entityName)
  const profile = getAuthorityProfile(analysis.entityName)
  const procedure = profile ? primaryProcedure(profile) : null
  const procedureSource = procedure ? getProfileSource(procedure.source) : null
  const lang = locale === 'en' ? 'en' : 'ar'
  const entityText = entity ? localizeEntity(entity, locale) : null
  const labels = locale === 'en' ? ENGLISH_FIELD_LABELS : COMPLAINT_FIELD_LABELS
  const details = DETAIL_KEYS.map((key) => ({
    key,
    label: labels[key] ?? key,
    value: analysis.collectedFields?.[key]?.trim() ?? '',
  })).filter((entry) => entry.value !== '')

  // The routing reason is authored in Arabic by the server; English users get
  // an accurate, generic explanation instead of a mixed-language sentence.
  const reason =
    locale === 'ar' && analysis.entityDescription ? analysis.entityDescription : copy.whyFallback

  async function handleCopy() {
    const text = [
      `${copy.authority}: ${entityText?.name ?? analysis.entityName}`,
      ...details.map((entry) => `${entry.label}: ${entry.value}`),
      `${copy.officialChannel}: ${analysis.officialUrl}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setJustCopied(true)
      showToast(copy.copiedToast)
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      showToast(copy.copyFailed, 'error')
    }
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: locale === 'ar' ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-surface border-border shadow-soft flex flex-col gap-5 rounded-2xl border p-5"
    >
      <div className="flex items-start gap-3">
        <GovernmentLogo iconKey={analysis.entityIconKey} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-secondary text-xs font-medium">{copy.authority}</span>
          <h2 className="text-heading text-base leading-snug font-semibold">
            {entityText?.name ?? analysis.entityName}
          </h2>
          {entityText ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {entityText.description}
            </p>
          ) : null}
        </div>
      </div>

      <Section title={copy.why}>
        <p className="text-muted-foreground text-sm leading-relaxed">{reason}</p>
      </Section>

      {entityText ? (
        <Section title={copy.category}>
          <span className="bg-secondary/12 text-secondary inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium">
            {entityText.sector}
          </span>
        </Section>
      ) : null}

      <Section title={copy.details}>
        {details.length > 0 ? (
          <dl className="flex flex-col gap-2">
            {details.map((entry) => (
              <div key={entry.key} className="flex flex-col gap-0.5">
                <dt className="text-subtle-foreground text-[11px] font-medium">{entry.label}</dt>
                <dd dir="auto" className="text-foreground text-sm leading-relaxed break-words">
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">{copy.noDetails}</p>
        )}
      </Section>

      {profile ? (
        <details className="group flex flex-col gap-2">
          <summary className="text-foreground cursor-pointer text-xs font-semibold">
            {copy.verifiedInfo}
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-subtle-foreground text-[11px] font-medium">{copy.channels}</p>
              <ul className="flex flex-col gap-1">
                {profile.channels.map((channel) => (
                  <li key={`${channel.kind}-${channel.value}`} className="text-sm leading-relaxed">
                    <span className="text-muted-foreground">{channel.label[lang]}: </span>
                    {channel.kind === 'phone' ? (
                      <a
                        href={`tel:${channel.value}`}
                        dir="ltr"
                        className="text-primary font-medium"
                      >
                        {channel.value}
                      </a>
                    ) : channel.kind === 'email' ? (
                      <a href={`mailto:${channel.value}`} dir="ltr" className="text-primary">
                        {channel.value}
                      </a>
                    ) : channel.kind === 'url' ? (
                      <a
                        href={channel.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {copy.openLink}{' '}
                        <ExternalLink className="inline h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span dir="auto">{channel.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {procedure ? (
              <div className="flex flex-col gap-1">
                <p className="text-subtle-foreground text-[11px] font-medium">
                  {copy.steps}: {procedure.title[lang]}
                </p>
                <ol className="text-foreground list-decimal ps-5 text-sm leading-relaxed">
                  {procedure.steps[lang].map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {procedure.serviceTime ? (
                  <p className="text-muted-foreground text-xs">
                    {copy.serviceTime}: {procedure.serviceTime[lang]}
                  </p>
                ) : null}
                {procedure.fee ? (
                  <p className="text-muted-foreground text-xs">
                    {copy.fee}: {procedure.fee[lang]}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {procedureSource ? (
                  <a
                    href={procedureSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {copy.sourceLine(PROFILES_VERIFIED_AT)}
                  </a>
                ) : (
                  copy.sourceLine(PROFILES_VERIFIED_AT)
                )}
                . {copy.notListed}
              </span>
            </p>
          </div>
        </details>
      ) : (
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.unverifiedNote}
        </p>
      )}

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <a
          href={analysis.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {copy.openOfficial}
        </a>

        {saveDisabledNotice ? (
          <p className="text-muted-foreground text-center text-xs">{saveDisabledNotice}</p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          isLoading={isSaving}
          disabled={Boolean(saveDisabledNotice)}
          className="lg:self-center"
        >
          {isSaving ? null : <FileSignature className="h-4 w-4" aria-hidden="true" />}
          {isSaving ? copy.creating : copy.create}
        </Button>

        {details.length > 0 ? (
          <Button type="button" variant="ghost" onClick={handleCopy} className="w-full">
            {justCopied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {justCopied ? copy.copied : copy.copy}
          </Button>
        ) : null}
      </div>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-xs font-semibold">{title}</p>
      {children}
    </div>
  )
}
