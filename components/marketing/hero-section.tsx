import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="font-arabic text-primary text-5xl font-semibold">وصال</h1>
      <p className="text-foreground text-xl font-medium">من شكواك إلى الجهة المختصة.</p>
      <p className="max-w-2xl text-base leading-relaxed text-gray-600">
        وصال منصة ذكية تساعدك على تحليل شكواك واقتراح الجهة الحكومية المناسبة، مع توضيح خطوات
        التقديم وإرشادك حتى الوصول إلى الجهة المختصة.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/conversations"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 text-sm font-medium shadow-sm transition-colors"
        >
          ابدأ الخدمة
        </Link>
        <Link
          href="/about"
          className="text-foreground rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          كيف تعمل وصال؟
        </Link>
      </div>
    </section>
  )
}
