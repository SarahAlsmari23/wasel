'use client'

import { KnowledgeDocumentStatusBadge } from '@/components/knowledge/knowledge-document-status-badge'
import { Card } from '@/components/ui/card'
import { useLocale } from '@/components/i18n/locale-provider'
import { formatDate } from '@/lib/utils/format'
import type { MockKnowledgeDocument } from '@/types/knowledge'

type KnowledgeDocumentListItemProps = {
  document: MockKnowledgeDocument
}

export function KnowledgeDocumentListItem({ document }: KnowledgeDocumentListItemProps) {
  const locale = useLocale()
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{document.title}</p>
        <KnowledgeDocumentStatusBadge status={document.status} locale={locale} />
      </div>
      <p className="text-muted-foreground truncate text-sm">{document.excerpt}</p>
      <p className="text-muted-foreground text-xs">
        {document.entity} · {document.sector} · {locale === 'ar' ? 'آخر تحديث' : 'Updated'}{' '}
        {formatDate(document.updatedAt, locale)}
      </p>
    </Card>
  )
}
