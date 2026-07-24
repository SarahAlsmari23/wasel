// ILLUSTRATIVE SAMPLE DATA ONLY. The real complaints table has no data yet —
// these numbers are for demonstrating the public marketing page's layout,
// never presented as a real platform track record. Every place this is used
// must show a "بيانات توضيحية" (sample data) label alongside it.

export const SAMPLE_SUMMARY_STATS = {
  submitted: 128,
  inProgress: 42,
  drafts: 19,
}

export type SampleChartItem = {
  label: string
  value: number
}

export const SAMPLE_COMPLAINT_TYPES: SampleChartItem[] = [
  { label: 'تأخر في تقديم الخدمة', value: 38 },
  { label: 'اعتراض على فاتورة', value: 27 },
  { label: 'ضعف التغطية', value: 18 },
  { label: 'انقطاع الخدمة', value: 15 },
]

export const SAMPLE_ENTITY_DISTRIBUTION: SampleChartItem[] = [
  { label: 'وزارة البلديات والإسكان', value: 34 },
  { label: 'الشركة الوطنية للمياه', value: 26 },
  { label: 'هيئة الاتصالات والفضاء والتقنية', value: 22 },
  { label: 'الشركة السعودية للكهرباء', value: 18 },
]

export const SAMPLE_ACTIVITY: SampleChartItem[] = [
  { label: 'السبت', value: 12 },
  { label: 'الأحد', value: 18 },
  { label: 'الاثنين', value: 22 },
  { label: 'الثلاثاء', value: 15 },
  { label: 'الأربعاء', value: 20 },
  { label: 'الخميس', value: 10 },
  { label: 'الجمعة', value: 6 },
]
