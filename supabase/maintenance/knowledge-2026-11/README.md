# Government knowledge update — verified 2026-11

Source of truth: `data/government/authorities.json` — every fact read on the authority's official site on 2026-11-11, with its exact URL and a verbatim quote. Generated from it (do not edit by hand): `data/knowledge/verified-2026-11/*.json` (36 passages) and `01_official_sources.sql`.

**Merging or deploying the code changes no production data.** Every step below changes production reference data and needs the owner's explicit approval of the preflight report.

## Preflight (no production changes)

1. **Real embeddings** — the owner runs, in their own terminal (credentials typed, never pasted into chat or files):
   ```sh
   cd ~/Projects/wasel
   read -s "CLOUDFLARE_API_TOKEN?Workers AI token: " && export CLOUDFLARE_API_TOKEN
   read "CLOUDFLARE_ACCOUNT_ID?Cloudflare account ID: " && export CLOUDFLARE_ACCOUNT_ID
   npm run kb:preflight            # ≈46 Scout calls, hard stop at 5,000 neurons
   unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
   ```
   Output: `.kb-preflight/` (git-ignored) — real 768-dim `@cf/google/embeddinggemma-300m` vectors for the 36 passages and 460 evaluation queries, the controlled latency benchmark, and the answer check. `--phase embed` alone costs only the embeddings.
2. `npx tsx scripts/build-passages-sql.ts` → `04_verified_passages.sql` (git-ignored) with exactly those vectors; prints its SHA-256. Refuses stale, malformed or constant vectors.
3. Fresh production backup, restore-tested into an isolated container (procedure: `supabase/maintenance/launch-cleanup/README.md`).
4. On that restored copy: `KB_TEST_PSQL="docker exec -i <container> psql -U supabase_admin -d postgres" npx tsx scripts/kb-retrieval-test.ts` — real-vector retrieval before/after through `match_knowledge_documents` and the production routing rules; then `03_verify.sql`, `99_rollback.sql`, and a fingerprint comparison proving user data unchanged and the rollback exact.

## Production apply (only after approval), via the Supabase CLI

Re-check the SHA-256 of `04_verified_passages.sql` against the approved report, take a fresh backup, then in order:

1. `01_official_sources.sql` — registers 28 verified source pages (idempotent by URL); records the check date on the 5 existing rows.
2. `04_verified_passages.sql` — the 36 verified passages with their tested embeddings (idempotent by content hash; same columns and metadata as `scripts/ingest-knowledge.ts`; no service-role key needed).
3. `02_deactivate_outdated.sql` — deactivates the 7 outdated passages (guarded: exactly 7; nothing is deleted).
4. `03_verify.sql` — expect: verified_source_rows 28, sources_never_checked 0, active_passages 63, verified_passages 36, active_legacy_named 0, verified_without_embedding 0, embedding_models 1, entities 5, services 5.

Rollback: `99_rollback.sql` (removes the new rows, reactivates the 7 passages, clears the check marks) — rehearsed to restore the reference data byte-for-byte.

Independent of this update: the water-authority name correction (`../nwc-name-2026-11`).

## Future updates

1. Re-verify: `npx tsx scripts/verify-official-sources.ts` — HTTP status, title and whether each recorded quote is still on the page (JavaScript-rendered pages are reported as "needs rendered check"). Read-only.
2. Edit `data/government/authorities.json` only from official pages (URL + verbatim quote + date); move anything no longer published to `notPublished`.
3. Regenerate (`npx tsx scripts/build-verified-knowledge.ts`), review the diff in a pull request, then repeat the preflight and apply with a new `kb_version`.
4. Never apply an unreviewed website change automatically.
