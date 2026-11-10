import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { KnowledgeDocumentList } from '@/components/knowledge/knowledge-document-list'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { MOCK_KNOWLEDGE_DOCUMENTS } from '@/lib/mock/knowledge-documents'

const COPY = defineCopy({
  ar: {
    title: 'إدارة المعرفة',
    description: 'مستندات قاعدة المعرفة المستخدمة في الإجابة على الاستفسارات. صفحة مخصصة للإدارة.',
  },
  en: {
    title: 'Knowledge management',
    description: 'Knowledge-base documents used to answer enquiries. For administrators.',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY[await getLocale()].title,
    // Reachable by direct URL only — keep it out of search results too.
    robots: { index: false, follow: false },
  }
}

/**
 * Reserved for future admin functionality. Deliberately NOT linked from the
 * sidebar, bottom nav, or user menu — see components/dashboard/nav-items.ts.
 * Access is still gated by the dashboard layout's auth check; a proper admin
 * role check belongs here once roles exist.
 */
/**
 * Reserved for a future admin tool. It renders illustrative mock documents,
 * so it is only available in local development — never in a production
 * deployment, where it could be mistaken for real data.
 */
export default async function KnowledgePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const copy = COPY[await getLocale()]
  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader title={copy.title} description={copy.description} />
      <KnowledgeDocumentList documents={MOCK_KNOWLEDGE_DOCUMENTS} />
    </div>
  )
}
