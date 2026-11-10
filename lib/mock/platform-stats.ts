import type { Locale } from '@/lib/i18n/config'

/**
 * Platform facts shown on the landing page. Every figure here is a verifiable
 * property of the product itself — not usage or accuracy metrics. Wasel does
 * not publish usage statistics it cannot substantiate.
 */
export type PlatformStat = {
  id: string
  /** Numeric facts are locale-formatted; `display` is shown verbatim. */
  value?: number
  display?: string
  label: Record<Locale, string>
  description: Record<Locale, string>
}

export const PLATFORM_STATS: PlatformStat[] = [
  {
    id: 'authorities',
    value: 5,
    label: { ar: 'جهات حكومية مدعومة', en: 'Supported government authorities' },
    description: {
      ar: 'البلديات، المياه، الكهرباء، الاتصالات، والتجارة.',
      en: 'Municipal services, water, electricity, telecoms, and commerce.',
    },
  },
  {
    id: 'languages',
    value: 2,
    label: { ar: 'لغتان', en: 'Languages' },
    description: {
      ar: 'العربية والإنجليزية، في المحادثة وصياغة البلاغ.',
      en: 'Arabic and English, in conversation and in the drafted complaint.',
    },
  },
  {
    id: 'steps',
    value: 3,
    label: { ar: 'خطوات إلى بلاغ رسمي', en: 'Steps to a formal complaint' },
    description: {
      ar: 'صف المشكلة، تعرّف على الجهة، ثم أنشئ البلاغ.',
      en: 'Describe the problem, meet the authority, create the complaint.',
    },
  },
  {
    id: 'availability',
    display: '24/7',
    label: { ar: 'متاح في أي وقت', en: 'Available any time' },
    description: {
      ar: 'اسأل واصل متى احتجت، دون مواعيد أو انتظار.',
      en: 'Ask Wasel whenever you need, with no appointments or queues.',
    },
  },
]
