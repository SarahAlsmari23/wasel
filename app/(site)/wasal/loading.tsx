import { Skeleton } from '@/components/ui/skeleton'

export default function WasalLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center justify-between border-b px-4 py-2.5 sm:px-6">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      <div className="min-h-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-10 sm:py-16">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-44 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="border-border border-t px-4 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
