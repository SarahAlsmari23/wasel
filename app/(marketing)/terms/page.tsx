import type { Metadata } from 'next'
import { LegalDocument, type LegalDocumentContent } from '@/components/marketing/legal-document'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy<LegalDocumentContent & { metaDescription: string }>({
  ar: {
    title: 'الشروط والأحكام',
    metaDescription: 'شروط استخدام واصل.',
    updated: 'آخر تحديث: نوفمبر 2026',
    intro: 'باستخدامك واصل فإنك توافق على الشروط التالية. يُرجى قراءتها بعناية.',
    sections: [
      {
        heading: 'طبيعة الخدمة',
        items: [
          'واصل مساعد قائم على الذكاء الاصطناعي يساعدك في فهم شكواك وتحديد الجهة المختصة وصياغة بلاغ رسمي.',
          'واصل ليس جهة حكومية ولا يمثّل أي جهة حكومية، ولا يقدّم البلاغات نيابةً عنك. تقديم البلاغ يتم من قِبلك عبر القناة الرسمية للجهة.',
          'الرقم المرجعي الذي يظهر في واصل رقم داخلي في المنصة، وليس رقم بلاغ لدى الجهة الحكومية.',
        ],
      },
      {
        heading: 'حدود المسؤولية',
        items: [
          'قد تحتوي إجابات الذكاء الاصطناعي على أخطاء. راجع البلاغ وتحقق من المعلومات والروابط الرسمية قبل تقديمه.',
          'لا يقدّم واصل استشارات قانونية أو تنظيمية ملزمة.',
          'قرارات الجهات الحكومية ومدد المعالجة خارج نطاق واصل.',
        ],
      },
      {
        heading: 'استخدامك للخدمة',
        items: [
          'قدّم معلومات صحيحة تخصك أو تخص شكوى أنت طرف فيها.',
          'لا تستخدم واصل لإرسال محتوى مسيء أو مضلل أو لأغراض خارج نطاق الخدمات الحكومية.',
          'تُطبّق حدود على عدد الرسائل في الدقيقة لحماية الخدمة من إساءة الاستخدام.',
        ],
      },
      {
        heading: 'الخصوصية',
        paragraphs: ['تتعامل واصل مع بياناتك وفق سياسة الخصوصية المنشورة في المنصة.'],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    metaDescription: 'The terms of using Wasel.',
    updated: 'Last updated: November 2026',
    intro: 'By using Wasel you agree to the following terms. Please read them carefully.',
    sections: [
      {
        heading: 'What the service is',
        items: [
          'Wasel is an AI-based assistant that helps you understand your complaint, identify the responsible authority, and draft a formal complaint.',
          'Wasel is not a government authority, does not represent any government authority, and does not submit complaints on your behalf. You submit the complaint yourself through the authority’s official channel.',
          'The reference number shown in Wasel is an internal platform reference, not a complaint number at the government authority.',
        ],
      },
      {
        heading: 'Limitations',
        items: [
          'AI answers may contain mistakes. Review the complaint and verify the information and official links before submitting it.',
          'Wasel does not provide binding legal or regulatory advice.',
          'Government authorities’ decisions and processing times are outside Wasel’s control.',
        ],
      },
      {
        heading: 'Your use of the service',
        items: [
          'Provide accurate information about yourself or a complaint you are a party to.',
          'Don’t use Wasel to send abusive or misleading content, or for purposes outside government services.',
          'Per-minute message limits apply to protect the service from abuse.',
        ],
      },
      {
        heading: 'Privacy',
        paragraphs: [
          'Wasel handles your data according to the privacy policy published on the platform.',
        ],
      },
    ],
  },
})

export async function generateMetadata(): Promise<Metadata> {
  const copy = COPY[await getLocale()]
  return { title: copy.title, description: copy.metaDescription }
}

export default async function TermsPage() {
  return <LegalDocument content={COPY[await getLocale()]} />
}
