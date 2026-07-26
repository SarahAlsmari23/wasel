import { ActivitySkeleton, StatsSkeleton } from '@/components/dashboard/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Skeleton className="h-36 rounded-2xl" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <StatsSkeleton />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <ActivitySkeleton />
      </div>
    </div>
  )
}
