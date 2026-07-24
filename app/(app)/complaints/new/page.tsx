import { ComplaintBuilder } from '@/components/complaints/complaint-builder'

export default function NewComplaintPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">إنشاء شكوى جديدة</h1>
        <p className="mt-1 text-sm text-gray-600">
          أكمل الخطوات التالية لإعداد مسودة شكواك. لن يتم إرسال أي بيانات أو حفظها.
        </p>
      </div>
      <ComplaintBuilder />
    </div>
  )
}
