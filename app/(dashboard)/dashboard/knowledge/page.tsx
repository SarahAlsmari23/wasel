import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/page-header'
import { KnowledgeDocumentList } from '@/components/knowledge/knowledge-document-list'
import { MOCK_KNOWLEDGE_DOCUMENTS } from '@/lib/mock/knowledge-documents'

export const metadata: Metadata = {
  title: 'إدارة المعرفة',
  // Reachable by direct URL only — keep it out of search results too.
  robots: { index: false, follow: false },
}

/**
 * Reserved for future admin functionality. Deliberately NOT linked from the
 * sidebar, bottom nav, or user menu — see components/dashboard/nav-items.ts.
 * Access is still gated by the dashboard layout's auth check; a proper admin
 * role check belongs here once roles exist.
 */
export default function KnowledgePage() {
  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        title="إدارة المعرفة"
        description="مستندات قاعدة المعرفة المستخدمة في الإجابة على الاستفسارات. صفحة مخصصة للإدارة."
      />
      <KnowledgeDocumentList documents={MOCK_KNOWLEDGE_DOCUMENTS} />
    </div>
  )
}
