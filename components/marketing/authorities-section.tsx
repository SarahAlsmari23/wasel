import { AuthorityCard } from '@/components/marketing/authority-card'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { GOVERNMENT_ENTITIES } from '@/lib/mock/government-entities'

const COPY = defineCopy({
  ar: {
    eyebrow: 'التغطية',
    title: 'الجهات الحكومية المدعومة',
    description:
      'يستطيع واصل تحليل شكواك وتوجيهها إلى القطاعات التالية، مع إرشادك خطوة بخطوة حتى تصل إلى الجهة المختصة.',
  },
  en: {
    eyebrow: 'Coverage',
    title: 'Supported government authorities',
    description:
      'Wasel can analyse your complaint and direct it to the following sectors, guiding you step by step to the responsible authority.',
  },
})

export async function AuthoritiesSection() {
  const locale = await getLocale()
  const copy = COPY[locale]

  return (
    <section id="authorities" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GOVERNMENT_ENTITIES.map((entity, index) => (
          <Reveal key={entity.id} delay={index * 0.06}>
            <AuthorityCard entity={entity} locale={locale} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
