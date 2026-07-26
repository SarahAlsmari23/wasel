import { Building2, CheckCircle2, FolderClock, MessagesSquare } from 'lucide-react'
import type { Metadata } from 'next'
import { ContinueCard } from '@/components/dashboard/continue-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { StatCard } from '@/components/dashboard/stat-card'
import { getUserProfile } from '@/lib/auth/user-profile'
import { getMockComplaintsByRecency, getMockDrafts, MOCK_COMPLAINTS } from '@/lib/mock/complaints'
import { MOCK_CONVERSATIONS } from '@/lib/mock/conversations'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'لوحة التحكم',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The middleware and the layout both redirect unauthenticated visitors, so
  // reaching here without a user means an unexpected state — render a neutral
  // greeting rather than throwing and replacing the page with an error screen.
  const profile = user ? getUserProfile(user) : null
  const greetingName = profile?.firstName ?? 'بك'

  const drafts = getMockDrafts()
  const latestDraft = drafts.at(0)

  const completedCount = MOCK_COMPLAINTS.filter(
    (complaint) => complaint.status === 'completed',
  ).length
  const recommendedEntityCount = new Set(
    MOCK_COMPLAINTS.map((complaint) => complaint.entityId).filter(Boolean),
  ).size

  const recentComplaints = getMockComplaintsByRecency().slice(0, 4)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div>
        <h1 className="text-heading text-2xl font-semibold">مرحباً، {greetingName} 👋</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          هذه نظرة عامة على بلاغاتك ومحادثاتك مع واصل.
        </p>
      </div>

      {latestDraft ? (
        <ContinueCard complaint={latestDraft} showViewAllDrafts={drafts.length > 1} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-heading text-sm font-semibold">إحصائيات سريعة</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="بلاغات مكتملة"
            value={completedCount}
            icon={CheckCircle2}
            href="/dashboard/complaints"
          />
          <StatCard
            label="مسودات محفوظة"
            value={drafts.length}
            icon={FolderClock}
            href="/dashboard/drafts"
          />
          <StatCard
            label="محادثات سابقة"
            value={MOCK_CONVERSATIONS.length}
            icon={MessagesSquare}
            href="/dashboard/conversations"
          />
          <StatCard
            label="جهات موصى بها"
            value={recommendedEntityCount}
            icon={Building2}
            href="/entities"
          />
        </div>
      </section>

      <QuickActions
        continueDraftHref={latestDraft ? `/dashboard/complaints/${latestDraft.id}` : undefined}
      />

      <RecentActivity complaints={recentComplaints} />
    </div>
  )
}
