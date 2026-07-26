import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function ComplaintsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-xl" />
      <CardGridSkeleton />
    </div>
  )
}
