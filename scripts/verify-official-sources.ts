/**
 * Read-only check of every official source in data/government/authorities.json:
 * HTTP status, page title, and whether each recorded quote still appears in
 * the page's static HTML. Never writes anything. JavaScript-rendered pages
 * (little static text) are reported as "needs rendered check".
 *
 *   npx tsx scripts/verify-official-sources.ts [--json out.json]
 */
import { writeFileSync } from 'node:fs'
import data from '../data/government/authorities.json'

type Source = { id: string; url: string; title: string; status: string }
const raw = data as unknown as { sources: Source[]; authorities: Record<string, unknown> }

/** Every quote recorded against a source id, anywhere in the profiles. */
function quotesBySource(): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (typeof o.source === 'string' && typeof o.quote === 'string') {
        out.set(o.source, [...(out.get(o.source) ?? []), o.quote])
      }
      Object.values(o).forEach(walk)
    }
  }
  walk(raw.authorities)
  return out
}

const norm = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

async function main() {
  const quotes = quotesBySource()
  const results = []
  for (const s of raw.sources) {
    let status = 0
    let title = ''
    let textLength = 0
    const found: string[] = []
    const missing: string[] = []
    try {
      const res = await fetch(s.url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (Wasel source check)' },
        signal: AbortSignal.timeout(20_000),
      })
      status = res.status
      const html = await res.text()
      title = norm(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
      const text = norm(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '))
      textLength = text.length
      for (const q of quotes.get(s.id) ?? []) (text.includes(norm(q)) ? found : missing).push(q)
    } catch (error) {
      title = `fetch failed: ${error instanceof Error ? error.name : 'error'}`
    }
    const verdict =
      status === 0
        ? 'FETCH_ERROR_CHECK_IN_BROWSER'
        : status !== 200
          ? 'BROKEN_OR_BLOCKED'
          : missing.length === 0
            ? 'OK'
            : textLength < 1500
              ? 'NEEDS_RENDERED_CHECK'
              : 'QUOTE_CHANGED'
    results.push({
      id: s.id,
      url: s.url,
      status,
      title,
      verdict,
      quotesFound: found.length,
      quotesMissing: missing,
    })
    console.log(
      `${verdict.padEnd(20)} ${String(status).padEnd(4)} ${s.id.padEnd(26)} ${title.slice(0, 50)}`,
    )
  }
  const i = process.argv.indexOf('--json')
  if (i !== -1) writeFileSync(process.argv[i + 1], JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
