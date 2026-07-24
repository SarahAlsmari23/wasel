import { FileQuestion } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-secondary/15 text-secondary flex h-12 w-12 items-center justify-center rounded-full">
        <FileQuestion className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-foreground text-xl font-semibold">الصفحة غير موجودة</h1>
      <p className="text-sm text-gray-600">تعذر العثور على الصفحة المطلوبة.</p>
      <Link
        href="/"
        className="text-foreground inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  )
}
