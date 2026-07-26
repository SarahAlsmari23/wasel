/**
 * ILLUSTRATIVE PLACEHOLDER VALUES for the MVP landing page only. These are UI
 * elements, not a real platform track record — the surrounding section carries
 * a "بيانات توضيحية" note so they are never read as measured results.
 */

export type PlatformStat = {
  id: string
  label: string
  value: number
  /** Rendered right after the number, e.g. "%" or "+". */
  suffix?: string
  description: string
}

export const PLATFORM_STATS: PlatformStat[] = [
  {
    id: 'authorities',
    label: 'جهة حكومية مدعومة',
    value: 5,
    description: 'قطاعات نغطيها اليوم ونعمل على توسيعها.',
  },
  {
    id: 'complaints',
    label: 'بلاغ تمت المساعدة فيه',
    value: 1200,
    suffix: '+',
    description: 'بلاغات جرت صياغتها وتوجيهها عبر واصل.',
  },
  {
    id: 'accuracy',
    label: 'دقة تحديد الجهة',
    value: 96,
    suffix: '%',
    description: 'نسبة توجيه البلاغ إلى الجهة الصحيحة.',
  },
  {
    id: 'services',
    label: 'خدمة حكومية متاحة',
    value: 40,
    suffix: '+',
    description: 'خدمات يمكن لواصل إرشادك خلالها.',
  },
]
