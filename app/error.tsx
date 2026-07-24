'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-danger/10 text-danger flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-foreground text-xl font-semibold">حدث خطأ غير متوقع</h1>
      <p className="text-sm text-gray-600">نأسف على الإزعاج. حاول مرة أخرى.</p>
      <Button type="button" variant="primary" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </main>
  )
}
