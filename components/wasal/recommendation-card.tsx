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
import type { ComplaintAnalysis } from '@/types/wasal'

/*
 * No confidence score here by design: once the analysis has settled on a
 * final authority, an internal certainty metric only undermines the result.
 *
 * Only information Wasel can stand behind is shown: the authority, why it was
 * selected, and its verified official website. Required documents, steps,
 * processing times and contact details are not yet verified in Wasel's
 * reference data, so the card says so plainly instead of inventing them.
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
    verified: 'رابط رسمي موثّق',
    unverifiedNote:
      'المستندات المطلوبة وخطوات التقديم ومدة المعالجة وبيانات التواصل غير متوفرة بعد في مصادر واصل الموثّقة — راجعها في الموقع الرسمي للجهة.',
    openOfficial: 'الانتقال إلى الموقع الرسمي',
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
    verified: 'Verified official link',
    unverifiedNote:
      "Required documents, submission steps, processing times and contact details aren't yet available in Wasel's verified sources — please check them on the authority's official website.",
    openOfficial: 'Go to the official website',
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
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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

      <Section title={copy.officialChannel}>
        <a
          href={analysis.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover inline-flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span dir="ltr">{analysis.officialUrl.replace(/^https?:\/\//, '')}</span>
        </a>
        <span className="text-status-success text-[11px] font-medium">{copy.verified}</span>
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.unverifiedNote}
        </p>
      </Section>

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        {saveDisabledNotice ? (
          <p className="text-muted-foreground text-center text-xs">{saveDisabledNotice}</p>
        ) : null}

        <Button
          type="button"
          onClick={onSave}
          isLoading={isSaving}
          disabled={Boolean(saveDisabledNotice)}
          className="w-full"
        >
          {isSaving ? null : <FileSignature className="h-4 w-4" aria-hidden="true" />}
          {isSaving ? copy.creating : copy.create}
        </Button>

        <a
          href={analysis.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface text-heading hover:border-primary/35 hover:bg-surface-tint hover:text-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {copy.openOfficial}
        </a>

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
