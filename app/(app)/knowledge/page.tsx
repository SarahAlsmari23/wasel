import { KnowledgeDocumentList } from '@/components/knowledge/knowledge-document-list'
import { MOCK_KNOWLEDGE_DOCUMENTS } from '@/lib/mock/knowledge-documents'

export default function KnowledgePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">إدارة المعرفة</h1>
        <p className="mt-1 text-sm text-gray-600">
          استعرض مستندات قاعدة المعرفة المستخدمة في الإجابة على استفساراتك.
        </p>
      </div>
      <KnowledgeDocumentList documents={MOCK_KNOWLEDGE_DOCUMENTS} />
    </div>
  )
}
