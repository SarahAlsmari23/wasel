import type { Metadata } from 'next'
import { AuthorityCard } from '@/components/marketing/authority-card'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { GOVERNMENT_ENTITIES } from '@/lib/mock/government-entities'

export const metadata: Metadata = {
  title: 'الجهات الحكومية',
  description: 'الجهات الحكومية التي يدعمها واصل حالياً وخدماتها.',
}

export default function EntitiesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16 md:px-6">
      <SectionHeading
        eyebrow="التغطية"
        title="الجهات الحكومية"
        description="هذه هي الجهات التي يستطيع واصل تحليل شكواك وتوجيهها إليها اليوم، مع روابط بواباتها الرسمية."
        align="start"
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GOVERNMENT_ENTITIES.map((entity, index) => (
          <Reveal key={entity.id} delay={index * 0.06}>
            <AuthorityCard entity={entity} showLink />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
