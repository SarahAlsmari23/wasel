import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownMessageProps = {
  content: string
}

/**
 * Renders assistant replies. The AI response format supports bold text,
 * bullet/numbered lists and links (Phase 2 "AI Response Design"); anything
 * else falls back to plain paragraphs. Links always open in a new tab with
 * `noopener` since they point at external government portals.
 */
export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => (
            <ul className="mb-3 flex list-disc flex-col gap-1.5 pr-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 flex list-decimal flex-col gap-1.5 pr-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pr-1">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-primary/8 rounded px-1.5 py-0.5 text-xs">{children}</code>
          ),
          h1: ({ children }) => <p className="mb-2 text-base font-semibold">{children}</p>,
          h2: ({ children }) => <p className="mb-2 text-base font-semibold">{children}</p>,
          h3: ({ children }) => <p className="mb-2 text-sm font-semibold">{children}</p>,
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
