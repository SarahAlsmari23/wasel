import { notFound } from 'next/navigation'
import { getMockConversationById } from '@/lib/mock/conversations'
import { ConversationView } from '@/components/conversations/conversation-view'

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const conversation = getMockConversationById(id)

  if (!conversation) {
    notFound()
  }

  return <ConversationView conversation={conversation} />
}
