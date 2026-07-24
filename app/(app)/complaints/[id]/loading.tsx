export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-black/60 dark:text-white/60">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        جارٍ تحميل الشكوى...
      </div>
    </div>
  )
}
