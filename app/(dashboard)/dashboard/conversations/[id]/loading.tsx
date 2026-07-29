import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-11 w-44 rounded-xl" />
    </div>
  )
}
