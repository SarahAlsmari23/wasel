-- =============================================================================
-- Wasel launch cleanup — 01 · INVENTORY (read-only)
-- =============================================================================
-- Run in the Supabase SQL Editor (or psql). It only reads: the whole query runs
-- inside a READ ONLY transaction that is rolled back.
--
-- Output: one row per item, grouped by section:
--   user_data     row counts of every user-generated table (proposed deletion)
--   reference     row counts of reference / knowledge tables (always preserved)
--   auth          account counts by kind
--   fingerprint   checksums of everything that must be identical after cleanup
--   drift         any public table this kit does not know about (must be 0 rows
--                 of output to proceed — a new table needs review first)
-- =============================================================================

begin transaction read only;

with
user_counts as (
  select 'user_data' as section, 'profiles' as item, count(*)::text as value from public.profiles
  union all select 'user_data', 'conversations', count(*)::text from public.conversations
  union all select 'user_data', 'messages', count(*)::text from public.messages
  union all select 'user_data', 'collected_information', count(*)::text from public.collected_information
  union all select 'user_data', 'complaints', count(*)::text from public.complaints
  union all select 'user_data', 'complaint_versions', count(*)::text from public.complaint_versions
  union all select 'user_data', 'attachments', count(*)::text from public.attachments
  union all select 'user_data', 'retrieval_logs', count(*)::text from public.retrieval_logs
),
reference_counts as (
  select 'reference' as section, 'domains' as item, count(*)::text as value from public.domains
  union all select 'reference', 'government_entities', count(*)::text from public.government_entities
  union all select 'reference', 'complaint_types', count(*)::text from public.complaint_types
  union all select 'reference', 'government_services', count(*)::text from public.government_services
  union all select 'reference', 'official_sources', count(*)::text from public.official_sources
  union all select 'reference', 'knowledge_documents', count(*)::text from public.knowledge_documents
  union all select 'reference', 'knowledge_documents with embedding',
    count(*)::text from public.knowledge_documents where embedding is not null
),
auth_counts as (
  select 'auth' as section, 'auth.users (all)' as item, count(*)::text as value from auth.users
  union all select 'auth', 'auth.users without a profile',
    count(*)::text from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)
  union all select 'auth', 'auth.users anonymous', count(*)::text from auth.users where is_anonymous
  union all select 'auth', 'auth.users email confirmed', count(*)::text from auth.users where email_confirmed_at is not null
  union all select 'auth', 'auth.identities', count(*)::text from auth.identities
  union all select 'auth', 'auth.sessions', count(*)::text from auth.sessions
  union all select 'auth', 'auth.refresh_tokens', count(*)::text from auth.refresh_tokens
  union all select 'auth', 'auth.audit_log_entries', count(*)::text from auth.audit_log_entries
  union all select 'auth', 'storage.objects', count(*)::text from storage.objects
),
fingerprint as (
  select 'fingerprint' as section, 'reference rows' as item, md5(string_agg(t, '|' order by t)) as value
  from (
    select 'd' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) as t from public.domains x
    union all select 'e' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_entities x
    union all select 't' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.complaint_types x
    union all select 's' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_services x
    union all select 'o' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.official_sources x
    union all select 'k' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.knowledge_documents x
  ) parts
  union all
  select 'fingerprint', 'rls policies',
    count(*) || ' / ' || md5(coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ',' order by schemaname, tablename, policyname), ''))
  from pg_policies where schemaname in ('public', 'storage')
  union all
  select 'fingerprint', 'rls enabled (public tables)',
    count(*) filter (where c.relrowsecurity) || ' of ' || count(*)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  union all
  select 'fingerprint', 'public functions',
    count(*) || ' / ' || md5(coalesce(string_agg(p.proname || ':' || p.prosrc, ',' order by p.proname, p.oid), ''))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all
  select 'fingerprint', 'triggers (public, auth)',
    count(*) || ' / ' || md5(coalesce(string_agg(c.relname || '.' || t.tgname, ',' order by c.relname, t.tgname), ''))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname in ('public', 'auth')
  union all
  select 'fingerprint', 'public columns',
    count(*) || ' / ' || md5(coalesce(string_agg(table_name || '.' || column_name || ':' || data_type, ',' order by table_name, column_name), ''))
  from information_schema.columns where table_schema = 'public'
),
drift as (
  select 'drift' as section, 'UNKNOWN public table: ' || c.relname as item, 'review before cleanup' as value
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname not in (
      'profiles', 'conversations', 'messages', 'collected_information', 'complaints',
      'complaint_versions', 'attachments', 'retrieval_logs',
      'domains', 'government_entities', 'complaint_types', 'government_services',
      'official_sources', 'knowledge_documents'
    )
  union all
  select 'drift', 'UNKNOWN foreign key into user data: ' || conrelid::regclass || ' -> ' || confrelid::regclass,
    'review before cleanup'
  from pg_constraint
  where contype = 'f'
    and confrelid in ('public.profiles'::regclass, 'public.conversations'::regclass,
                      'public.messages'::regclass, 'public.complaints'::regclass,
                      'public.complaint_versions'::regclass)
    and conrelid not in ('public.conversations'::regclass, 'public.messages'::regclass,
                         'public.collected_information'::regclass, 'public.complaints'::regclass,
                         'public.complaint_versions'::regclass, 'public.attachments'::regclass,
                         'public.retrieval_logs'::regclass)
)
select * from user_counts
union all select * from reference_counts
union all select * from auth_counts
union all select * from fingerprint
union all select * from drift;

rollback;
