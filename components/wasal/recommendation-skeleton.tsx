import { Skeleton } from '@/components/ui/skeleton'

export function RecommendationSkeleton() {
  return (
    <div
      role="status"
      aria-label="جارٍ تحليل الشكوى"
      className="bg-surface border-border shadow-soft flex flex-col gap-5 rounded-2xl border p-5"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>

      <Skeleton className="h-1.5 w-full rounded-full" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-3/5" />
      </div>

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}
