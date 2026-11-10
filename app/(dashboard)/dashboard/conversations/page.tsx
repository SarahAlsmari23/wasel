import { MessageSquareText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ConversationsBrowser } from '@/components/dashboard/conversations-browser'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserConversations } from '@/lib/db/conversations'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: {
    title: 'المحادثات',
    description: 'كل محادثاتك مع واصل — يمكنك متابعتها أو حذفها.',
    new: 'محادثة جديدة',
  },
  en: {
    title: 'Conversations',
    description: 'All your conversations with Wasel — continue or delete them.',
    new: 'New conversation',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].title }
}

export default async function ConversationsPage() {
  const copy = COPY[await getLocale()]
  const supabase = await createClient()
  const conversations = await getUserConversations(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/wasal?mode=assistant" className={buttonClasses('primary', 'md')}>
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            {copy.new}
          </Link>
        }
      />

      <ConversationsBrowser conversations={conversations} />
    </div>
  )
}
