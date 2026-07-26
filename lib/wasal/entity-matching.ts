import { GOVERNMENT_ENTITIES, type GovernmentEntity } from '@/lib/mock/government-entities'

/**
 * Keyword → entity routing used by the mocked assistant. Deliberately simple
 * and transparent: whichever entity's keywords appear most often in the text
 * wins, and nothing is returned when no keyword matches at all.
 */
const ENTITY_KEYWORDS: Record<string, string[]> = {
  balady: [
    'بلدية',
    'البلدية',
    'أمانة',
    'الأمانة',
    'بلدي',
    'رصيف',
    'شارع',
    'حفرة',
    'نفايات',
    'قمامة',
    'إنارة',
    'حديقة',
    'سوق',
    'مبنى',
    'رخصة بناء',
  ],
  nwc: ['مياه', 'المياه', 'ماء', 'صرف صحي', 'الصرف', 'تسرب', 'عداد المياه', 'انقطاع المياه'],
  sec: [
    'كهرباء',
    'الكهرباء',
    'تيار',
    'التيار',
    'انقطاع الكهرباء',
    'عداد الكهرباء',
    'فاتورة الكهرباء',
  ],
  cst: [
    'اتصالات',
    'الاتصالات',
    'انترنت',
    'إنترنت',
    'شبكة',
    'تغطية',
    'جوال',
    'باقة',
    'stc',
    'موبايلي',
    'زين',
  ],
  mc: [
    'متجر',
    'محل',
    'تاجر',
    'التجارة',
    'تجاري',
    'استرجاع',
    'استبدال',
    'ضمان',
    'مستهلك',
    'المستهلك',
    'غش',
    'فاتورة شراء',
    'منتج',
    'طلب أونلاين',
  ],
}

export type EntityMatch = {
  entity: GovernmentEntity
  /** How many distinct keywords matched — drives the confidence score. */
  hits: number
}

export function matchEntity(text: string): EntityMatch | undefined {
  const normalized = text.toLowerCase()

  let best: EntityMatch | undefined
  for (const entity of GOVERNMENT_ENTITIES) {
    const keywords = ENTITY_KEYWORDS[entity.id] ?? []
    const hits = keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { entity, hits }
    }
  }

  return best
}

/** Picks the entity's category that best fits what the user described. */
export function matchCategory(entity: GovernmentEntity, text: string): string {
  const normalized = text.toLowerCase()

  if (/فاتور|مبلغ|رسوم|سعر|خصم|تعويض/.test(normalized)) {
    const billing = entity.categories.find((category) => /فاتورة|تعويض|استرجاع/.test(category))
    if (billing) return billing
  }

  if (/انقطاع|توقف|معطل|عطل|لا يعمل/.test(normalized)) {
    const outage = entity.categories.find((category) => /انقطاع|أعطال/.test(category))
    if (outage) return outage
  }

  if (/تأخر|تأخير|لم يتم الرد|بدون رد|منذ/.test(normalized)) {
    const delay = entity.categories.find((category) => /تأخر/.test(category))
    if (delay) return delay
  }

  return entity.categories[0]
}
