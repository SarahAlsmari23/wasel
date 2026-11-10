# Data residency — current status

Wasel's requirement is that personal data stays in Saudi Arabia. This page
records what is actually known about where each part of the stack processes
and stores data, and what still has to be confirmed. **None of the items below
has been verified as Saudi-resident. Production AI processing should not be
approved until they are.**

| Component                         | What it handles                                                                    | Where it runs today                                                                                                                                                                                                                        | Saudi residency                                                      | How to confirm / options                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Workers AI (Llama)     | Every chat message and the complaint text sent for drafting                        | Cloudflare's global network. Cloudflare's Data Localization Suite marks Workers AI as **not supported** by Regional Services (the feature that pins processing to a region); only the Customer Metadata Boundary (logs/analytics) applies. | **Not guaranteed.** Having a Cloudflare account does not provide it. | Ask Cloudflare in writing whether inference can be restricted to an in-Kingdom location and under what contract (DPA, enterprise terms). Otherwise use a model hosted in-Kingdom. |
| Supabase (Postgres, Auth)         | Accounts, conversations, messages, complaints, versions                            | The region chosen when the project was created; it is not recorded in this repository.                                                                                                                                                     | Unknown.                                                             | Supabase → Project Settings → General → Region. A region outside the Kingdom requires a migration to a compliant host.                                                            |
| Vercel (Next.js server functions) | Requests in transit, including chat text passed to the AI                          | The function region set in the Vercel project (Vercel's default is `iad1`, Washington DC). No region is pinned in this repository.                                                                                                         | Unknown / likely not.                                                | Vercel → Project → Settings → Functions → Region. Check Vercel's region list for an in-Kingdom region; if none exists, in-Kingdom hosting needs a different host.                 |
| Logs                              | Server logs (Vercel), Cloudflare AI Gateway/analytics if enabled, Supabase logs    | Each provider's own log region                                                                                                                                                                                                             | Unknown                                                              | Review retention and region in each dashboard; avoid logging message content.                                                                                                     |
| Third-party transfers             | Google OAuth (sign-in only), email delivery for confirmations (Supabase Auth SMTP) | Provider regions                                                                                                                                                                                                                           | Not resident                                                         | Document as cross-border transfers in the privacy policy, or replace.                                                                                                             |

## What the code already does to limit exposure

- The model receives the current conversation's messages plus retrieved
  reference documents; no files are uploaded (the attachment control was
  removed).
- Server logs record request metadata and error codes, not message content.
- Rate limiting and authentication protect the AI endpoint from bulk misuse.

## Decision needed

Saudi data residency is a legal and contractual question, not a code setting.
It needs written confirmation from each provider (or a move to in-Kingdom
providers) and review against the PDPL and any sector rules that apply to the
deployment.

Sources: Cloudflare Data Localization Suite —
[product compatibility](https://developers.cloudflare.com/data-localization/compatibility)
(Workers AI: Regional Services ✘, Customer Metadata Boundary ✅).
