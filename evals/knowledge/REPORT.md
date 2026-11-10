# Intent intelligence and verified government knowledge — report

Branch `feature/intent-and-government-knowledge`. Not merged, not deployed. AI complaint drafting stays disabled. No production data was changed.

## 1. Baseline (production, read-only, 2026-11-11)

| Item                                                | Count         | Notes                                                                                    |
| --------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| Domains / authorities / services / complaint types  | 5 / 5 / 5 / 5 | as reported                                                                              |
| Official sources                                    | 5             | home pages only; all `verified` but `last_checked_at` empty                              |
| Knowledge passages                                  | 34            | all `@cf/google/embeddinggemma-300m`, 768 dims; service-role only (no public RLS policy) |
| Services with required documents / escalation rules | 0             |                                                                                          |

Passage audit: 6 passages labelled with the legacy name «الشركة السعودية للكهرباء», 1 naming «وزارة الشؤون البلدية والقروية» (also making a specific claim), 10 general passages citing only a home page and absent from the repository's source files, 1 near-duplicate pair (0.73 similarity).

## 2. Root cause of the false authority selection

Sequence «ميسييي انتت» → «تشجع الهلال ولا النصر» → «كيف اقدر اسوي كبسة من الموية»:

1. Any sector word («الموية») made the message "likely complaint", which bypassed the out-of-scope shortcut.
2. Every other message ran retrieval, and `resolveRouting` picked an authority from the nearest passage — even for small talk.
3. The keyword fallback selected an authority from the sector word alone.
4. Missing-field collection started because routing + "likely complaint" were true (and routing was persisted for signed-in users).
5. After generation, a non-low routing overruled the model's own correct "out of scope".

## 3. Intent-first architecture (no extra model call)

`lib/ai/intent.ts` classifies every message deterministically: complaint, service inquiry, ambiguous problem, out of scope (everyday topics — cooking, sports, health, entertainment, weather, plus the existing code/math/poetry patterns and injection attempts), greeting, identity, unclear.

- An authority needs **two signals**: a named supported authority, or a sector word together with a service issue, service context or stated problem; or a correction naming a sector. A sector word alone never selects an authority.
- An everyday topic overrides a stray sector word.
- **Out of scope** (outside a complaint): fixed scope answer — no retrieval, no authority, no model call.
- **Unclear / ambiguous**: the model answers; retrieved passages and sources are dropped, and an authority is attached only when retrieval is highly confident _and_ the model reads the message as governmental (hybrid, using the call that already happens).
- **Service inquiry**: authority + answer, no complaint collection.
- **Inside an active complaint**: everyday topics are interruptions (client and server), never stored as answers; the complaint's authority is kept.
- The post-generation safety net only applies on deterministic evidence.

## 4. Routing results

Offline, deterministic (no model, no retrieval). "Before" is the previous keyword decision only — it cannot include the old nearest-passage routing, so it **understates** the old false selections.

**Intent set** (`npm run eval:intent`, 210 cases / 224 turns incl. the exact production sequence):

|                                                    | Before                | After                |
| -------------------------------------------------- | --------------------- | -------------------- |
| Authority selected when none was due               | 21/97                 | **0/97**             |
| No authority when one was due                      | 15/126                | 6/126                |
| Correct authority decision — dev / holdout / fresh | 85.9% / 82.4% / 80.0% | 100% / 91.2% / 94.5% |

The fresh split (55 cases) was written after tuning and never used to tune. Two holdout/fresh misses were seen while building the knowledge evaluation and fixed generally («مشكلتي», "power is out") — the holdout is therefore not fully unseen.

**Earlier 313-case chat dataset** (routing turn): authority when none due 0/60 → 0/60; no authority when due 41/215 → 45/215. The remaining misses are mostly intentional (one-word follow-ups such as «الكهرباء», «متجر» — never routed from a single keyword) or phrasings the shared keyword detector also missed before.

**Route level** (local build, guest requests, stub model): 9/9 — the production sequence gives no authority, no sources, no links, no progress; an inquiry routes without collection; informal complaints (incl. the original water-bill message) still route and ask the city; an off-topic message mid-complaint is an interruption with the same pending question; «عندي مشكلة» selects nothing; injection is out of scope.

## 5. Verified authority profiles and sources

`data/government/authorities.json` — the reviewed source of truth: 28 official pages (URL, title, language, page-updated date when shown, status), and per authority the official names, scope, channels, procedures, published times/fees/service levels — each with the source page and a verbatim quote — plus `notPublished` (never stated). Verified 2026-11-11 from the authorities' own sites; Saudi Energy and Ministry of Commerce pages are JavaScript-rendered and were read with a headless browser.

