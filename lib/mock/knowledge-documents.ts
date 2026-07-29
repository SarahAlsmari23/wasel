import type { MockKnowledgeDocument } from '@/types/knowledge'

export const MOCK_KNOWLEDGE_DOCUMENTS: MockKnowledgeDocument[] = [
  {
    id: 'k1',
    title: 'دور وزارة التجارة في حماية المستهلك',
    excerpt: 'تختص وزارة التجارة بالإشراف على الأسواق التجارية وحماية حقوق المستهلك.',
    entity: 'وزارة التجارة',
    sector: 'التجارة',
    status: 'active',
    updatedAt: '2026-07-24T09:00:00.000Z',
  },
  {
    id: 'k2',
    title: 'دور هيئة الاتصالات والفضاء والتقنية',
    excerpt: 'تتولى الهيئة تنظيم قطاع الاتصالات وخدمات الإنترنت في المملكة.',
    entity: 'هيئة الاتصالات والفضاء والتقنية',
    sector: 'الاتصالات',
    status: 'active',
    updatedAt: '2026-07-23T14:30:00.000Z',
  },
  {
    id: 'k3',
    title: 'اختصاص وزارة البلديات والإسكان بالخدمات البلدية',
    excerpt: 'تشرف الوزارة على الخدمات البلدية المتعلقة بالطرق والإنارة والنظافة.',
    entity: 'وزارة البلديات والإسكان',
    sector: 'البلديات',
    status: 'active',
    updatedAt: '2026-07-22T11:15:00.000Z',
  },
  {
    id: 'k4',
    title: 'دور الشركة الوطنية للمياه',
    excerpt: 'تختص الشركة بتقديم خدمات المياه والصرف الصحي للمشتركين.',
    entity: 'الشركة الوطنية للمياه',
    sector: 'المياه',
    status: 'active',
    updatedAt: '2026-07-21T08:45:00.000Z',
  },
  {
    id: 'k5',
    title: 'دور السعودية للطاقة',
    excerpt: 'تتولى الشركة توليد ونقل وتوزيع الطاقة الكهربائية لمشتركيها.',
    entity: 'السعودية للطاقة',
    sector: 'الكهرباء',
    status: 'active',
    updatedAt: '2026-07-20T16:00:00.000Z',
  },
  {
    id: 'k6',
    title: 'مستند مؤرشف عن إجراء سابق',
    excerpt: 'محتوى قديم تم استبداله بمستند أحدث ولم يعد مستخدماً في الإجابات.',
    entity: 'وزارة التجارة',
    sector: 'التجارة',
    status: 'inactive',
    updatedAt: '2026-06-15T12:00:00.000Z',
  },
]

export function getMockKnowledgeDocumentById(id: string): MockKnowledgeDocument | undefined {
  return MOCK_KNOWLEDGE_DOCUMENTS.find((document) => document.id === id)
}
