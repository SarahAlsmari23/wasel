import { ActivitySkeleton } from '@/components/dashboard/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the overview: welcome panel with stats strip, then two columns. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="border-border overflow-hidden rounded-3xl border">
        <div className="flex flex-col gap-3 px-5 py-7 sm:px-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="bg-border grid grid-cols-2 gap-px border-t border-transparent lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-surface flex flex-col gap-3 px-5 py-5 sm:px-6">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <ActivitySkeleton />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
