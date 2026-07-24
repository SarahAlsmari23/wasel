'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">حدث خطأ غير متوقع</h1>
      <p className="text-sm text-black/60 dark:text-white/60">نأسف على الإزعاج. حاول مرة أخرى.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
      >
        إعادة المحاولة
      </button>
    </main>
  )
}
