import { MessageSquareText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ConversationsBrowser } from '@/components/dashboard/conversations-browser'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserConversations } from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'المحادثات',
}

export default async function ConversationsPage() {
  const supabase = await createClient()
  const conversations = await getUserConversations(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeader
        title="المحادثات"
        description="كل محادثاتك مع واصل — يمكنك متابعتها أو حذفها."
        action={
          <Link href="/wasal?mode=assistant" className={buttonClasses('primary', 'md')}>
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            محادثة جديدة
          </Link>
        }
      />

      <ConversationsBrowser conversations={conversations} />
    </div>
  )
}
