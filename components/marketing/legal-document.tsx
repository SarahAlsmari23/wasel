type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] }

export type LegalDocumentContent = {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

/** Shared, readable long-form layout for the privacy and terms pages. */
export function LegalDocument({ content }: { content: LegalDocumentContent }) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-16 md:px-6 md:py-20">
      <header className="flex flex-col gap-3">
        <h1 className="text-heading text-3xl font-semibold text-balance sm:text-4xl">
          {content.title}
        </h1>
        <p className="text-muted-foreground text-xs">{content.updated}</p>
        <p className="text-foreground text-base leading-relaxed">{content.intro}</p>
      </header>

      {content.sections.map((section) => (
        <section
          key={section.heading}
          className="bg-surface/85 border-border flex flex-col gap-3 rounded-2xl border p-6 backdrop-blur-sm"
        >
          <h2 className="text-heading text-lg font-semibold">{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  )
}
