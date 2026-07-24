create index if not exists idx_collected_information_source_message_id
  on public.collected_information (source_message_id);
create index if not exists idx_complaints_complaint_type_id
  on public.complaints (complaint_type_id);
create index if not exists idx_complaints_current_version_id
  on public.complaints (current_version_id);
create index if not exists idx_complaints_service_id
  on public.complaints (service_id);
create index if not exists idx_conversations_complaint_type_id
  on public.conversations (complaint_type_id);
create index if not exists idx_conversations_entity_id
  on public.conversations (entity_id);
create index if not exists idx_conversations_service_id
  on public.conversations (service_id);
create index if not exists idx_conversations_user_id
  on public.conversations (user_id);
create index if not exists idx_official_sources_entity_id
  on public.official_sources (entity_id);
create index if not exists idx_official_sources_service_id
  on public.official_sources (service_id);
