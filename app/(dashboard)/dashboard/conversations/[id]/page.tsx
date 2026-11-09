import { ArrowLeft, ArrowRight, MessageSquareText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChatMessage } from '@/components/wasal/chat-message'
import { ConversationDeleteButton } from '@/components/dashboard/conversation-delete-button'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConversationStatusBadge } from '@/components/ui/status-badge'
import { getConversationWithMessages } from '@/lib/db/conversations'
import { localizeTitle } from '@/lib/complaints/display'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { entityDisplayName } from '@/lib/mock/government-entities'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'

const COPY = defineCopy({
  ar: {
    fallbackTitle: 'المحادثة',
    back: 'العودة إلى المحادثات',
    empty: 'لا توجد رسائل في هذه المحادثة.',
    continue: 'متابعة المحادثة',
    complaint: 'عرض البلاغ المرتبط',
  },
  en: {
    fallbackTitle: 'Conversation',
    back: 'Back to conversations',
    empty: 'There are no messages in this conversation.',
    continue: 'Continue conversation',
    complaint: 'View the linked complaint',
  },
})

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const conversation = await getConversationWithMessages(supabase, id)
  const locale = await getLocale()
  return {
    title: conversation
      ? localizeTitle(conversation.title, locale)
      : COPY[locale].fallbackTitle,
  }
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const conversation = await getConversationWithMessages(supabase, id)

  if (!conversation) {
    notFound()
  }

  const messages = conversation.messages ?? []
  const locale = await getLocale()
  const copy = COPY[locale]
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft
  const title = localizeTitle(conversation.title, locale)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        href="/dashboard/conversations"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.back}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 dir="auto" className="text-heading text-2xl font-semibold text-balance">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {conversation.entityName
              ? `${entityDisplayName(conversation.entityName, locale)} · `
              : ''}
            {formatDate(conversation.createdAt, locale)}
          </p>
        </div>
        <ConversationStatusBadge status={conversation.status} locale={locale} />
      </div>

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {copy.empty}
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
          {copy.continue}
        </Link>
        {conversation.complaintId ? (
          <Link
            href={`/dashboard/complaints/${conversation.complaintId}`}
            className={buttonClasses('outline', 'md', 'w-full sm:w-auto')}
          >
            {copy.complaint}
          </Link>
        ) : null}
        <ConversationDeleteButton conversationId={conversation.id} title={title} />
      </div>
    </div>
  )
}
