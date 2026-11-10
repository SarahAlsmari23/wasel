-- =============================================================================
-- Wasel launch cleanup — 03 · CLEANUP (destructive only in 'execute' mode)
-- =============================================================================
-- DO NOT RUN IN 'execute' MODE WITHOUT WRITTEN APPROVAL OF THE DELETION PLAN
-- AND A VERIFIED, RESTORE-TESTED BACKUP (see README.md).
--
-- Deletes exactly the accounts listed in v_targets (each given as its auth
-- user id AND its email — both must match) and everything they own:
--   public:  retrieval_logs, attachments, collected_information,
--            complaint_versions, complaints, messages, conversations
--            (in-progress drafts are complaint-mode conversations), profiles
--   auth:    refresh_tokens and flow_state rows of those users (keyed by
--            user_id without a foreign key, so they are deleted explicitly),
--            plus flow_state rows already orphaned by earlier deletions
--            (counted and approved like everything else),
--            then auth.users — identities, sessions, MFA factors, one-time
--            tokens, OAuth consents and WebAuthn rows follow by their own
--            ON DELETE CASCADE.
--
-- Never touched: domains, government_entities, complaint_types,
-- government_services, official_sources, knowledge_documents (content and
-- embeddings), auth.audit_log_entries (security history), storage, any schema
-- object, index, constraint, grant, RLS policy, function, trigger, extension
-- or configuration. Nothing is dropped, truncated or disabled; foreign keys
-- and RLS stay enforced throughout.
--
-- Guards (any failure raises, and PostgreSQL rolls back everything):
--   * every target id must exist with exactly the listed email;
--   * no account outside v_targets may exist (a new sign-up since the review
--     stops the run so the plan can be revalidated);
--   * the per-table counts must equal the approved v_expected counts;
--   * unknown public tables, unknown foreign keys into user data, or storage
--     objects owned by a target stop the run;
--   * reference data, schema, indexes, constraints, grants, RLS and storage
--     buckets are fingerprinted before and after and must be identical;
--   * after deletion no row owned by a target and no orphan may remain.
-- 'dry_run' (the default) performs all of the above, then raises so nothing
-- is kept: the error text "DRY RUN OK" is the report.
-- =============================================================================

do $cleanup$
declare
  -- ======================= CONFIGURATION (edit only these) ===================
  v_mode text := 'dry_run';  -- 'dry_run' | 'execute'
  -- Accounts to delete: array of [auth user id, email] pairs.
  v_targets text[][] := array[]::text[][];
  -- Approved counts from the reviewed dry run, e.g.
  -- '{"auth.users":10,"profiles":10,"conversations":103,...}'
  v_expected jsonb := null;
  -- ===========================================================================

  v_fingerprint_sql constant text := $fp$
    select string_agg(item || '=' || value, E'\n' order by item) from (
      select 'ref.domains' as item, count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) as value from public.domains x
      union all select 'ref.government_entities', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_entities x
      union all select 'ref.complaint_types', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.complaint_types x
      union all select 'ref.government_services', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.government_services x
      union all select 'ref.official_sources', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.official_sources x
      union all select 'ref.knowledge_documents', count(*) || '/' || md5(coalesce(string_agg(x::text, ',' order by x.id), '')) from public.knowledge_documents x
      union all select 'schema.policies', count(*) || '/' || md5(coalesce(string_agg(schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ',' order by schemaname, tablename, policyname), '')) from pg_policies where schemaname in ('public', 'storage')
      union all select 'schema.rls_enabled', (count(*) filter (where c.relrowsecurity)) || ' of ' || count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
      union all select 'schema.functions', count(*) || '/' || md5(coalesce(string_agg(p.proname || ':' || p.prosrc, ',' order by p.proname, p.oid), '')) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      union all select 'schema.triggers', count(*) || '/' || md5(coalesce(string_agg(c.relname || '.' || t.tgname, ',' order by c.relname, t.tgname), '')) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname in ('public', 'auth')
      union all select 'schema.columns', count(*) || '/' || md5(coalesce(string_agg(table_name || '.' || column_name || ':' || data_type, ',' order by table_name, column_name), '')) from information_schema.columns where table_schema = 'public'
      union all select 'schema.indexes', count(*) || '/' || md5(coalesce(string_agg(indexname || ':' || indexdef, ',' order by indexname), '')) from pg_indexes where schemaname = 'public'
      union all select 'schema.constraints', count(*) || '/' || md5(coalesce(string_agg(conrelid::regclass::text || '.' || conname || ':' || contype::text || ':' || confdeltype::text, ',' order by conrelid::regclass::text, conname), '')) from pg_constraint where connamespace = 'public'::regnamespace
      union all select 'schema.grants', count(*) || '/' || md5(coalesce(string_agg(c.relname || ':' || a.grantee::regrole::text || ':' || a.privilege_type, ',' order by c.relname, a.grantee::regrole::text, a.privilege_type), '')) from pg_class c cross join lateral aclexplode(c.relacl) a where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'S') and a.grantee <> 0 and a.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
      union all select 'storage.buckets', count(*)::text from storage.buckets
      union all select 'auth.audit_log_entries', count(*)::text from auth.audit_log_entries
    ) f
  $fp$;

  v_target_ids uuid[] := '{}';
  v_before text;
  v_after text;
  v_actual jsonb;
  v_problem text;
  n integer;
  v_report text := '';
  v_key text;
  v_i integer;
