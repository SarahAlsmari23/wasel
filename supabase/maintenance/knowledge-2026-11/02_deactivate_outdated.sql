-- Deactivates (never deletes) the 7 knowledge passages found outdated in the
-- 2026-11 audit: the 6 passages labelled with the legacy entity name
-- «الشركة السعودية للكهرباء» (the authority is «السعودية للطاقة») and the
-- municipal passage naming the former «وزارة الشؤون البلدية والقروية».
-- Inactive passages are excluded by match_knowledge_documents (is_active).
-- Guarded: aborts unless exactly these 7 active rows match. Reversible: 99_rollback.sql.
do $$
declare n integer;
begin
  select count(*) into n from public.knowledge_documents
  where is_active
    and (entity = 'الشركة السعودية للكهرباء'
         or (entity = 'وزارة البلديات والإسكان' and title = 'بلاغات تهالك الأرصفة'));
  if n <> 7 then
    raise exception 'Expected 7 outdated active passages, found %. Nothing changed.', n;
  end if;
  update public.knowledge_documents
  set is_active = false,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('deactivated_by', 'kb:verified-2026-11', 'deactivated_reason', 'outdated authority name')
  where is_active
    and (entity = 'الشركة السعودية للكهرباء'
         or (entity = 'وزارة البلديات والإسكان' and title = 'بلاغات تهالك الأرصفة'));
end $$;
