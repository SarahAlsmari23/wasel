import { ExternalLink, Landmark } from 'lucide-react'
import Link from 'next/link'
import type { ChatSuggestedEntity } from '@/types/ai'

type EntityRecommendationCardProps = {
  entity: ChatSuggestedEntity
  officialUrl?: string
}

export function EntityRecommendationCard({ entity, officialUrl }: EntityRecommendationCardProps) {
  return (
    <div className="border-secondary/20 bg-surface flex w-full flex-col gap-4 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="bg-secondary/15 text-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Landmark className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-secondary text-xs font-medium">الجهة المقترحة</p>
          <p className="text-foreground text-sm font-semibold">{entity.name}</p>
          <p className="text-sm text-gray-600">{entity.reason}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/complaints/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors"
        >
          بدء شكوى لهذه الجهة
        </Link>
        {officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-medium transition-colors hover:bg-gray-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            الانتقال إلى موقع الجهة
          </a>
        ) : null}
      </div>
    </div>
  )
}
