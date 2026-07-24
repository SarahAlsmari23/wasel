import { MOCK_CONVERSATIONS } from '@/lib/mock/conversations'
import { ConversationList } from '@/components/conversations/conversation-list'

export default function ConversationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">المحادثات</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          تابع محادثاتك مع وصال وسجل بلاغاتك بسهولة.
        </p>
      </div>
      <ConversationList conversations={MOCK_CONVERSATIONS} />
    </div>
  )
}
