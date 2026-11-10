-- =============================================================================
-- Wasel launch cleanup — 04 · POST-CLEANUP VERIFICATION (read-only)
-- =============================================================================
-- Run after 03 in 'execute' mode. Every row must show ok = true. Compare the
-- `fingerprint` rows of 01_inventory.sql taken before and after: they must be
-- identical.
-- =============================================================================

begin transaction read only;

select check_name, ok, detail from (
  select 1 as ord, 'no orphan profiles' as check_name,
    not exists (select 1 from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id)) as ok,
    '' as detail
  union all select 2, 'no orphan conversations',
    not exists (select 1 from public.conversations c where not exists (select 1 from public.profiles p where p.id = c.user_id)), ''
  union all select 3, 'no orphan messages',
    not exists (select 1 from public.messages m where not exists (select 1 from public.conversations c where c.id = m.conversation_id)), ''
  union all select 4, 'no orphan complaint versions',
    not exists (select 1 from public.complaint_versions v where not exists (select 1 from public.complaints k where k.id = v.complaint_id)), ''
  union all select 5, 'every complaint has a current version',
    not exists (select 1 from public.complaints k where k.current_version_id is null and k.status <> 'draft'), ''
  union all select 6, 'knowledge documents present',
    (select count(*) from public.knowledge_documents) > 0,
    (select count(*) || ' documents, ' || count(embedding) || ' with embeddings' from public.knowledge_documents)
  union all select 7, 'embedding dimension unchanged (768)',
    (select format_type(atttypid, atttypmod) from pg_attribute
     where attrelid = 'public.knowledge_documents'::regclass and attname = 'embedding') = 'vector(768)', ''
  union all select 8, 'government entities present',
    (select count(*) from public.government_entities) >= 5,
    (select count(*)::text from public.government_entities)
  union all select 9, 'RLS enabled on every public table',
    not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), ''
  union all select 10, 'new-user trigger present',
    exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'), ''
  union all select 11, 'retrieval function present',
    exists (select 1 from pg_proc where proname = 'match_knowledge_documents'), ''
) checks
order by ord;

rollback;
