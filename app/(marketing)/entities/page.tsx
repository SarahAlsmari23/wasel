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
    <div
      id="entities-page-content"
      className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16 md:px-6"
    >
      {/*
        The shared marketing layout's <main id="main-content"> uses flex-1 so
        short pages still push the footer to the bottom of the viewport (a
        standard sticky-footer pattern) — but this page's content doesn't
        stretch to fill that grown space, so on any viewport taller than the
        page's natural height, main inflates and the footer ends up floating
        far below the cards instead of right after them. This rule (scoped
        entirely to when THIS page's content is present, via :has()) cancels
        that grow just for this route, without touching the shared layout —
        main then sizes to its natural content height and the footer follows
        immediately, on any screen size, growing naturally as cards are added.

        Cancelling the grow has one knock-on effect: the layout's decorative
        background (".wasel-canvas", inside main) is sized with a fixed
        h-screen (100vh), which relies on main always being at least a full
        viewport tall so the canvas never outgrows main's own box. Once main
        is shrunk to this page's natural (shorter) height, that h-screen
        layer would overflow past main's bottom edge and visually bleed into
        the footer below it. Capping it to 100% (of its already-correctly-
        sized absolute wrapper) keeps it exactly matched to main's real
        height instead, on this page only.
      */}
      <style>{`
        #main-content:has(#entities-page-content) {
          flex-grow: 0;
        }
        #main-content:has(#entities-page-content) .wasel-canvas {
          height: 100%;
        }
      `}</style>
      <SectionHeading
        eyebrow="التغطية"
        title="الجهات الحكومية"
        description="هذه هي الجهات التي يستطيع واصل تحليل شكواك وتوجيهها إليها اليوم، مع روابط بواباتها الرسمية."
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
