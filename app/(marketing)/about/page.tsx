import { Card } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-foreground text-3xl font-semibold">عن وصال</h1>
        <p className="leading-relaxed text-gray-600">
          وصال منصة ذكية تعتمد على تقنيات الذكاء الاصطناعي لمساعدة المستخدم في تحليل الشكاوى
          وتوجيهها إلى الجهة الحكومية المختصة، مع توفير معلومات وإرشادات تسهّل عملية التقديم وتختصر
          الوقت والجهد.
        </p>
      </div>

      {/* Structural placeholder — content/visual to be supplied later. */}
      <Card className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-foreground text-xl font-semibold">كيف تستخدم وصال؟</h2>
        <p className="text-sm text-gray-600">
          سيتم إضافة شرح مرئي لخطوات استخدام المنصة هنا قريباً.
        </p>
      </Card>
    </div>
  )
}
