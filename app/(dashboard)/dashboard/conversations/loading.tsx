import { PageHeaderSkeleton } from '@/components/dashboard/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
