import type { MockConversation } from '@/types/conversation'

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'c1',
    title: 'شكوى تأخر معالجة طلب',
    preview: 'قدمت طلباً منذ أكثر من أسبوعين ولم يتم الرد عليه حتى الآن.',
    status: 'active',
    updatedAt: '2026-07-23T10:15:00.000Z',
    messages: [
      {
        id: 'c1-m1',
        role: 'user',
        content: 'قدمت طلباً منذ أكثر من أسبوعين ولم يتم الرد عليه حتى الآن. ما سبب التأخير؟',
        createdAt: '2026-07-23T10:10:00.000Z',
      },
      {
        id: 'c1-m2',
        role: 'assistant',
        content:
          'شكراً لتواصلك معنا. يرجى تزويدنا برقم الطلب حتى نتمكن من التحقق من حالته ومتابعته مع الجهة المختصة.',
        createdAt: '2026-07-23T10:12:00.000Z',
      },
      {
        id: 'c1-m3',
        role: 'user',
        content: 'رقم الطلب هو 458291.',
        createdAt: '2026-07-23T10:15:00.000Z',
      },
    ],
  },
  {
    id: 'c2',
    title: 'مشكلة فاتورة خدمة',
    preview: 'الفاتورة الأخيرة أعلى من المعتاد بشكل ملحوظ.',
    status: 'completed',
    updatedAt: '2026-07-20T08:40:00.000Z',
    messages: [
      {
        id: 'c2-m1',
        role: 'user',
        content: 'فوجئت بأن الفاتورة الأخيرة أعلى من المعتاد بشكل كبير، هل يوجد خطأ في القراءة؟',
        createdAt: '2026-07-20T08:30:00.000Z',
      },
      {
        id: 'c2-m2',
        role: 'assistant',
        content:
          'تم تسجيل ملاحظتك وإحالتها إلى الجهة المختصة لمراجعة القراءة والتأكد من صحة الفاتورة.',
        createdAt: '2026-07-20T08:33:00.000Z',
      },
      {
        id: 'c2-m3',
        role: 'assistant',
        content: 'تم تصحيح الفاتورة بعد المراجعة، ونعتذر عن هذا الالتباس.',
        createdAt: '2026-07-20T08:40:00.000Z',
      },
    ],
  },
  {
    id: 'c3',
    title: 'استفسار عن جهة الاختصاص',
    preview: 'لا أعرف الجهة الحكومية المسؤولة عن هذا النوع من البلاغات.',
    status: 'active',
    updatedAt: '2026-07-22T16:05:00.000Z',
    messages: [
      {
        id: 'c3-m1',
        role: 'user',
        content: 'لدي مشكلة تتعلق برصيف مكسور أمام المنزل، ما الجهة المسؤولة عن معالجتها؟',
        createdAt: '2026-07-22T16:00:00.000Z',
      },
      {
        id: 'c3-m2',
        role: 'assistant',
        content: 'هذا النوع من البلاغات يقع ضمن اختصاص الأمانة أو البلدية التابع لها الموقع.',
        createdAt: '2026-07-22T16:05:00.000Z',
      },
    ],
  },
  {
    id: 'c4',
    title: 'بلاغ متعلق بخدمة بلدية',
    preview: 'تراكم النفايات في الحي منذ عدة أيام دون رفع.',
    status: 'completed',
    updatedAt: '2026-07-18T12:20:00.000Z',
    messages: [
      {
        id: 'c4-m1',
        role: 'user',
        content: 'يوجد تراكم للنفايات في الحي منذ عدة أيام دون رفعها، هل يمكن المتابعة؟',
        createdAt: '2026-07-18T12:10:00.000Z',
      },
      {
        id: 'c4-m2',
        role: 'assistant',
        content: 'تم إرسال البلاغ إلى فريق النظافة بالبلدية، وسيتم الرفع خلال يوم عمل.',
        createdAt: '2026-07-18T12:15:00.000Z',
      },
      {
        id: 'c4-m3',
        role: 'user',
        content: 'تم رفع النفايات فعلاً، شكراً لكم.',
        createdAt: '2026-07-18T12:20:00.000Z',
      },
    ],
  },
  {
    id: 'c5',
    title: 'انقطاع الكهرباء المتكرر',
    preview: 'انقطاع متكرر في التيار الكهربائي خلال الأسبوع الماضي.',
    status: 'active',
    updatedAt: '2026-07-23T09:00:00.000Z',
    messages: [
      {
        id: 'c5-m1',
        role: 'user',
        content: 'يحدث انقطاع متكرر في التيار الكهربائي في حيّنا خلال الأسبوع الماضي.',
        createdAt: '2026-07-23T08:55:00.000Z',
      },
      {
        id: 'c5-m2',
        role: 'assistant',
        content:
          'نأسف على هذا الإزعاج. تم تسجيل بلاغك وإحالته إلى شركة الكهرباء المختصة لفحص الشبكة في المنطقة.',
        createdAt: '2026-07-23T09:00:00.000Z',
      },
    ],
  },
]

export function getMockConversationById(id: string): MockConversation | undefined {
  return MOCK_CONVERSATIONS.find((conversation) => conversation.id === id)
}