| Authority                              | Verified highlights                                                                                                                                                                            | Not published (on pages read)                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| National Water Company                 | 8004411110 call centre; 931 water reporting 24/7; complaint e-service and incident e-service URLs; app; outage-complaint steps and conditions; incident steps                                  | processing time, tracking, escalation, billing objection, email                            |
| Saudi Energy                           | 933 call centre / emergency 24/7; WhatsApp, live chat, offices hours; outage, high-bill and meter steps (FAQ); published SLA incl. restoration within 6 hours (SAR 200 + 50/hour)              | Arabic page content (errors), complaint e-service URL, email, rename statement, escalation |
| CST                                    | complain to the provider first; escalate after 5 days or closure, within 180 days; documents; no fee; published service time 30 days; 19966; info@cst.gov.sa; renamed from CITC on 10 Nov 2022 | working vs calendar days, reference-number requirement, billing/coverage/portability scope |
| Ministry of Commerce                   | «إستقبال بلاغ تجاري» service: 9 steps via the app with Nafath; 7 working days; free; 1900 (8 am–midnight); cs@mc.gov.sa                                                                        | English name, per-type document list, FAQ                                                  |
| Ministry of Municipalities and Housing | 940 «بلاغات البلدية»; 199040; report service URL and 8 steps; requirements; free; "5 Days" / "24 hours" labels (meaning not defined); infocs@momah.gov.sa; rename in 1446هـ                    | what 940 handles, category list, tracking URL                                              |

`npm run verify:sources` (read-only) re-checks status, title and quotes: 23 OK, 2 need a rendered check (Saudi Energy), 2 fetch errors in Node (Ministry of Commerce TLS chain — reachable in a browser / curl), 1 quote corrected after the checker found the recorded quote was not verbatim.

## 6. Authority names

| Authority      | Database                  | Official (own site)                            | Action                                                                                                                                           |
| -------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Water          | «الشركة الوطنية للمياه»   | «شركة المياه الوطنية» / National Water Company | **Owner decision** — the entity name is the key used by routing, letters and stored complaints; a coordinated code + data change                 |
| Electricity    | «السعودية للطاقة»         | «السعودية للطاقة» / Saudi Energy               | current; 6 passages use the legacy «الشركة السعودية للكهرباء» → deactivated by the update; «(SE)» in the English display name is not on the site |
| Municipalities | «وزارة البلديات والإسكان» | same; renamed 1446هـ (quote on balady.gov.sa)  | current; 1 passage with the former name → deactivated                                                                                            |
| CST, Commerce  | current                   | current                                        | —                                                                                                                                                |

## 7. Knowledge base and RAG

- **Grounding without re-embedding:** once an authority is selected, the verified profile facts for that authority (relevant procedure, channels, service levels, not-published list, each with its source URL) are added to the prompt deterministically — they no longer depend on vector similarity.
- **Answer check:** phone numbers, emails and links not in the verified profiles (or written by the user) are removed from model answers (`lib/government/contact-check.ts`).
- **Reviewed database update** (`supabase/maintenance/knowledge-2026-11/`): register 28 verified sources; ingest 36 generated passages (one idea each, exact source URL, quote, `kb_version`); deactivate the 7 outdated passages (guarded, nothing deleted); verify; full rollback. Rehearsed on the local database: idempotent, guard works, rollback restores the exact prior state. Same embedding model and dimensions — no mixed vectors.
- **Hybrid lexical retrieval** was not added: no evaluation could show a benefit without real embeddings.

**Knowledge evaluation** (`npm run eval:knowledge`, 157 questions generated only from verified facts, incl. 44 unanswerable and 15 topic-only questions): correct authority 157/157; verified fact + source reach the model 157/157 (Arabic 100/100, English 57/57); unpublished facts flagged for abstention 44/44.

**Not measured:** vector retrieval relevance on the new passages, live answer faithfulness, citation accuracy of live answers, live latency. They need the Workers AI credentials (pulling production secrets was refused by the session's safety policy) or an accessible deployment with the new code.

## 8. Authority card

The existing "not yet verified" note is replaced, when a verified profile exists, by a collapsed section inside the same card: verified channels (tap-to-call, links), the primary procedure's steps, published time and fee, and the source with its verification date, plus "anything not shown is not published". No layout or style change.

## 9. Tests

| Suite                        | Result                                               | Type                    |
| ---------------------------- | ---------------------------------------------------- | ----------------------- |
| Unit                         | 174/174 (+18)                                        | offline                 |
| Intent evaluation            | 224 turns, see §4                                    | offline                 |
| Knowledge evaluation         | 157/157                                              | offline                 |
| 313-case chat evaluation     | 1050/1073 (unchanged)                                | offline                 |
| 150-case drafting evaluation | 150/150, validator false positives 0/150 (unchanged) | offline                 |
| Route-level intent checks    | 9/9                                                  | local build, stub model |
| Browser flow                 | 32/32                                                | local build, stub model |
| API suite                    | 15/15                                                | local build, stub model |
| RLS (stored facts)           | 3/3                                                  | local database          |
| KB update rehearsal          | apply / idempotent / guard / rollback OK             | local database          |
| Typecheck, lint, build       | pass                                                 |                         |

No live-model tests were run for this track.

## 10. Performance and cost

Out-of-scope and injection messages now return without retrieval or a model call (faster, cheaper than before). The official-facts block adds roughly 600–1,400 characters to the prompt only when an authority is selected — about 5–15 extra Workers AI neurons per such turn by Cloudflare's published Scout rates (estimate, not measured).

## 11. Readiness and blockers

- **Ready to deploy after review:** intent routing, card, prompt grounding, answer check — no new external data flow, no reference-data change.
- **Needs your approval:** applying the knowledge update to production (backup → 01 → ingest with credentials → 02 → 03); the water-company name.
- **Blockers / unknowns:** live retrieval and answer quality are unmeasured; the official sources do not publish many complaint details (processing times, tracking, escalation for water/electricity); data residency (unchanged from the previous report).
