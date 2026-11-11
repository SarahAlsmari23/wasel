# Government knowledge update — verified 2026-11

Source of truth: `data/government/authorities.json` — every fact read on the authority's official site on 2026-11-11, with its exact URL and a verbatim quote. Generated from it (do not edit by hand): `data/knowledge/verified-2026-11/*.json` (36 passages) and `01_official_sources.sql`.

**Production reference data is not changed by merging the code.** These steps change it and need the owner's approval:

1. Backup (same procedure as `supabase/maintenance/launch-cleanup/README.md`).
2. `01_official_sources.sql` — registers 28 verified source pages (one row per distinct URL); records the check date on the 5 existing rows.
3. Ingest the verified passages (needs the Workers AI credentials; uses the same `@cf/google/embeddinggemma-300m`, 768 dimensions, as every existing row — no mixed models):
   `npm run ingest:knowledge -- --dir data/knowledge/verified-2026-11 --dry-run` then without `--dry-run`. Idempotent (content hash).
4. `02_deactivate_outdated.sql` — deactivates the 7 outdated passages (guarded; nothing is deleted).
5. `03_verify.sql` — expect: verified_source_rows 28, sources_never_checked 0, verified_passages 36, active_legacy_named 0, verified_without_embedding 0, embedding_models 1.

Rollback: `99_rollback.sql` (removes the new rows, reactivates the 7 passages, clears the check marks).

## Not included — needs a separate decision

- **Water company name.** The database name is «الشركة الوطنية للمياه»; the company's own site uses «شركة المياه الوطنية» (https://www.nwc.com.sa/ar). The entity name is the key used by routing, letters and stored complaints; renaming it is a coordinated code + data change.
- **English display name «Saudi Energy (SE)».** The site shows «Saudi Energy»; «(SE)» is not shown on the pages read.

## Future updates

1. Re-verify: `npx tsx scripts/verify-official-sources.ts` — reports each source URL's HTTP status, title and whether the recorded quote is still on the page (JavaScript-rendered pages are reported as "needs rendered check"). It never writes anything.
2. Edit `data/government/authorities.json` only from official pages (URL + verbatim quote + date); move anything no longer published to `notPublished`.
3. Regenerate (`npx tsx scripts/build-verified-knowledge.ts`), review the diff in a pull request, then apply steps 1–5 with a new `kb_version`.
4. Never apply an unreviewed website change automatically.
