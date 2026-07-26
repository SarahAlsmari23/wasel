import { ListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons'

export default function DraftsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeaderSkeleton />
      <ListSkeleton count={3} />
    </div>
  )
}
