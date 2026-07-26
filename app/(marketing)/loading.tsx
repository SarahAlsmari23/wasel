import { Skeleton } from '@/components/ui/skeleton'

export default function MarketingLoading() {
  return (
    <div className="flex flex-col gap-24 pb-24">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5 px-5 pt-20 md:px-6">
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-14 w-full max-w-lg" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <Skeleton className="h-5 w-3/4 max-w-md" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-13 w-48 rounded-xl" />
          <Skeleton className="h-13 w-40 rounded-xl" />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-56 rounded-2xl" />
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
        <Skeleton className="h-80 rounded-3xl" />
      </section>
    </div>
  )
}
