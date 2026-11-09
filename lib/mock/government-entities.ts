/**
 * Single source of truth for the government authorities Wasal supports.
 * Replaces the previously separate marketing/complaint entity lists.
 *
 * Official URLs are the real published portals for these authorities — the
 * same ones already used by scripts/ingest-knowledge.ts. Everything else
 * (required documents, submission steps) is illustrative MVP content.
 *
 * `iconKey` selects a clean placeholder glyph; real government logo assets
 * will replace these later (see components/government/government-logo.tsx).
 */

export type GovernmentIconKey = 'municipality' | 'water' | 'electricity' | 'telecom' | 'commerce'

/**
 * The single source of truth for official government logo assets.
 *
 * Every surface that shows an authority — the Government Entities page, the AI
 * recommendation popup, complaint cards, the dashboard — resolves its image
 * through this map via <GovernmentLogo />, so no component hardcodes a path and
 * adding an authority means adding one line here.
 *
 * Files live in /public/logos and are the authorities' own artwork, used
 * unmodified: transparent PNGs, never cropped, stretched or recoloured.
 */
export const GOVERNMENT_LOGOS: Record<GovernmentIconKey, string> = {
  municipality: '/logos/balady.png', // وزارة البلديات والإسكان
  water: '/logos/nwc.png', // الشركة الوطنية للمياه
  electricity: '/logos/sec.png', // السعودية للطاقة
  telecom: '/logos/cst.png', // هيئة الاتصالات والفضاء والتقنية
  commerce: '/logos/mc.png', // وزارة التجارة
}

export function getGovernmentLogo(iconKey: GovernmentIconKey | undefined): string | undefined {
  return iconKey ? GOVERNMENT_LOGOS[iconKey] : undefined
}

export type GovernmentEntity = {
  id: string
  name: string
  sector: string
  description: string
  officialUrl: string
  iconKey: GovernmentIconKey
  /** Complaint categories this authority handles. */
  categories: string[]
  requiredDocuments: string[]
  submissionSteps: string[]
  /**
   * English presentation. `name` is the authority's own official English
   * name — never a translation invented here. Guidance text mirrors the
   * Arabic entries one-for-one.
   */
  en: {
    name: string
    sector: string
    description: string
    categories: string[]
    requiredDocuments: string[]
    submissionSteps: string[]
  }
}

