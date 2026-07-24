export type MarketingEntity = {
  id: string
  name: string
  description: string
  officialUrl: string
}

// Public-facing descriptions for the marketing site. Same 5 entities and
// real official URLs already used elsewhere in this project (Phase 2 seed
// data, scripts/ingest-knowledge.ts) — not fabricated.
export const MARKETING_ENTITIES: MarketingEntity[] = [
  {
    id: 'mc',
    name: 'وزارة التجارة',
    description: 'الجهة المسؤولة عن حماية المستهلك والإشراف على الأسواق التجارية.',
    officialUrl: 'https://mc.gov.sa',
  },
  {
    id: 'cst',
    name: 'هيئة الاتصالات والفضاء والتقنية',
    description: 'الجهة المنظمة لقطاع الاتصالات وخدمات الإنترنت في المملكة.',
    officialUrl: 'https://www.cst.gov.sa',
  },
  {
    id: 'balady',
    name: 'وزارة البلديات والإسكان',
    description: 'الجهة المسؤولة عن الخدمات البلدية والطرق والمرافق العامة.',
    officialUrl: 'https://balady.gov.sa',
  },
  {
    id: 'nwc',
    name: 'الشركة الوطنية للمياه',
    description: 'الجهة المسؤولة عن خدمات المياه والصرف الصحي.',
    officialUrl: 'https://www.nwc.com.sa',
  },
  {
    id: 'sec',
    name: 'الشركة السعودية للكهرباء',
    description: 'الجهة المسؤولة عن توليد ونقل وتوزيع الطاقة الكهربائية.',
    officialUrl: 'https://www.se.com.sa',
  },
]
