import { CheckCircle2, FileCheck2, FolderClock, MessagesSquare } from 'lucide-react'
import { ArrowLeft, ArrowRight, MessageSquareText, SquarePen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ContinueCard } from '@/components/dashboard/continue-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { StatCard } from '@/components/dashboard/stat-card'
import { buttonClasses } from '@/components/ui/button'
import { getUserProfile } from '@/lib/auth/user-profile'
import { getUserComplaints } from '@/lib/db/complaints'
import { getUserConversations, getUserDrafts } from '@/lib/db/conversations'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: {
    metaTitle: 'لوحة التحكم',
    greeting: (name: string) => `مرحباً، ${name}`,
    greetingFallback: 'مرحباً بك',
    lead: 'هذه نظرة عامة على بلاغاتك ومحادثاتك مع واصل.',
    statsHeading: 'نظرة سريعة',
    eyebrow: 'لوحة التحكم',
    newComplaint: 'بلاغ جديد',
    askWasel: 'اسأل واصل',
    ready: 'جاهزة للتقديم',
    submitted: 'بلاغات قدّمتها',
    drafts: 'مسودات غير مكتملة',
    conversations: 'محادثات محفوظة',
  },
  en: {
    metaTitle: 'Dashboard',
    greeting: (name: string) => `Welcome, ${name}`,
    greetingFallback: 'Welcome',
    lead: 'An overview of your complaints and conversations with Wasel.',
    statsHeading: 'At a glance',
    eyebrow: 'Dashboard',
    newComplaint: 'New complaint',
    askWasel: 'Ask Wasel',
    ready: 'Ready to submit',
    submitted: 'Submitted complaints',
    drafts: 'Unfinished drafts',
    conversations: 'Saved conversations',
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

  const profile = user ? getUserProfile(user) : null

  const [conversations, complaints, drafts] = user
    ? await Promise.all([
        getUserConversations(supabase),
        getUserComplaints(supabase),
        getUserDrafts(supabase),
      ])
    : [[], [], []]

  const latestDraft = drafts.at(0)

  // Every figure is a count of the user's own RLS-scoped records. "Ready to
  // submit" leads, because it is the one that asks the user to act.
  const readyCount = complaints.filter(
    (complaint) => complaint.status === 'generated' && !complaint.submittedAt,
  ).length
  const submittedCount = complaints.filter((complaint) => Boolean(complaint.submittedAt)).length

  const recentComplaints = complaints.slice(0, 4)

  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-8">
      {/*
        Welcome panel: greeting, the two primary actions, and the four figures
        in one branded surface — the landing page's network artwork behind the
        greeting, a ruled stats strip along its foot.
      */}
      <section className="wasel-brand-band border-border overflow-hidden rounded-3xl border">
        <div className="flex flex-col gap-5 px-5 pt-6 pb-6 sm:px-7 sm:pt-8 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 className="text-heading text-2xl leading-tight font-semibold sm:text-[1.75rem]">
              {profile ? copy.greeting(profile.firstName) : copy.greetingFallback}
            </h1>
            <p className="text-muted-foreground text-sm">{copy.lead}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
              <SquarePen className="h-4 w-4" aria-hidden="true" />
              {copy.newComplaint}
            </Link>
            <Link href="/wasal?mode=assistant" className={buttonClasses('outline', 'md')}>
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              {copy.askWasel}
            </Link>
          </div>
        </div>

        <h2 className="sr-only">{copy.statsHeading}</h2>
        {/* 1px gaps over the border colour draw the hairlines in any direction. */}
        <div className="bg-border [&>*]:bg-surface grid grid-cols-2 gap-px border-t border-transparent lg:grid-cols-4">
          <StatCard
            label={copy.ready}
            value={readyCount}
            icon={FileCheck2}
            href="/dashboard/complaints"
            locale={locale}
            highlight
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {latestDraft ? (
            <ContinueCard draft={latestDraft} showViewAllDrafts={drafts.length > 1} />
          ) : null}
          <RecentActivity complaints={recentComplaints} />
        </div>

        <aside className="flex flex-col gap-8">
          <QuickActions
            continueDraftHref={latestDraft ? `/wasal?conversationId=${latestDraft.id}` : undefined}
          />
          <Link
            href="/dashboard/conversations"
            className="text-primary hover:text-primary-hover -mt-4 inline-flex items-center gap-1.5 self-start text-xs font-medium transition-colors"
          >
            {copy.conversations}
            <ForwardArrow className="h-3 w-3" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  )
}