export const GOVERNMENT_ENTITIES: GovernmentEntity[] = [
  {
    id: 'balady',
    name: 'وزارة البلديات والإسكان',
    sector: 'البلديات',
    description: 'الجهة المسؤولة عن الخدمات البلدية والطرق والمرافق العامة والنظافة.',
    officialUrl: 'https://balady.gov.sa',
    iconKey: 'municipality',
    categories: ['تأخر في تقديم الخدمة', 'نظافة وصيانة', 'مخالفات بلدية'],
    requiredDocuments: ['صورة توضح المشكلة', 'تحديد الموقع أو العنوان', 'رقم الطلب السابق إن وجد'],
    submissionSteps: [
      'الدخول إلى منصة بلدي عبر النفاذ الوطني الموحد.',
      'اختيار «البلاغات» ثم نوع البلاغ المناسب.',
      'إرفاق الصور وتحديد الموقع على الخريطة.',
      'إرسال البلاغ والاحتفاظ بالرقم المرجعي للمتابعة.',
    ],
    en: {
      name: 'Ministry of Municipalities and Housing',
      sector: 'Municipal services',
      description: 'Responsible for municipal services, roads, public facilities and cleanliness.',
      categories: ['Service delays', 'Cleanliness and maintenance', 'Municipal violations'],
      requiredDocuments: ['A photo showing the problem', 'The location or address', 'Any previous request number'],
      submissionSteps: [
        'Sign in to the Balady platform with the National Single Sign-On (Nafath).',
        'Choose “Reports” and then the matching report type.',
        'Attach photos and pin the location on the map.',
        'Submit the report and keep the reference number for follow-up.',
      ],
    },
  },
  {
    id: 'nwc',
    name: 'الشركة الوطنية للمياه',
    sector: 'المياه',
    description: 'الجهة المسؤولة عن خدمات المياه والصرف الصحي والفوترة.',
    officialUrl: 'https://www.nwc.com.sa',
    iconKey: 'water',
    categories: ['اعتراض على فاتورة', 'انقطاع الخدمة', 'تسرب مياه'],
    requiredDocuments: [
      'صورة الفاتورة محل الاعتراض',
      'رقم الحساب أو رقم العداد',
      'قراءة العداد الحالية',
    ],
    submissionSteps: [
      'تسجيل الدخول إلى حسابك في منصة الشركة الوطنية للمياه.',
      'اختيار «تقديم شكوى» وتحديد نوع الشكوى.',
      'إرفاق الفاتورة وبيانات الحساب.',
      'متابعة حالة الشكوى عبر الرقم المرجعي.',
    ],
    en: {
      name: 'National Water Company',
      sector: 'Water',
      description: 'Responsible for water and wastewater services and billing.',
      categories: ['Bill dispute', 'Service outage', 'Water leak'],
      requiredDocuments: ['A copy of the disputed bill', 'Account or meter number', 'The current meter reading'],
      submissionSteps: [
        'Sign in to your account on the National Water Company platform.',
        'Choose “Submit a complaint” and select the complaint type.',
        'Attach the bill and your account details.',
        'Track the complaint using its reference number.',
      ],
    },
  },
  {
    id: 'sec',
    name: 'السعودية للطاقة',
    sector: 'الكهرباء',
    description: 'الجهة المسؤولة عن توليد ونقل وتوزيع الطاقة الكهربائية.',
    officialUrl: 'https://www.se.com.sa',
    iconKey: 'electricity',
    categories: ['انقطاع الخدمة', 'اعتراض على فاتورة', 'أعطال الإنارة'],
    requiredDocuments: [
      'رقم الحساب الكهربائي',
      'صورة الفاتورة إن كان الاعتراض على الفوترة',
      'وصف موقع العطل',
    ],
    submissionSteps: [
      'الدخول إلى الخدمات الإلكترونية لشركة السعودية للطاقة.',
      'اختيار «الشكاوى والبلاغات».',
      'تعبئة تفاصيل البلاغ وإرفاق المستندات.',
      'حفظ الرقم المرجعي لمتابعة البلاغ.',
    ],
    en: {
      name: 'Saudi Energy (SE)',
      sector: 'Electricity',
      description: 'Responsible for electricity generation, transmission and distribution (formerly Saudi Electricity Company).',
      categories: ['Service outage', 'Bill dispute', 'Lighting faults'],
      requiredDocuments: ['Electricity account number', 'A copy of the bill, for billing disputes', 'A description of the fault location'],
      submissionSteps: [
        'Open the Saudi Energy e-services.',
        'Choose “Complaints and reports”.',
        'Fill in the report details and attach documents.',
        'Keep the reference number to follow up.',
      ],
    },
  },
  {
    id: 'cst',
    name: 'هيئة الاتصالات والفضاء والتقنية',
    sector: 'الاتصالات',
    description: 'الجهة المنظمة لقطاع الاتصالات وخدمات الإنترنت في المملكة.',
    officialUrl: 'https://www.cst.gov.sa',
    iconKey: 'telecom',
    categories: ['ضعف التغطية', 'اعتراض على فاتورة', 'جودة الخدمة'],
    requiredDocuments: [
      'رقم الشكوى المقدمة سابقاً لمزود الخدمة',
      'صورة الفاتورة أو العقد',
      'ما يثبت المراسلات مع مزود الخدمة',
    ],
    submissionSteps: [
      'تقديم الشكوى أولاً لمزود الخدمة والحصول على رقم مرجعي.',
      'في حال عدم المعالجة خلال المدة النظامية، الانتقال إلى منصة هيئة الاتصالات.',
      'رفع الشكوى مع إرفاق الرقم المرجعي والمستندات.',
      'متابعة الرد عبر المنصة.',
    ],
    en: {
      name: 'Communications, Space & Technology Commission (CST)',
      sector: 'Telecommunications',
      description: 'The regulator of the telecommunications and internet services sector in the Kingdom.',
      categories: ['Weak coverage', 'Bill dispute', 'Service quality'],
      requiredDocuments: [
        'The complaint number previously filed with the service provider',
        'A copy of the bill or contract',
        'Evidence of correspondence with the provider',
      ],
      submissionSteps: [
        'File the complaint with your service provider first and obtain a reference number.',
        'If it is not resolved within the regulatory period, escalate on the CST platform.',
        'Submit the complaint with the provider reference number and documents.',
        'Follow the response on the platform.',
      ],
    },
  },
  {
    id: 'mc',
    name: 'وزارة التجارة',
    sector: 'التجارة وحماية المستهلك',
    description: 'الجهة المسؤولة عن حماية المستهلك والإشراف على الأسواق والمنشآت التجارية.',
    officialUrl: 'https://mc.gov.sa',
    iconKey: 'commerce',
    categories: ['حماية المستهلك', 'رفض استرجاع أو تعويض', 'غش تجاري'],
    requiredDocuments: [
      'الفاتورة أو إثبات الشراء',
      'إثبات المراسلات مع المتجر',
      'صور المنتج إن وجدت',
    ],
    submissionSteps: [
      'الدخول إلى منصة وزارة التجارة أو تطبيق «تجارة».',
      'اختيار «تقديم بلاغ» وتحديد نوع المخالفة.',
      'إرفاق الفاتورة وإثبات التواصل مع المتجر.',
      'متابعة البلاغ عبر الرقم المرجعي.',
    ],
    en: {
      name: 'Ministry of Commerce',
      sector: 'Commerce and consumer protection',
      description: 'Responsible for consumer protection and oversight of markets and businesses.',
      categories: ['Consumer protection', 'Refused refund or compensation', 'Commercial fraud'],
      requiredDocuments: ['The invoice or proof of purchase', 'Evidence of correspondence with the store', 'Photos of the product, if any'],
      submissionSteps: [
        'Open the Ministry of Commerce platform or the “Tejarah” app.',
        'Choose “Submit a report” and select the violation type.',
        'Attach the invoice and proof of contact with the store.',
        'Track the report using its reference number.',
      ],
    },
  },
]

export function getGovernmentEntityById(id: string): GovernmentEntity | undefined {
  return GOVERNMENT_ENTITIES.find((entity) => entity.id === id)
}

export function getGovernmentEntityByName(name: string): GovernmentEntity | undefined {
  return GOVERNMENT_ENTITIES.find((entity) => entity.name === name)
}

/** The entity's display fields in the requested language (Arabic = as stored). */
export function localizeEntity(
  entity: GovernmentEntity,
  locale: 'ar' | 'en',
): Pick<
  GovernmentEntity,
  'name' | 'sector' | 'description' | 'categories' | 'requiredDocuments' | 'submissionSteps'
> {
  if (locale === 'ar') return entity
  return entity.en
}

/** English official name for a stored Arabic authority name, when known. */
export function entityDisplayName(arabicName: string | null | undefined, locale: 'ar' | 'en'): string {
  if (!arabicName) return ''
  if (locale === 'ar') return arabicName
  return getGovernmentEntityByName(arabicName)?.en.name ?? arabicName
}
