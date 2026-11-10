# واصل · Wasel

An Arabic-first, bilingual (Arabic / English) AI assistant that helps citizens and residents of
Saudi Arabia understand their complaint, identify the responsible government authority, and draft a
formal complaint — which they then submit themselves through the authority's official channel.

واصل ... خلها توصل صح — https://wisal-peach.vercel.app

Wasel is not a government authority, does not provide legal advice, and never submits complaints on
a user's behalf.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, RLS,
pgvector) · Meta Llama on Cloudflare Workers AI · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase and Cloudflare values
npm run dev
```

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # unit tests (node:test + tsx)
npm run format       # Prettier
npm run ingest:knowledge   # populate the RAG knowledge base
```

## Access model

|                                                    | Guest | Signed in |
| -------------------------------------------------- | ----- | --------- |
| Browse the site, read about authorities            | ✅    | ✅        |
| Ask Wasel questions, see the responsible authority | ✅    | ✅        |
| Create, edit, regenerate and save complaints       | ❌    | ✅        |
| Dashboard, history, drafts, data export            | ❌    | ✅        |

A guest who decides to create a complaint is asked to sign in; the conversation, collected details
and pending action are restored afterwards. Signing in from any public page returns the user to
that page.

## AI

- **Model:** Llama 4 Scout (17B/16E) on Cloudflare Workers AI, with Llama 3.3 70B as an automatic
  fallback. Configurable via `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER`, `LLAMA_MODEL`,
  `LLAMA_FALLBACK_MODEL` (see `.env.example`).
- **Grounding:** answers use retrieved official-source documents (Cloudflare embeddings +
  pgvector); authority routing and complaint fields are server-authoritative, never model-invented.
- **Honest failures:** when the model is unavailable, the user sees a clear localized error with a
  retry — never a canned answer presented as AI output.
- **Language:** the assistant answers in the interface language.

## Internationalisation

Arabic (default, RTL) and English (LTR). The choice is stored in a cookie and survives navigation,
refreshes and sign-in. Each component keeps its Arabic and English copy side by side
(`defineCopy`), and TypeScript rejects a missing translation.

## Project structure

```
app/
  (marketing)/     Home, about, entities, privacy, terms
  (dashboard)/     Authenticated area — sidebar, bottom nav, account menu
  wasal/           Chat experience + server actions
  auth/            Sign-in, sign-up, OAuth/email callback
  api/ai/chat/     Chat endpoint (guests allowed, rate-limited)
components/        brand, ui, i18n, marketing, wasal, complaints, dashboard, auth
lib/
  ai/              providers (Llama), prompts, routing, guards, validation
  complaints/      formal letters (ar/en), display helpers
  db/              Supabase data access (RLS client; narrow service-role writes)
  i18n/            locale config and server helpers
  security/        rate limiting
supabase/          migrations (RLS policies) and seed
tests/unit/        unit tests
```

## Design system

Brand tokens live in `app/globals.css` (light and dark). Primary emerald `#086B4C` with derived
hover/pressed/tint shades, the original navy `#12355B`, and a calmer teal accent.
