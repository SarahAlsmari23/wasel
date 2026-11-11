-- Restores the knowledge base to its pre-2026-11 state (one atomic DO block).
do $rb$
begin
  delete from public.knowledge_documents where metadata->>'kb_version' = 'verified-2026-11';
  update public.knowledge_documents
  set is_active = true, metadata = metadata - 'deactivated_by' - 'deactivated_reason'
  where metadata->>'deactivated_by' = 'kb:verified-2026-11';
  delete from public.official_sources where notes like 'kb:verified-2026-11%';
  update public.official_sources
  set notes = nullif(regexp_replace(notes, ' ?home page re-checked [0-9-]+$', ''), ''), last_checked_at = null
  where notes like '%home page re-checked%';
end
$rb$;
