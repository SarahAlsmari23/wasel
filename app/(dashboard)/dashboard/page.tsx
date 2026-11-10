import { CheckCircle2, FileCheck2, FolderClock, MessagesSquare } from 'lucide-react'
import type { Metadata } from 'next'
import { ContinueCard } from '@/components/dashboard/continue-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { StatCard } from '@/components/dashboard/stat-card'
import { getUserProfile } from '@/lib/auth/user-profile'
import { getUserComplaints } from '@/lib/db/complaints'
import { getUserConversations, getUserDrafts } from '@/lib/db/conversations'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: {
    metaTitle: 'لوحة التحكم',
    greetingFallback: 'بك',
    greeting: 'مرحباً،',
    lead: 'هذه نظرة عامة على بلاغاتك ومحادثاتك مع واصل.',
    statsHeading: 'إحصائيات سريعة',
    ready: 'جاهزة للتقديم',
    submitted: 'بلاغات قدّمتها',
    drafts: 'مسودات محفوظة',
    conversations: 'محادثات سابقة',
  },
  en: {
    metaTitle: 'Dashboard',
    greetingFallback: 'back',
    greeting: 'Welcome,',
    lead: 'An overview of your complaints and conversations with Wasel.',
    statsHeading: 'Quick statistics',
    ready: 'Ready to submit',
    submitted: 'Submitted complaints',
    drafts: 'Saved drafts',
    conversations: 'Past conversations',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].metaTitle }
}

export default async function DashboardPage() {
  const locale = await getLocale()
  const copy = COPY[locale]
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The middleware and the layout both redirect unauthenticated visitors, so
  // reaching here without a user means an unexpected state — render a neutral
  // greeting rather than throwing and replacing the page with an error screen.
  const profile = user ? getUserProfile(user) : null
  const greetingName = profile?.firstName ?? copy.greetingFallback

  // Three independent, RLS-scoped reads — no service role, no fabricated content.
  const [conversations, complaints, drafts] = user
    ? await Promise.all([
        getUserConversations(supabase),
        getUserComplaints(supabase),
        getUserDrafts(supabase),
      ])
    : [[], [], []]

  const latestDraft = drafts.at(0)

  // Every figure is a count of the user's own records.
  const readyCount = complaints.filter(
    (complaint) => complaint.status === 'generated' && !complaint.submittedAt,
  ).length
  const submittedCount = complaints.filter((complaint) => Boolean(complaint.submittedAt)).length

  const recentComplaints = complaints.slice(0, 4)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div>
        <h1 className="text-heading text-2xl font-semibold">
          {copy.greeting} {greetingName} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{copy.lead}</p>
      </div>

      {latestDraft ? (
        <ContinueCard draft={latestDraft} showViewAllDrafts={drafts.length > 1} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-heading text-sm font-semibold">{copy.statsHeading}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={copy.ready}
            value={readyCount}
            icon={FileCheck2}
            href="/dashboard/complaints"
            locale={locale}
          />
          <StatCard
            label={copy.submitted}
            value={submittedCount}
            icon={CheckCircle2}
            href="/dashboard/complaints"
            locale={locale}
          />
          <StatCard
            label={copy.drafts}
            value={drafts.length}
            icon={FolderClock}
            href="/dashboard/drafts"
            locale={locale}
          />
          <StatCard
            label={copy.conversations}
            value={conversations.length}
            icon={MessagesSquare}
            href="/dashboard/conversations"
            locale={locale}
          />
        </div>
      </section>

      <QuickActions
        continueDraftHref={latestDraft ? `/wasal?conversationId=${latestDraft.id}` : undefined}
      />

      <RecentActivity complaints={recentComplaints} />
    </div>
  )
}
