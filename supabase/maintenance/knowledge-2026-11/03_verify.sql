-- Read-only checks after 01, the verified ingestion, and 02.
select
  (select count(*) from public.official_sources where notes like 'kb:verified-2026-11%') as verified_source_rows,
  (select count(*) from public.official_sources where last_checked_at is null) as sources_never_checked,
  (select count(*) from public.knowledge_documents where is_active) as active_passages,
  (select count(*) from public.knowledge_documents where metadata->>'kb_version' = 'verified-2026-11') as verified_passages,
  (select count(*) from public.knowledge_documents where is_active and entity = 'الشركة السعودية للكهرباء') as active_legacy_named,
  (select count(*) from public.knowledge_documents where metadata->>'kb_version' = 'verified-2026-11' and embedding is null) as verified_without_embedding,
  (select count(distinct embedding_model) from public.knowledge_documents) as embedding_models,
  (select count(*) from public.government_entities) as entities,
  (select count(*) from public.government_services) as services;
