import { ArrowRight, MessageSquareText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChatMessage } from '@/components/wasal/chat-message'
import { ConversationDeleteButton } from '@/components/dashboard/conversation-delete-button'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConversationStatusBadge } from '@/components/ui/status-badge'
import { getConversationWithMessages } from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const conversation = await getConversationWithMessages(supabase, id)
  return { title: conversation?.title ?? 'المحادثة' }
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const conversation = await getConversationWithMessages(supabase, id)

  if (!conversation) {
    notFound()
  }

  const messages = conversation.messages ?? []

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        href="/dashboard/conversations"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        العودة إلى المحادثات
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading text-2xl font-semibold text-balance">{conversation.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {conversation.entityName ? `${conversation.entityName} · ` : ''}
            {formatDate(conversation.createdAt)}
          </p>
        </div>
        <ConversationStatusBadge status={conversation.status} />
      </div>

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            لا توجد رسائل في هذه المحادثة.
          </p>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/wasal?conversationId=${conversation.id}`}
          className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          متابعة المحادثة
        </Link>
        {conversation.complaintId ? (
          <Link
            href={`/dashboard/complaints/${conversation.complaintId}`}
            className={buttonClasses('outline', 'md', 'w-full sm:w-auto')}
          >
            عرض البلاغ المرتبط
          </Link>
        ) : null}
        <ConversationDeleteButton conversationId={conversation.id} title={conversation.title} />
      </div>
    </div>
  )
}
