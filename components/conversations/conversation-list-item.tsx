'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConversationStatusBadge } from '@/components/conversations/conversation-status-badge'
import type { MockConversation } from '@/types/conversation'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'الآن'
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'قبل دقيقة'
    if (diffMinutes === 2) return 'قبل دقيقتين'
    return `قبل ${diffMinutes} دقيقة`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    if (diffHours === 1) return 'قبل ساعة'
    if (diffHours === 2) return 'قبل ساعتين'
    return `قبل ${diffHours} ساعات`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'قبل يوم'
  if (diffDays === 2) return 'قبل يومين'
  if (diffDays <= 10) return `قبل ${diffDays} أيام`
  return `قبل ${diffDays} يوماً`
}

type ConversationListItemProps = {
  conversation: MockConversation
}

export function ConversationListItem({ conversation }: ConversationListItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/conversations/${conversation.id}`

  return (
    <Link
      href={`/conversations/${conversation.id}`}
      className={`bg-surface flex flex-col gap-1.5 rounded-xl border px-4 py-3.5 shadow-sm transition-all hover:shadow-md ${
        isActive ? 'border-primary/40' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{conversation.title}</p>
        <ConversationStatusBadge status={conversation.status} />
      </div>
      <p className="truncate text-sm text-gray-600">{conversation.preview}</p>
      <p className="text-xs text-gray-400">{formatRelativeTime(conversation.updatedAt)}</p>
    </Link>
  )
}
