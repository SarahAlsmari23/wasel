-- Water authority name correction (2026-11). Requires the backward-compatible
-- code (lib/government/entity-names.ts) to be deployed first; the app then
-- behaves the same before and after this script.
--
-- Changes reference data only:
--   government_entities.name_ar (code 'nwc', same row id) «الشركة الوطنية للمياه» → «شركة المياه الوطنية»
--   official_sources.source_name of the authority's existing row with the old name
--   knowledge_documents.entity label of the passages with the old name (content and embeddings untouched)
-- Never touched: complaints, complaint_versions (stored letters stay as written),
-- conversations, messages, collected_information, profiles, auth.
-- Guarded and atomic: any unexpected count raises and nothing is kept. Reversible: 99_rollback.sql.
do $nwc$
declare
  v_old constant text := 'الشركة الوطنية للمياه';
  v_new constant text := 'شركة المياه الوطنية';
  v_id uuid;
  n integer;
begin
  select id into v_id from public.government_entities where code = 'nwc';
  if v_id is null then raise exception 'nwc entity not found. Nothing changed.'; end if;
  if exists (select 1 from public.government_entities where name_ar = v_new) then
    raise exception 'An entity is already named %. Nothing changed.', v_new;
  end if;

  update public.government_entities set name_ar = v_new where id = v_id and name_ar = v_old;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Expected to rename 1 entity, renamed %. Nothing changed.', n; end if;

  update public.official_sources
  set source_name = v_new,
      notes = coalesce(notes || ' ', '') || 'renamed-from:' || v_old
  where entity_id = v_id and source_name = v_old;
  get diagnostics n = row_count;
  if n > 1 then raise exception 'Expected at most 1 official source named %, found %. Nothing changed.', v_old, n; end if;

  update public.knowledge_documents
  set entity = v_new,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('renamed_from', v_old)
  where entity = v_old;
  get diagnostics n = row_count;
  raise notice 'renamed: 1 entity, knowledge passages relabelled: %', n;
end
$nwc$;
