-- Reverses 01_rename.sql exactly (only rows it marked). Stored letters were never changed.
do $rb$
declare
  v_old constant text := 'الشركة الوطنية للمياه';
  v_new constant text := 'شركة المياه الوطنية';
begin
  update public.government_entities set name_ar = v_old where code = 'nwc' and name_ar = v_new;
  update public.official_sources
  set source_name = v_old,
      notes = nullif(regexp_replace(notes, ' ?renamed-from:' || v_old || '$', ''), '')
  where notes like '%renamed-from:' || v_old;
  update public.knowledge_documents
  set entity = v_old, metadata = metadata - 'renamed_from'
  where metadata->>'renamed_from' = v_old;
end
$rb$;
