# Launch cleanup — remove test accounts and their data

Prepares the production database for launch by deleting test accounts and
everything they created, while keeping all reference and knowledge data,
the schema, RLS policies, functions and triggers exactly as they are.

**Nothing here runs automatically.** This folder is outside `migrations/`, so
`supabase db push` and deployments never apply it. The cleanup is run by hand,
once, after written approval of the exact scope.

## What is deleted, and what is kept

| Deleted (only for accounts not on the keep list)                                            | Never touched                                                                                  |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `auth.users` and, by cascade, identities, sessions, refresh tokens, MFA factors             | `domains`, `government_entities`, `complaint_types`, `government_services`, `official_sources` |
| `profiles`                                                                                  | `knowledge_documents`: content, metadata and embeddings (`vector(768)`)                        |
| `conversations`, `messages`, `collected_information`                                        | every table, column, index and constraint                                                      |
| `complaints`, `complaint_versions`                                                          | every RLS policy and the RLS flag on every table                                               |
| `attachments`, `retrieval_logs` (logs of which documents were retrieved for a conversation) | functions (`handle_new_user`, `match_knowledge_documents`, `set_updated_at`) and triggers      |
| optional: `auth.audit_log_entries` (sign-in history, off by default)                        | extensions, storage, configuration                                                             |

There is no truncation, no `DROP` and no RLS change anywhere in the kit.

## Files

| File               | Effect                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `01_inventory.sql` | Read-only. Row counts, the reference-data and schema fingerprints, and drift detection.                                                   |
| `02_accounts.sql`  | Read-only. One row per account with activity counts, to decide which accounts are real.                                                   |
| `backup.sh`        | Read-only against the database. Full `pg_dump` of the `public`, `auth` and `storage` schemas, then verifies the archive can be read back. |
| `03_cleanup.sql`   | Defaults to `dry_run`. Destructive only with `v_mode := 'execute'` **and** an approved count.                                             |
| `04_verify.sql`    | Read-only post-cleanup checks. Every row must be `ok = t`.                                                                                |

## Procedure

1. **Inventory.** Run `01_inventory.sql` and `02_accounts.sql` in the SQL
   Editor. Save both outputs. `01` must show no `drift` rows.
2. **Decide the scope.** From `02`, list any account that belongs to a real
   person and must be kept, such as the project owner. The approved number of
   accounts to delete is `total accounts - kept accounts`.
3. **Back up.** Run `backup.sh` with the session connection string (see the
   script header). Keep the `.dump`, `.toc` and `.sha256` outside git.
   Also confirm in Supabase → Database → Backups whether a platform backup or
   point-in-time recovery exists for the project (this depends on the plan).
4. **Dry run.** In `03_cleanup.sql`, set `v_keep_emails` and
   `v_expected_users`, leave `v_mode := 'dry_run'`, and run it. The result is
   an _error_ that starts with `DRY RUN OK — nothing was changed` and lists
   the exact counts that would be deleted. That error is the report; it means
   everything was rolled back.
5. **Approval.** The dry-run counts are approved in writing.
6. **Execute.** Set `v_mode := 'execute'`, keeping the same keep list and count,
   and run it once. Success prints `CLEANUP EXECUTED and verified`. Any failed
   check aborts and rolls back the whole transaction.
7. **Verify.** Run `04_verify.sql` (all `t`) and `01_inventory.sql` again. Every
   `fingerprint` row must be identical to step 1.
8. **Smoke test.** Sign up a new account, ask Wasel a question, create a
   complaint, and open the dashboard.

## Safety properties (rehearsed locally)

- **No approved count, wrong count, or an unknown keep-list email:** refuses
  and changes nothing.
- **Unreviewed public table present (schema drift):** refuses and changes
  nothing.
- **Reference data, policies, RLS flags, functions, triggers or columns differ
  after deletion:** aborts and rolls back.
- **Re-running after a successful execution:** finds 0 accounts in scope, which
  no longer matches the approved count, and refuses (idempotent).
- **Order:** deletes children first. No foreign key in this schema has
  `ON DELETE CASCADE`, and the `complaints` ↔ `complaint_versions` cycle is
  broken by clearing `current_version_id` first.

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

- **Selective recovery** of particular accounts: restore into a separate
  database as above, then copy the needed rows back in dependency order
  (`auth.users`, `profiles`, `conversations`, `messages`,
  `collected_information`, `complaints` without `current_version_id`,
  `complaint_versions`, then set `current_version_id`).
- **Platform recovery:** Supabase point-in-time recovery or a daily backup, if
  the project's plan includes it.
