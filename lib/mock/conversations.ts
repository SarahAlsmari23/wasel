import { daysAgo, hoursAgo } from '@/lib/mock/clock'
import type { MockConversation } from '@/types/conversation'

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'c1',
    title: 'اعتراض على فاتورة اتصالات',
    preview: 'رفضت شركة الاتصالات تعويض فاتورتي بعد انقطاع الخدمة.',
    mode: 'complaint',
    status: 'active',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2),
    entityName: 'هيئة الاتصالات والفضاء والتقنية',
    complaintId: 'p1',
    messages: [
      {
        id: 'c1-m1',
        role: 'assistant',
        content:
          'سأساعدك في إعداد بلاغ احترافي جاهز للتقديم.\n\nلنبدأ. **ما هي الجهة أو الخدمة التي تواجه المشكلة معها؟**',
        createdAt: hoursAgo(3),
      },
      {
        id: 'c1-m2',
        role: 'user',
        content: 'شركة الاتصالات التي أشترك معها.',
        createdAt: hoursAgo(3),
      },
      {
        id: 'c1-m3',
        role: 'assistant',
        content: '**اشرح لي المشكلة بالتفصيل.** ما الذي حدث بالضبط، ومتى بدأ؟',
        createdAt: hoursAgo(3),
      },
      {
        id: 'c1-m4',
        role: 'user',
        content:
          'انقطعت الخدمة لأكثر من أسبوع، وطلبت تعويضاً على الفاتورة لكنهم رفضوا ولم يردوا على شكواي.',
        createdAt: hoursAgo(2),
      },
    ],
  },
  {
    id: 'c2',
    title: 'استفسار عن الجهة المختصة',
    preview: 'لدي مشكلة تتعلق برصيف مكسور أمام المنزل، ما الجهة المسؤولة؟',
    mode: 'assistant',
    status: 'completed',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    entityName: 'وزارة البلديات والإسكان',
    messages: [
      {
        id: 'c2-m1',
        role: 'user',
        content: 'لدي مشكلة تتعلق برصيف مكسور أمام المنزل، ما الجهة المسؤولة عن معالجتها؟',
        createdAt: daysAgo(2),
      },
      {
        id: 'c2-m2',
        role: 'assistant',
        content:
          'بحسب وصفك، الجهة المختصة بهذه المشكلة هي **وزارة البلديات والإسكان**.\n\nهذا النوع من البلاغات يقع ضمن اختصاص الأمانة أو البلدية التابع لها الموقع.\n\n**المستندات التي يُفضّل تجهيزها:**\n- صورة توضح المشكلة\n- تحديد الموقع أو العنوان',
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    id: 'c3',
    title: 'خطوات تقديم شكوى على متجر',
    preview: 'كيف أقدم شكوى على متجر إلكتروني رفض الاسترجاع؟',
    mode: 'assistant',
    status: 'completed',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
    entityName: 'وزارة التجارة',
    messages: [
      {
        id: 'c3-m1',
        role: 'user',
        content: 'كيف أقدم شكوى على متجر إلكتروني رفض استرجاع منتج تالف؟',
        createdAt: daysAgo(6),
      },
      {
        id: 'c3-m2',
        role: 'assistant',
        content:
          'بحسب وصفك، الجهة المختصة بهذه المشكلة هي **وزارة التجارة**.\n\n**خطوات التقديم:**\n1. الدخول إلى منصة وزارة التجارة أو تطبيق «تجارة».\n2. اختيار «تقديم بلاغ» وتحديد نوع المخالفة.\n3. إرفاق الفاتورة وإثبات التواصل مع المتجر.',
        createdAt: daysAgo(6),
      },
    ],
  },
  {
    id: 'c4',
    title: 'تأخر معالجة طلب بلدي',
    preview: 'قدمت طلب صيانة رصيف منذ ثلاثة أسابيع دون رد.',
    mode: 'complaint',
    status: 'completed',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    entityName: 'وزارة البلديات والإسكان',
    complaintId: 'p2',
    messages: [
      {
        id: 'c4-m1',
        role: 'user',
        content: 'قدمت طلب صيانة رصيف منذ أكثر من ثلاثة أسابيع ولم يتم الرد عليه.',
        createdAt: daysAgo(10),
      },
      {
        id: 'c4-m2',
        role: 'assistant',
        content:
          'اكتمل التحليل ✅\n\nالجهة المختصة بشكواك هي **وزارة البلديات والإسكان**، ضمن تصنيف **تأخر في تقديم الخدمة**.',
        createdAt: daysAgo(10),
      },
    ],
  },
  {
    id: 'c5',
    title: 'انقطاع الكهرباء المتكرر',
    preview: 'انقطاع متكرر في التيار الكهربائي خلال الأسبوع الماضي.',
    mode: 'assistant',
    status: 'active',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
    entityName: 'الشركة السعودية للكهرباء',
    messages: [
      {
        id: 'c5-m1',
        role: 'user',
        content: 'يحدث انقطاع متكرر في التيار الكهربائي في حيّنا خلال الأسبوع الماضي.',
        createdAt: daysAgo(4),
      },
      {
        id: 'c5-m2',
        role: 'assistant',
        content:
          'بحسب وصفك، الجهة المختصة بهذه المشكلة هي **الشركة السعودية للكهرباء**.\n\n**تصنيف الشكوى المرجّح:** انقطاع الخدمة',
        createdAt: daysAgo(4),
      },
    ],
  },
]

export function getMockConversationById(id: string): MockConversation | undefined {
  return MOCK_CONVERSATIONS.find((conversation) => conversation.id === id)
}