begin
  -- --- configuration checks -------------------------------------------------
  if v_mode not in ('dry_run', 'execute') then
    raise exception 'v_mode must be dry_run or execute (got %)', v_mode;
  end if;
  if coalesce(array_length(v_targets, 1), 0) = 0 then
    raise exception 'v_targets is empty. Nothing was changed.';
  end if;
  if v_expected is null then
    raise exception 'Set v_expected to the approved counts from the reviewed dry run. Nothing was changed.';
  end if;

  -- --- every target must exist with exactly the listed email -----------------
  for v_i in 1 .. array_length(v_targets, 1) loop
    if not exists (select 1 from auth.users u
                   where u.id::text = lower(v_targets[v_i][1]) and lower(u.email) = lower(v_targets[v_i][2])) then
      v_problem := concat_ws(', ', v_problem, format('%s <%s>', v_targets[v_i][1], v_targets[v_i][2]));
    end if;
  end loop;
  if v_problem is not null then
    raise exception 'Target accounts missing or with a different email: %. Nothing was changed.', v_problem;
  end if;

  select array_agg(distinct (v_targets[g.n][1])::uuid) into v_target_ids
  from generate_subscripts(v_targets, 1) as g(n);
  if array_length(v_target_ids, 1) <> array_length(v_targets, 1) then
    raise exception 'v_targets lists the same account twice. Nothing was changed.';
  end if;

  -- --- no account outside the approved list may exist ------------------------
  select string_agg(u.id::text, ', ') into v_problem from auth.users u where u.id <> all (v_target_ids);
  if v_problem is not null then
    raise exception 'Accounts outside the approved list exist (%) — new sign-ups since the review? Revalidate the plan. Nothing was changed.', v_problem;
  end if;

  -- --- schema drift guards ----------------------------------------------------
  select string_agg(c.relname, ', ') into v_problem
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname not in (
      'profiles', 'conversations', 'messages', 'collected_information', 'complaints',
      'complaint_versions', 'attachments', 'retrieval_logs',
      'domains', 'government_entities', 'complaint_types', 'government_services',
      'official_sources', 'knowledge_documents');
  if v_problem is not null then
    raise exception 'Unreviewed public tables present (%). Review them before cleanup. Nothing was changed.', v_problem;
  end if;

  select string_agg(conrelid::regclass || ' -> ' || confrelid::regclass, ', ') into v_problem
  from pg_constraint
  where contype = 'f'
    and confrelid in ('public.profiles'::regclass, 'public.conversations'::regclass,
                      'public.messages'::regclass, 'public.complaints'::regclass,
                      'public.complaint_versions'::regclass)
    and conrelid not in ('public.conversations'::regclass, 'public.messages'::regclass,
                         'public.collected_information'::regclass, 'public.complaints'::regclass,
                         'public.complaint_versions'::regclass, 'public.attachments'::regclass,
                         'public.retrieval_logs'::regclass);
  if v_problem is not null then
    raise exception 'Unreviewed foreign keys into user data (%). Nothing was changed.', v_problem;
  end if;

  if exists (select 1 from storage.objects where owner = any (v_target_ids) or owner_id = any (array(select unnest(v_target_ids)::text))) then
    raise exception 'Storage objects owned by a target exist; remove them through the Storage API first. Nothing was changed.';
  end if;

  -- --- scope ------------------------------------------------------------------
  create temporary table _t_users on commit drop as select unnest(v_target_ids) as id;
  create temporary table _t_conversations on commit drop as
    select c.id from public.conversations c where c.user_id in (select id from _t_users);
  create temporary table _t_complaints on commit drop as
    select k.id from public.complaints k
    where k.user_id in (select id from _t_users) or k.conversation_id in (select id from _t_conversations);

  -- A record owned by someone else must never hang off a targeted row.
  if exists (select 1 from public.complaints k where k.id in (select id from _t_complaints) and k.user_id not in (select id from _t_users))
     or exists (select 1 from public.attachments a where a.conversation_id in (select id from _t_conversations) and a.user_id not in (select id from _t_users)) then
    raise exception 'A non-target account owns records inside targeted data. Nothing was changed.';
  end if;

  v_actual := jsonb_build_object(
    'auth.users', (select count(*) from auth.users where id in (select id from _t_users)),
    'auth.identities', (select count(*) from auth.identities where user_id in (select id from _t_users)),
    'profiles', (select count(*) from public.profiles where id in (select id from _t_users)),
    'conversations', (select count(*) from _t_conversations),
    'drafts (complaint conversations without a complaint)', (select count(*) from public.conversations c
       where c.id in (select id from _t_conversations) and c.conversation_type = 'complaint'
         and not exists (select 1 from public.complaints k where k.conversation_id = c.id)),
    'messages', (select count(*) from public.messages where conversation_id in (select id from _t_conversations)),
    'collected_information', (select count(*) from public.collected_information where conversation_id in (select id from _t_conversations)),
    'complaints', (select count(*) from _t_complaints),
    'complaint_versions', (select count(*) from public.complaint_versions where complaint_id in (select id from _t_complaints)),
    'attachments', (select count(*) from public.attachments where conversation_id in (select id from _t_conversations) or user_id in (select id from _t_users)),
    'retrieval_logs', (select count(*) from public.retrieval_logs where conversation_id in (select id from _t_conversations)),
    -- Sign-up/sign-in state left behind by accounts that were deleted before
    -- this run: owned by a user id that no longer exists.
    'auth.flow_state orphaned (account already gone)', (select count(*) from auth.flow_state f
       where f.user_id is not null and not exists (select 1 from auth.users u where u.id = f.user_id))
  );

  select string_agg(format('%s: approved %s, now %s', k, v_expected -> k, v_actual -> k), '; ') into v_problem
  from jsonb_object_keys(v_actual || v_expected) k
  where (v_expected -> k) is distinct from (v_actual -> k);
  if v_problem is not null then
    raise exception 'Counts differ from the approved plan (%). Revalidate. Nothing was changed.', v_problem;
  end if;

  -- Volatile auth state is reported, not gated (it changes with every sign-in).
  v_report := format(E'auth.sessions: %s\nauth.refresh_tokens: %s\nauth.one_time_tokens: %s\nauth.flow_state: %s\nauth.mfa_factors: %s\n',
    (select count(*) from auth.sessions where user_id in (select id from _t_users)),
    (select count(*) from auth.refresh_tokens where user_id in (select id::text from _t_users)),
    (select count(*) from auth.one_time_tokens where user_id in (select id from _t_users)),
    (select count(*) from auth.flow_state where user_id in (select id from _t_users)),
    (select count(*) from auth.mfa_factors where user_id in (select id from _t_users)));

  execute v_fingerprint_sql into v_before;

  -- --- deletion, children first (explicit even where a cascade exists) -------
  delete from public.retrieval_logs where conversation_id in (select id from _t_conversations);
  delete from public.attachments where conversation_id in (select id from _t_conversations) or user_id in (select id from _t_users);
  delete from public.collected_information where conversation_id in (select id from _t_conversations);
  update public.complaints set current_version_id = null where id in (select id from _t_complaints) and current_version_id is not null;
  delete from public.complaint_versions where complaint_id in (select id from _t_complaints);
  delete from public.complaints where id in (select id from _t_complaints);
  delete from public.messages where conversation_id in (select id from _t_conversations);
  delete from public.conversations where id in (select id from _t_conversations);
  delete from public.profiles where id in (select id from _t_users);
  delete from auth.refresh_tokens where user_id in (select id::text from _t_users);
  delete from auth.flow_state where user_id in (select id from _t_users);
  delete from auth.flow_state f
  where f.user_id is not null and not exists (select 1 from auth.users u where u.id = f.user_id);
  delete from auth.users where id in (select id from _t_users);
  get diagnostics n = row_count;
  if n <> array_length(v_target_ids, 1) then
    raise exception 'Deleted % accounts, expected %. Rolled back.', n, array_length(v_target_ids, 1);
  end if;

  -- --- verification ------------------------------------------------------------
  if exists (select 1 from auth.users where id in (select id from _t_users))
     or exists (select 1 from auth.identities where user_id in (select id from _t_users))
     or exists (select 1 from auth.sessions where user_id in (select id from _t_users))
     or exists (select 1 from auth.refresh_tokens where user_id in (select id::text from _t_users))
     or exists (select 1 from auth.one_time_tokens where user_id in (select id from _t_users))
     or exists (select 1 from auth.flow_state where user_id in (select id from _t_users))
     or exists (select 1 from public.profiles where id in (select id from _t_users))
     or exists (select 1 from public.conversations where id in (select id from _t_conversations))
     or exists (select 1 from public.complaints where id in (select id from _t_complaints)) then
    raise exception 'Verification failed: targeted rows remain. Rolled back.';
  end if;

  if exists (select 1 from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id))
     or exists (select 1 from public.conversations c where not exists (select 1 from public.profiles p where p.id = c.user_id))
     or exists (select 1 from public.messages m where not exists (select 1 from public.conversations c where c.id = m.conversation_id))
     or exists (select 1 from public.collected_information i where not exists (select 1 from public.conversations c where c.id = i.conversation_id))
     or exists (select 1 from public.complaint_versions v where not exists (select 1 from public.complaints k where k.id = v.complaint_id)) then
    raise exception 'Verification failed: orphaned rows. Rolled back.';
  end if;

  execute v_fingerprint_sql into v_after;
  if v_after is distinct from v_before then
    raise exception E'Verification failed: reference data or schema changed. Rolled back.\nBEFORE:\n%\nAFTER:\n%', v_before, v_after;
  end if;

  for v_key in select jsonb_object_keys(v_actual) order by 1 loop
    v_report := v_report || format(E'%s: %s\n', v_key, v_actual -> v_key);
  end loop;
  v_report := v_report || format(E'remaining accounts: %s\nreference data + schema fingerprint: unchanged\n%s',
    (select count(*) from auth.users), v_after);

  if v_mode = 'dry_run' then
    raise exception E'DRY RUN OK — nothing was changed (rolled back).\nWould delete:\n%', v_report
      using errcode = 'P0001';
  end if;

  raise notice E'CLEANUP EXECUTED and verified:\n%', v_report;
end
$cleanup$;
