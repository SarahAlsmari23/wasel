import { Skeleton } from '@/components/ui/skeleton'

export default function EntitiesLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16 md:px-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-60 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
