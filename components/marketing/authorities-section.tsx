import { AuthorityCard } from '@/components/marketing/authority-card'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { GOVERNMENT_ENTITIES } from '@/lib/mock/government-entities'

export function AuthoritiesSection() {
  return (
    <section id="authorities" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <SectionHeading
        eyebrow="التغطية"
        title="الجهات الحكومية المدعومة"
        description="يستطيع واصل تحليل شكواك وتوجيهها إلى القطاعات التالية، مع إرشادك خطوة بخطوة حتى تصل إلى الجهة المختصة."
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GOVERNMENT_ENTITIES.map((entity, index) => (
          <Reveal key={entity.id} delay={index * 0.06}>
            <AuthorityCard entity={entity} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
