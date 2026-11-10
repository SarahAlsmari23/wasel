-- =============================================================================
-- Wasel launch cleanup — 03 · CLEANUP (destructive only in 'execute' mode)
-- =============================================================================
-- DO NOT RUN IN 'execute' MODE WITHOUT WRITTEN APPROVAL OF THE DELETION SCOPE
-- AND A VERIFIED BACKUP (see README.md).
--
-- What it deletes — for every auth account NOT listed in v_keep_emails:
--   retrieval_logs, attachments, collected_information, complaint_versions,
--   complaints, messages and conversations belonging to that account, then
--   its profile and its auth.users row (auth.identities, sessions, refresh
--   tokens and MFA factors follow by their own ON DELETE CASCADE).
--
-- What it never touches: domains, government_entities, complaint_types,
-- government_services, official_sources, knowledge_documents (content and
-- embeddings), any schema object, RLS policy, function, trigger, extension
-- or configuration. It drops nothing, truncates nothing and disables nothing.
--
-- Safety design:
--   * One DO block = one transaction. Any failed check raises an exception
--     and PostgreSQL rolls back everything.
--   * 'dry_run' (the default) performs the full deletion, runs every check,
--     reports the exact counts, then deliberately raises an exception so
--     nothing is kept. The "error" text IS the dry-run report.
--   * v_expected_users must equal the approved number of accounts to delete,
--     or nothing happens (protects against new sign-ups since the review).
--   * Reference data, RLS policies, RLS flags, public functions, triggers and
--     columns are fingerprinted before and after; any difference aborts.
--   * Idempotent: a second run finds 0 accounts to delete, which no longer
--     matches v_expected_users, so it aborts without changing anything.
-- =============================================================================

do $cleanup$
declare
  -- ======================= CONFIGURATION (edit only these) ===================
  v_mode text := 'dry_run';                     -- 'dry_run' | 'execute'
  v_keep_emails text[] := array[]::text[];      -- accounts to KEEP, e.g. array['owner@domain.sa']
  v_expected_users integer := null;             -- approved number of accounts to DELETE
  v_purge_auth_audit_log boolean := false;      -- also clear auth.audit_log_entries (sign-in history)
  -- ===========================================================================

  v_fingerprint_sql constant text := $fp$
    select string_agg(item || '=' || value, E'\n' order by item) from (
      select 'ref.domains' as item, count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) as value from public.domains x
      union all select 'ref.government_entities', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_entities x
      union all select 'ref.complaint_types', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.complaint_types x
      union all select 'ref.government_services', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_services x
      union all select 'ref.official_sources', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.official_sources x
      union all select 'ref.knowledge_documents', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.knowledge_documents x
      union all select 'schema.policies', count(*) || '/' || md5(coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ',' order by schemaname, tablename, policyname), '')) from pg_policies where schemaname in ('public', 'storage')
      union all select 'schema.rls_enabled', (count(*) filter (where c.relrowsecurity)) || ' of ' || count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
      union all select 'schema.functions', count(*) || '/' || md5(coalesce(string_agg(p.proname || ':' || p.prosrc, ',' order by p.proname, p.oid), '')) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      union all select 'schema.triggers', count(*) || '/' || md5(coalesce(string_agg(c.relname || '.' || t.tgname, ',' order by c.relname, t.tgname), '')) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname in ('public', 'auth')
      union all select 'schema.columns', count(*) || '/' || md5(coalesce(string_agg(table_name || '.' || column_name || ':' || data_type, ',' order by table_name, column_name), '')) from information_schema.columns where table_schema = 'public'
    ) f
  $fp$;

  v_before text;
  v_after text;
  v_target_count integer;
  v_conversation_count integer;
  v_unknown_tables text;
  v_kept_found integer;
  n integer;
  v_report text := '';
