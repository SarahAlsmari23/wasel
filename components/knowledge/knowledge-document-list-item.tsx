import { KnowledgeDocumentStatusBadge } from '@/components/knowledge/knowledge-document-status-badge'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import type { MockKnowledgeDocument } from '@/types/knowledge'

type KnowledgeDocumentListItemProps = {
  document: MockKnowledgeDocument
}

export function KnowledgeDocumentListItem({ document }: KnowledgeDocumentListItemProps) {
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{document.title}</p>
        <KnowledgeDocumentStatusBadge status={document.status} />
      </div>
      <p className="text-muted-foreground truncate text-sm">{document.excerpt}</p>
      <p className="text-muted-foreground text-xs">
        {document.entity} · {document.sector} · آخر تحديث {formatDate(document.updatedAt)}
      </p>
    </Card>
  )
}
