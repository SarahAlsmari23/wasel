import { Badge } from '@/components/ui/badge'
import type { KnowledgeDocumentStatus } from '@/types/knowledge'

const STATUS_LABELS: Record<'ar' | 'en', Record<KnowledgeDocumentStatus, string>> = {
  ar: { active: 'نشط', inactive: 'غير نشط' },
  en: { active: 'Active', inactive: 'Inactive' },
}

const STATUS_VARIANTS: Record<KnowledgeDocumentStatus, 'primary' | 'neutral'> = {
  active: 'primary',
  inactive: 'neutral',
}

type KnowledgeDocumentStatusBadgeProps = {
  status: KnowledgeDocumentStatus
  locale?: 'ar' | 'en'
}

export function KnowledgeDocumentStatusBadge({
  status,
  locale = 'ar',
}: KnowledgeDocumentStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[locale][status]}</Badge>
}
