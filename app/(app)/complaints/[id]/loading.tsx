import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <Spinner />
        جارٍ تحميل الشكوى...
      </div>
    </div>
  )
}
