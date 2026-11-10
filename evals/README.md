# Wasel AI evaluation

Regression evaluation for the Wasel assistant. Synthetic, non-personal cases only.

| File                                    | Purpose                                                                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cases-entities.mjs`, `cases-cross.mjs` | Hand-written cases (42 per authority + cross-entity, out-of-scope, safety, workflow).                                                                                                                                                                             |
| `build-dataset.mjs` → `dataset.json`    | Expands them into the full schema (persona, register, expected route/intent/clarification, evidence, pass criteria, severity, dev/holdout split).                                                                                                                 |
| `offline-eval.ts`                       | Deterministic layers, no network: guards, keyword routing, problem detection, the problem-type gate, and the complaint-letter builders (fact preservation, no invented numbers or claims, regeneration).                                                          |
| `live-eval.mjs`                         | Bounded live run against a deployment as a guest (nothing stored). Deterministic assertions only: authority, intent, clarification, reply language, official URLs only, no invented numbers/deadlines/fees/authority names, no redundant questions, safety flags. |
| `REPORT.md`                             | Latest results, failure analysis, improvements and example transcripts.                                                                                                                                                                                           |

```bash
npm run eval:build                         # regenerate dataset.json
npm run eval:offline -- --split holdout    # dev | holdout | all
npm run eval:live -- https://<deployment> --max-calls 50 --out results.json
npm run eval:live -- https://<deployment> --rescore results.json   # re-score saved answers, no API calls
```

Rules:

- **Holdout** cases (every 5th) are for measurement only — never tune patterns or prompts against them.
- Live runs use the production AI account and quota. Keep `--max-calls` bounded (≈100 neurons per call; the free allocation is 10,000/day) and never run them in parallel.
- Ground truth for official facts is the reference data in the database (see `ENTITIES` in `build-dataset.mjs`); the model's own answers are never treated as evidence.
