import { Badge } from '@/components/ui/badge'
import type { KnowledgeDocumentStatus } from '@/types/knowledge'

const STATUS_LABELS: Record<KnowledgeDocumentStatus, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
}

const STATUS_VARIANTS: Record<KnowledgeDocumentStatus, 'primary' | 'neutral'> = {
  active: 'primary',
  inactive: 'neutral',
}

type KnowledgeDocumentStatusBadgeProps = {
  status: KnowledgeDocumentStatus
}

export function KnowledgeDocumentStatusBadge({ status }: KnowledgeDocumentStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}
