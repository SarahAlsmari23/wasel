import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">الصفحة غير موجودة</h1>
      <p className="text-sm text-black/60 dark:text-white/60">تعذر العثور على الصفحة المطلوبة.</p>
      <Link href="/" className="text-sm font-medium underline">
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  )
}
