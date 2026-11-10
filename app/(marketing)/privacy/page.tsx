import type { Metadata } from 'next'
import { LegalDocument, type LegalDocumentContent } from '@/components/marketing/legal-document'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

/*
 * Every statement below describes how the application actually behaves in
 * code (see app/wasal/*, lib/db/*, lib/ai/*, supabase/migrations/*). It makes
 * no certification or regulatory-compliance claims. Update it whenever data
 * handling changes.
 */
const COPY = defineCopy<LegalDocumentContent & { metaDescription: string }>({
  ar: {
    title: 'سياسة الخصوصية',
    metaDescription: 'كيف يتعامل واصل مع بياناتك.',
    updated: 'آخر تحديث: نوفمبر 2026',
    intro:
      'توضح هذه الصفحة البيانات التي يتعامل معها واصل وسبب ذلك. واصل مساعد ذكي يساعدك في إعداد الشكاوى، وليس جهة حكومية، ولا يرسل بلاغاتك إلى أي جهة نيابةً عنك.',
    sections: [
      {
        heading: 'البيانات التي نتعامل معها',
        items: [
          'بيانات الحساب: البريد الإلكتروني والاسم الكامل، أو الاسم والبريد من حساب Google إذا اخترت تسجيل الدخول به.',
          'المحادثات: رسائلك وردود واصل، وتُحفظ في حسابك فقط عند تسجيل الدخول.',
          'تفاصيل الشكوى التي تقدّمها في المحادثة (مثل وصف المشكلة والمدينة واسم مزود الخدمة)، والبلاغات التي يُنشئها واصل ونسخها، وحالة تقديمك لها.',
          'تفضيلات بسيطة على جهازك: لغة الواجهة (ملف تعريف ارتباط) والمظهر الفاتح/الداكن (تخزين المتصفح).',
        ],
      },
      {
        heading: 'الزوار دون تسجيل دخول',
        paragraphs: [
          'يمكنك استخدام المساعد دون حساب. في هذه الحالة تبقى المحادثة في متصفحك فقط (تخزين الجلسة) ولا تُحفظ في قاعدة بياناتنا، لكن رسائلك تُرسل إلى خدمة الذكاء الاصطناعي لمعالجتها والرد عليها.',
        ],
      },
      {
        heading: 'كيف نستخدم البيانات',
        items: [
          'لفهم شكواك وتحديد الجهة المختصة والإجابة عن أسئلتك.',
          'لصياغة البلاغ الرسمي من التفاصيل التي قدّمتها أنت.',
          'لحفظ محادثاتك وبلاغاتك في لوحة التحكم الخاصة بك.',
          'لا نبيع بياناتك ولا نستخدمها للإعلانات.',
        ],
      },
      {
        heading: 'مقدمو الخدمات',
        paragraphs: [
          'تعتمد واصل على مزودين خارجيين لتشغيل الخدمة: Supabase لقاعدة البيانات والمصادقة، وVercel للاستضافة، وCloudflare Workers AI لتشغيل نموذج Meta Llama للمحادثة ولإنشاء التمثيلات المستخدمة في البحث في المصادر الرسمية. قد تتم معالجة البيانات لدى هؤلاء المزودين خارج المملكة العربية السعودية.',
          'لا تكتب في المحادثة معلومات حساسة غير ضرورية مثل رقم الهوية الوطنية أو بيانات البطاقات البنكية أو كلمات المرور. يستبعد واصل هذه الحقول تلقائياً من تفاصيل البلاغ المحفوظة.',
        ],
      },
      {
        heading: 'حماية البيانات',
        items: [
          'كل جدول يحتوي على بيانات مستخدمين محمي بسياسات أمان على مستوى الصفوف، فلا يستطيع أي مستخدم قراءة بيانات مستخدم آخر.',
          'العمليات الحساسة (مثل حفظ ردود المساعد وإنشاء البلاغات) تتم على الخادم فقط بعد التحقق من ملكيتك للمحادثة.',
          'سجلات التشغيل لا تتضمن محتوى رسائلك.',
        ],
      },
      {
        heading: 'التحكم في بياناتك',
        items: [
          'يمكنك حذف أي محادثة في أي وقت من لوحة التحكم، ويؤدي ذلك إلى حذف رسائلها وتفاصيلها والبلاغ المرتبط بها نهائياً.',
          'يمكنك تعديل اسمك من صفحة الملف الشخصي.',
          'حذف الحساب بالكامل ذاتياً غير متاح بعد كخاصية في المنصة.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    metaDescription: 'How Wasel handles your data.',
    updated: 'Last updated: November 2026',
    intro:
      'This page explains what data Wasel handles and why. Wasel is an AI assistant that helps you prepare complaints. It is not a government authority, and it never sends your complaints to any authority on your behalf.',
    sections: [
      {
        heading: 'Data we handle',
        items: [
          'Account data: your email address and full name, or the name and email from your Google account if you sign in with Google.',
          'Conversations: your messages and Wasel’s replies, saved to your account only when you are signed in.',
          'Complaint details you provide in the conversation (such as the problem description, city, or provider name), the complaints Wasel drafts and their versions, and whether you marked them as submitted.',
          'Simple preferences on your device: interface language (a cookie) and light/dark appearance (browser storage).',
        ],
      },
      {
        heading: 'Using Wasel without an account',
        paragraphs: [
          'You can use the assistant without an account. In that case the conversation stays in your browser only (session storage) and is not saved in our database, but your messages are sent to the AI service so it can process them and reply.',
        ],
      },
      {
        heading: 'How we use data',
        items: [
          'To understand your complaint, identify the responsible authority, and answer your questions.',
          'To draft the formal complaint from the details you provided.',
          'To keep your conversations and complaints in your dashboard.',
          'We do not sell your data or use it for advertising.',
        ],
      },
      {
        heading: 'Service providers',
        paragraphs: [
          'Wasel relies on third-party providers to run the service: Supabase for the database and authentication, Vercel for hosting, and Cloudflare Workers AI to run the Meta Llama conversational model and to create the embeddings used to search official sources. Data may be processed by these providers outside Saudi Arabia.',
          'Please don’t type unnecessary sensitive information in the conversation, such as your national ID number, bank card details, or passwords. Wasel automatically excludes such fields from saved complaint details.',
        ],
      },
      {
        heading: 'How data is protected',
        items: [
          'Every table holding user data is protected by row-level security policies, so no user can read another user’s data.',
          'Sensitive operations (such as saving assistant replies and creating complaints) run on the server only, after verifying that you own the conversation.',
          'Operational logs do not include the content of your messages.',
        ],
      },
      {
        heading: 'Your control over your data',
        items: [
          'You can delete any conversation at any time from your dashboard; this permanently deletes its messages, details, and any linked complaint.',
          'You can edit your name on your profile page.',
          'Full self-service account deletion is not yet available in the platform.',
        ],
      },
    ],
  },
})

export async function generateMetadata(): Promise<Metadata> {
  const copy = COPY[await getLocale()]
  return { title: copy.title, description: copy.metaDescription }
}

export default async function PrivacyPage() {
  return <LegalDocument content={COPY[await getLocale()]} />
}
