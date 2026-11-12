-- Read-only checks after 01_rename.sql (expected: new_name 1, old_name 0, same id, letters untouched).
select
  (select count(*) from public.government_entities where name_ar = 'شركة المياه الوطنية') as new_name_entities,
  (select count(*) from public.government_entities where name_ar = 'الشركة الوطنية للمياه') as old_name_entities,
  (select id from public.government_entities where code = 'nwc') as nwc_id,
  (select count(*) from public.knowledge_documents where entity = 'الشركة الوطنية للمياه') as old_name_passages,
  (select count(*) from public.complaints c join public.government_entities e on e.id = c.entity_id where e.code = 'nwc') as nwc_complaints,
  (select count(*) from public.complaint_versions where complaint_text like 'إلى: الشركة الوطنية للمياه%') as historical_letters_kept;