begin
  -- --- configuration checks -------------------------------------------------
  if v_mode not in ('dry_run', 'execute') then
    raise exception 'v_mode must be dry_run or execute (got %)', v_mode;
  end if;
  if v_expected_users is null then
    raise exception 'Set v_expected_users to the approved number of accounts to delete. Nothing was changed.';
  end if;

  select count(*) into v_kept_found
  from auth.users u
  where lower(u.email) = any (select lower(e) from unnest(v_keep_emails) e);
  if v_kept_found <> coalesce(array_length(v_keep_emails, 1), 0) then
    raise exception 'Some v_keep_emails do not match an existing account (% of % found). Nothing was changed.',
      v_kept_found, coalesce(array_length(v_keep_emails, 1), 0);
  end if;

  -- --- schema drift guard: refuse to run on tables this script does not know --
  select string_agg(c.relname, ', ') into v_unknown_tables
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname not in (
      'profiles', 'conversations', 'messages', 'collected_information', 'complaints',
      'complaint_versions', 'attachments', 'retrieval_logs',
      'domains', 'government_entities', 'complaint_types', 'government_services',
      'official_sources', 'knowledge_documents');
  if v_unknown_tables is not null then
    raise exception 'Unreviewed public tables present (%). Review them before cleanup. Nothing was changed.', v_unknown_tables;
  end if;

  -- --- scope ---------------------------------------------------------------
  create temporary table _cleanup_users on commit drop as
    select u.id from auth.users u
    where u.email is null
       or lower(u.email) <> all (select lower(e) from unnest(v_keep_emails) e);
  select count(*) into v_target_count from _cleanup_users;

  if v_target_count <> v_expected_users then
    raise exception 'Scope mismatch: % accounts would be deleted but % were approved. Nothing was changed.',
      v_target_count, v_expected_users;
  end if;

  create temporary table _cleanup_conversations on commit drop as
    select c.id from public.conversations c where c.user_id in (select id from _cleanup_users);
  select count(*) into v_conversation_count from _cleanup_conversations;

  -- Cross-ownership guard: a kept account's record must never hang off a
  -- conversation that is about to be deleted.
  if exists (select 1 from public.complaints k
             where k.conversation_id in (select id from _cleanup_conversations)
               and k.user_id not in (select id from _cleanup_users))
     or exists (select 1 from public.attachments a
                where a.conversation_id in (select id from _cleanup_conversations)
                  and a.user_id not in (select id from _cleanup_users)) then
    raise exception 'A kept account owns records inside a targeted conversation. Nothing was changed.';
  end if;

  execute v_fingerprint_sql into v_before;

  -- --- deletion, children first (no table here has ON DELETE CASCADE) --------
  delete from public.retrieval_logs where conversation_id in (select id from _cleanup_conversations);
  get diagnostics n = row_count; v_report := v_report || format(E'retrieval_logs: %s\n', n);

  delete from public.attachments
  where conversation_id in (select id from _cleanup_conversations) or user_id in (select id from _cleanup_users);
  get diagnostics n = row_count; v_report := v_report || format(E'attachments: %s\n', n);

  delete from public.collected_information where conversation_id in (select id from _cleanup_conversations);
  get diagnostics n = row_count; v_report := v_report || format(E'collected_information: %s\n', n);

  -- complaints.current_version_id <-> complaint_versions.complaint_id is a
  -- circular pair: detach the pointer, then remove versions, then complaints.
  update public.complaints set current_version_id = null
  where user_id in (select id from _cleanup_users) and current_version_id is not null;

  delete from public.complaint_versions
  where complaint_id in (select id from public.complaints where user_id in (select id from _cleanup_users));
  get diagnostics n = row_count; v_report := v_report || format(E'complaint_versions: %s\n', n);

  delete from public.complaints where user_id in (select id from _cleanup_users);
  get diagnostics n = row_count; v_report := v_report || format(E'complaints: %s\n', n);

  delete from public.messages where conversation_id in (select id from _cleanup_conversations);
  get diagnostics n = row_count; v_report := v_report || format(E'messages: %s\n', n);

  delete from public.conversations where id in (select id from _cleanup_conversations);
  get diagnostics n = row_count; v_report := v_report || format(E'conversations: %s\n', n);

  delete from public.profiles where id in (select id from _cleanup_users);
  get diagnostics n = row_count; v_report := v_report || format(E'profiles: %s\n', n);

  delete from auth.users where id in (select id from _cleanup_users);
  get diagnostics n = row_count; v_report := v_report || format(E'auth.users: %s\n', n);

  if v_purge_auth_audit_log then
    delete from auth.audit_log_entries;
    get diagnostics n = row_count; v_report := v_report || format(E'auth.audit_log_entries: %s\n', n);
  end if;

  -- --- verification ----------------------------------------------------------
  if exists (select 1 from auth.users where id in (select id from _cleanup_users))
     or exists (select 1 from public.profiles where id in (select id from _cleanup_users))
     or exists (select 1 from public.conversations where user_id in (select id from _cleanup_users))
     or exists (select 1 from public.complaints where user_id in (select id from _cleanup_users)) then
    raise exception 'Verification failed: targeted rows remain. Rolled back.';
  end if;

  -- Every account outside the keep list was in scope, so exactly the kept
  -- accounts must remain.
  if (select count(*) from auth.users) <> v_kept_found then
    raise exception 'Verification failed: unexpected account count. Rolled back.';
  end if;

  execute v_fingerprint_sql into v_after;
  if v_after is distinct from v_before then
    raise exception E'Verification failed: reference data or schema changed. Rolled back.\nBEFORE:\n%\nAFTER:\n%', v_before, v_after;
  end if;

  v_report := v_report || format(E'kept accounts: %s\nreference data + schema fingerprint: unchanged', v_kept_found);

  if v_mode = 'dry_run' then
    raise exception E'DRY RUN OK — nothing was changed (rolled back).\nWould delete:\n%', v_report
      using errcode = 'P0001';
  end if;

  raise notice E'CLEANUP EXECUTED and verified:\n%', v_report;
end
$cleanup$;
