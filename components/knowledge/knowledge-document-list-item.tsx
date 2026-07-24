import { KnowledgeDocumentStatusBadge } from '@/components/knowledge/knowledge-document-status-badge'
import type { MockKnowledgeDocument } from '@/types/knowledge'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type KnowledgeDocumentListItemProps = {
  document: MockKnowledgeDocument
}

export function KnowledgeDocumentListItem({ document }: KnowledgeDocumentListItemProps) {
  return (
    <div className="bg-surface flex flex-col gap-1.5 rounded-xl border border-gray-200 px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{document.title}</p>
        <KnowledgeDocumentStatusBadge status={document.status} />
      </div>
      <p className="truncate text-sm text-gray-600">{document.excerpt}</p>
      <p className="text-xs text-gray-400">
        {document.entity} · {document.sector} · آخر تحديث {formatDate(document.updatedAt)}
      </p>
    </div>
  )
}
