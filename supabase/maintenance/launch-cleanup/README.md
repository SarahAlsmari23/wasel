# Launch cleanup — remove test accounts and their data

Prepares the production database for launch by deleting an explicitly listed
set of test accounts and everything they created, while keeping all reference
and knowledge data, the schema, indexes, constraints, grants, RLS policies,
functions and triggers exactly as they are.

**Nothing here runs automatically.** This folder is outside `migrations/`, so
`supabase db push` and deployments never apply it. The cleanup is run by hand,
once, after written approval of the exact scope.

## What is deleted, and what is kept

| Deleted (only the accounts listed in `v_targets`, by id **and** email)                                          | Never touched                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `auth.users` and, by cascade, identities, sessions, MFA factors, one-time tokens, OAuth consents, WebAuthn rows | `domains`, `government_entities`, `complaint_types`, `government_services`, `official_sources` |
| `auth.refresh_tokens`, `auth.flow_state` of those users (no foreign key, so deleted explicitly)                 | `knowledge_documents`: content, metadata and embeddings (`vector(768)`)                        |
| `auth.flow_state` rows already orphaned by earlier account deletions (counted and approved)                     | every table, column, index, constraint and grant                                               |
| `profiles`, `conversations` (including drafts), `messages`, `collected_information`                             | every RLS policy and the RLS flag on every table                                               |
| `complaints`, `complaint_versions`, `attachments`, `retrieval_logs`                                             | functions, triggers, extensions, storage, configuration                                        |
|                                                                                                                 | `auth.audit_log_entries` (security history)                                                    |

There is no truncation, no `DROP`, no disabled constraint and no RLS change
anywhere in the kit.

**Personal data stays out of git.** This repository is public. The committed
`03_cleanup.sql` ships with an empty configuration; the filled-in plan (account
ids, emails, approved counts) is kept with the backup, outside the repository.

## Files

| File               | Effect                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `01_inventory.sql` | Read-only. Row counts, the reference-data, schema, index, constraint and grant fingerprints, and drift detection.                         |
| `02_accounts.sql`  | Read-only. One row per account with activity counts, to decide which accounts are real.                                                   |
| `backup.sh`        | Read-only against the database. Full `pg_dump` of the `public`, `auth` and `storage` schemas, then verifies the archive can be read back. |
| `03_cleanup.sql`   | Defaults to `dry_run`. Destructive only with `v_mode := 'execute'`, an explicit target list and the approved counts.                      |
| `04_verify.sql`    | Read-only post-cleanup checks. Every row must be `ok = t`.                                                                                |

## Procedure

1. **Inventory.** Run `01_inventory.sql` and `02_accounts.sql` in the SQL
   Editor. Save both outputs. `01` must show no `drift` rows.
2. **Decide the scope.** From `02`, list the accounts to delete as
   `[user id, email]` pairs. Any account not on the list makes the script
   refuse, so a sign-up after the review forces a new review.
3. **Back up.** Either use the Supabase CLI login (no database password
   needed): `supabase db dump --remote=<ref>` three times, with `--role-only`,
   with `-s public,auth,storage`, and with
   `--data-only --use-copy -s public,auth,storage`, then record SHA-256
   checksums. Or run `backup.sh` with the session connection string (see the
   script header). Keep the `.dump`, `.toc` and `.sha256` outside git.
   Also confirm in Supabase → Database → Backups whether a platform backup or
   point-in-time recovery exists for the project (this depends on the plan).
4. **Restore test and dry run.** Restore the backup into an isolated
   database and confirm `01` matches production row for row. In a copy of
   `03_cleanup.sql` kept outside git, set `v_targets` and `v_expected` (the
   counts from `01`/`02`), leave `v_mode := 'dry_run'`, and run it on the
   restored copy. The result is an _error_ that starts with
   `DRY RUN OK — nothing was changed` and lists the exact counts. Then
   rehearse `execute` on the copy and run `04` there.
5. **Approval.** The dry-run counts are approved in writing.
6. **Execute.** Set `v_mode := 'execute'`, keeping the same targets and counts,
   and run it once. Success prints `CLEANUP EXECUTED and verified`. Any failed
   check aborts and rolls back the whole transaction.
7. **Verify.** Run `04_verify.sql` (all `t`) and `01_inventory.sql` again. Every
   `fingerprint` row must be identical to step 1.
8. **Smoke test.** Sign up a new account, ask Wasel a question, create a
   complaint, and open the dashboard.

## Safety properties (rehearsed locally)

- **No targets, no approved counts, a count that differs, a target whose id
  and email do not match, or any account outside the list:** refuses and
  changes nothing.
- **Unreviewed public table present (schema drift):** refuses and changes
  nothing.
- **Reference data, policies, RLS flags, functions, triggers or columns differ
  after deletion:** aborts and rolls back.
- **Storage objects owned by a target, or an unknown foreign key into user
  data:** refuses.
- **Re-running after a successful execution:** the targets no longer exist,
  so it refuses (idempotent).
- **Order:** deletes children first and explicitly, even where the schema
  would cascade (user-data foreign keys are `ON DELETE CASCADE`; the
  `complaints` ↔ `complaint_versions` cycle is broken by clearing
  `current_version_id` first).

## Recovery

`backup.sh` produces a complete custom-format archive. To recover:

- **Full restore** into a new database or a new Supabase project (verified in
  the rehearsal: the restored copy's inventory and fingerprints were identical
  to the source):

  ```bash
  createdb restore_target   # or a fresh Supabase project
  psql restore_target -c 'create schema if not exists extensions; create extension if not exists vector schema extensions; create extension if not exists pgcrypto schema extensions;'
  pg_restore --no-owner --no-privileges -d restore_target wasel-full.dump
  ```

  The only expected message is `schema "public" already exists`.

- **From a CLI dump** (`roles.sql`, `schema.sql`, `data.sql`): start a
  `supabase/postgres` container of the project's major version, create the
  `vector`, `pgcrypto` and `uuid-ossp` extensions in `extensions`, drop the
  image's placeholder `auth` and `storage` schemas, then apply `roles.sql`,
  `schema.sql` and `data.sql` (the last with
  `SET session_replication_role = replica;` for the complaints ↔ versions
  cycle). Compare `01` against production with
  `set search_path = "$user", public, extensions;` so policy text prints
  `auth.uid()` the same way.

- **Selective recovery** of particular accounts: restore into a separate
  database as above, then copy the needed rows back in dependency order
  (`auth.users`, `profiles`, `conversations`, `messages`,
  `collected_information`, `complaints` without `current_version_id`,
  `complaint_versions`, then set `current_version_id`).
- **Platform recovery:** Supabase point-in-time recovery or a daily backup, if
  the project's plan includes it.
