# Knowledge base source files

One JSON file per sector. Each file is an array of entries matching this shape (mirrors `KnowledgeEntry` in `scripts/ingest-knowledge.ts`):

```json
{
  "title": "...",
  "content": "...",
  "entity": "...",
  "sector": "commerce",
  "documentType": "general_info",
  "sourceUrl": "https://...",
  "sourceLabel": "...",
  "reviewedAt": "YYYY-MM-DD"
}
```

## Sectors (fixed, match the 5 seeded government entities)

`commerce.json`, `telecom.json`, `municipality.json`, `water.json`, `electricity.json` — the `sector` field inside each entry must match its filename's sector.

## Content rules

- **Official sources only.** Every entry's `sourceUrl` must be a real official `.gov.sa` or official-company page. Never fabricate a URL.
- **No invented procedures, eligibility rules, response times, escalation paths, or complaint channels.** State only high-level, verifiable facts — the entity's role, general responsibility, or broad complaint category.
- **One idea per entry.** `content` should be a single, complete, self-contained statement — not a pasted paragraph. Target 80–500 characters; the ingestion script rejects anything over ~800 characters as "looks unchunked."
- `reviewedAt` is a snapshot date (when the fact was last checked against the source), not a freshness guarantee.

## How ingestion uses these files

`scripts/ingest-knowledge.ts` reads every `*.json` file in this folder, resolves each entry's `sector` to a real `government_services`/`complaint_types` row, embeds the content, and inserts a new `knowledge_documents` row — skipping anything whose content already exists (by hash). Nothing here is ingested automatically; running `npm run ingest:knowledge` is always a manual, explicit step.
