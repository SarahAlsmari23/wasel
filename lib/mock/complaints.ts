import { dateDaysAgo, daysAgo, hoursAgo } from '@/lib/mock/clock'
import { getGovernmentEntityById } from '@/lib/mock/government-entities'
import type { MockComplaint } from '@/types/complaint'

export const MOCK_COMPLAINTS: MockComplaint[] = [
  {
    id: 'p1',
    title: 'اعتراض على فاتورة اتصالات',
    entityId: 'cst',
    entityName: 'هيئة الاتصالات والفضاء والتقنية',
    entityIconKey: 'telecom',
    categoryName: 'اعتراض على فاتورة',
    status: 'draft',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2),
    referenceNumber: '',
    description:
      'رفضت شركة الاتصالات تعويض فاتورتي رغم انقطاع الخدمة لأكثر من أسبوع، ولم يتم الرد على شكواي لديهم.',
    summary: 'رفض تعويض فاتورة رغم انقطاع الخدمة لأكثر من أسبوع.',
    city: 'الرياض',
    issueDate: dateDaysAgo(12),
    contactFullName: 'جمانة الحربي',
    requiredDocuments: getGovernmentEntityById('cst')?.requiredDocuments ?? [],
    draftText: `إلى: هيئة الاتصالات والفضاء والتقنية
الموضوع: اعتراض على فاتورة

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقعة أدناه، جمانة الحربي، بصفتي أحد المستفيدين من خدمات هيئة الاتصالات والفضاء والتقنية، بشكوى بخصوص اعتراض على فاتورة.

تفاصيل المشكلة:
رفضت شركة الاتصالات تعويض فاتورتي رغم انقطاع الخدمة لأكثر من أسبوع، ولم يتم الرد على شكواي لديهم.

المدينة: الرياض

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
جمانة الحربي`,
    timeline: [{ label: 'تم إنشاء المسودة', at: hoursAgo(3) }],
    conversationId: 'c1',
  },
  {
    id: 'p2',
    title: 'تأخر معالجة طلب بلدي',
    entityId: 'balady',
    entityName: 'وزارة البلديات والإسكان',
    entityIconKey: 'municipality',
    categoryName: 'تأخر في تقديم الخدمة',
    status: 'ready',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
    referenceNumber: '458291',
    description: 'تم تقديم طلب صيانة رصيف منذ أكثر من ثلاثة أسابيع دون أي تحديث على حالته.',
    summary: 'طلب صيانة رصيف متوقف منذ أكثر من ثلاثة أسابيع.',
    city: 'الرياض',
    issueDate: dateDaysAgo(24),
    contactFullName: 'جمانة الحربي',
    requiredDocuments: getGovernmentEntityById('balady')?.requiredDocuments ?? [],
    draftText: `إلى: وزارة البلديات والإسكان
الموضوع: تأخر في تقديم الخدمة

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقعة أدناه، جمانة الحربي، بصفتي أحد المستفيدين من خدمات وزارة البلديات والإسكان، بشكوى بخصوص تأخر في تقديم الخدمة.

تفاصيل المشكلة:
تم تقديم طلب صيانة رصيف منذ أكثر من ثلاثة أسابيع دون أي تحديث على حالته.

المدينة: الرياض
الرقم المرجعي السابق: 458291

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
جمانة الحربي`,
    timeline: [
      { label: 'تم إنشاء البلاغ', at: daysAgo(10) },
      { label: 'تم تحديد الجهة المختصة', at: daysAgo(10) },
      { label: 'تم تحديث الحالة إلى جاهز للتقديم', at: daysAgo(3) },
    ],
  },
  {
    id: 'p3',
    title: 'رفض استرجاع منتج من متجر إلكتروني',
    entityId: 'mc',
    entityName: 'وزارة التجارة',
    entityIconKey: 'commerce',
    categoryName: 'رفض استرجاع أو تعويض',
    status: 'submitted',
    createdAt: daysAgo(18),
    updatedAt: daysAgo(6),
    referenceNumber: '772103',
    description:
      'رفض المتجر استرجاع منتج وصل تالفاً رغم تقديم الطلب خلال مدة الاسترجاع المعلنة على موقعه.',
    summary: 'رفض استرجاع منتج تالف رغم التقديم خلال مدة الاسترجاع.',
    city: 'جدة',
    issueDate: dateDaysAgo(21),
    contactFullName: 'جمانة الحربي',
    requiredDocuments: getGovernmentEntityById('mc')?.requiredDocuments ?? [],
    draftText: `إلى: وزارة التجارة
الموضوع: رفض استرجاع أو تعويض

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقعة أدناه، جمانة الحربي، بصفتي أحد المستفيدين، بشكوى بخصوص رفض استرجاع أو تعويض.

تفاصيل المشكلة:
رفض المتجر استرجاع منتج وصل تالفاً رغم تقديم الطلب خلال مدة الاسترجاع المعلنة على موقعه.

المدينة: جدة
الرقم المرجعي السابق: 772103

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
جمانة الحربي`,
    timeline: [
      { label: 'تم إنشاء البلاغ', at: daysAgo(18) },
      { label: 'تم تحديد الجهة المختصة', at: daysAgo(18) },
      { label: 'تم تقديم البلاغ إلى الجهة', at: daysAgo(6) },
    ],
  },
  {
    id: 'p4',
    title: 'اعتراض على فاتورة مياه',
    entityId: 'nwc',
    entityName: 'الشركة الوطنية للمياه',
    entityIconKey: 'water',
    categoryName: 'اعتراض على فاتورة',
    status: 'completed',
    createdAt: daysAgo(32),
    updatedAt: daysAgo(14),
    referenceNumber: '331204',
    description: 'الفاتورة الأخيرة أعلى من المعتاد بشكل ملحوظ رغم عدم تغير الاستهلاك.',
    summary: 'فاتورة مياه مرتفعة بشكل غير معتاد دون تغير في الاستهلاك.',
    city: 'الدمام',
    issueDate: dateDaysAgo(36),
    contactFullName: 'جمانة الحربي',
    requiredDocuments: getGovernmentEntityById('nwc')?.requiredDocuments ?? [],
    draftText: `إلى: الشركة الوطنية للمياه
الموضوع: اعتراض على فاتورة

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقعة أدناه، جمانة الحربي، بصفتي أحد المستفيدين من خدمات الشركة الوطنية للمياه، بشكوى بخصوص اعتراض على فاتورة.

تفاصيل المشكلة:
الفاتورة الأخيرة أعلى من المعتاد بشكل ملحوظ رغم عدم تغير الاستهلاك.

المدينة: الدمام
الرقم المرجعي السابق: 331204

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
جمانة الحربي`,
    timeline: [
      { label: 'تم إنشاء البلاغ', at: daysAgo(32) },
      { label: 'تم تقديم البلاغ إلى الجهة', at: daysAgo(28) },
      { label: 'تم تصحيح الفاتورة وإغلاق البلاغ', at: daysAgo(14) },
    ],
  },
  {
    id: 'p5',
    title: 'انقطاع إنارة شارع رئيسي',
    entityId: 'sec',
    entityName: 'الشركة السعودية للكهرباء',
    entityIconKey: 'electricity',
    categoryName: 'أعطال الإنارة',
    status: 'draft',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    referenceNumber: '',
    description: 'انطفاء إنارة الشارع الرئيسي في الحي منذ أكثر من أسبوع دون معالجة.',
    summary: 'إنارة شارع رئيسي متوقفة منذ أكثر من أسبوع.',
    city: 'مكة المكرمة',
    issueDate: dateDaysAgo(12),
    contactFullName: 'جمانة الحربي',
    requiredDocuments: getGovernmentEntityById('sec')?.requiredDocuments ?? [],
    draftText: `إلى: الشركة السعودية للكهرباء
الموضوع: أعطال الإنارة

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقعة أدناه، جمانة الحربي، بصفتي أحد المستفيدين من خدمات الشركة السعودية للكهرباء، بشكوى بخصوص أعطال الإنارة.

تفاصيل المشكلة:
انطفاء إنارة الشارع الرئيسي في الحي منذ أكثر من أسبوع دون معالجة.

المدينة: مكة المكرمة

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
جمانة الحربي`,
    timeline: [{ label: 'تم إنشاء المسودة', at: daysAgo(5) }],
  },
]

export function getMockComplaintById(id: string): MockComplaint | undefined {
  if (!id) return undefined
  return MOCK_COMPLAINTS.find((complaint) => complaint.id === id)
}

/**
 * Sorts newest-first, treating an unparseable date as epoch 0 so a malformed
 * `updatedAt` pushes the record to the end instead of producing NaN
 * comparisons and an unstable order.
 */
function byUpdatedAtDescending(a: MockComplaint, b: MockComplaint): number {
  const left = new Date(b.updatedAt).getTime() || 0
  const right = new Date(a.updatedAt).getTime() || 0
  return left - right
}

/** Drafts, newest first — powers "Continue Where You Left Off" and /drafts. */
export function getMockDrafts(): MockComplaint[] {
  return MOCK_COMPLAINTS.filter((complaint) => complaint.status === 'draft').sort(
    byUpdatedAtDescending,
  )
}

/** All complaints, newest first. */
export function getMockComplaintsByRecency(): MockComplaint[] {
  return [...MOCK_COMPLAINTS].sort(byUpdatedAtDescending)
}
