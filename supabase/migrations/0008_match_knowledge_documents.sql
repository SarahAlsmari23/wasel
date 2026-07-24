-- Requires migrations 0003 and 0007 to have been applied first.

create or replace function public.match_knowledge_documents(
  query_embedding extensions.vector(768),
  match_count int default 5,
  similarity_threshold float default 0.7,
  filter_service_id uuid default null,
  filter_complaint_type_id uuid default null
)
returns table (
  id uuid,
  title text,
  content text,
  service_id uuid,
  complaint_type_id uuid,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    kd.id,
    kd.title,
    kd.content,
    kd.service_id,
    kd.complaint_type_id,
    1 - (kd.embedding <=> query_embedding) as similarity
  from public.knowledge_documents kd
  where kd.is_active = true
    and kd.embedding is not null
    and (
      filter_service_id is null
      or kd.service_id = filter_service_id
    )
    and (
      filter_complaint_type_id is null
      or kd.complaint_type_id = filter_complaint_type_id
    )
    and 1 - (kd.embedding <=> query_embedding) >= similarity_threshold
  order by kd.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 5);
$$;

revoke execute on function public.match_knowledge_documents(
  extensions.vector,
  integer,
  double precision,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.match_knowledge_documents(
  extensions.vector,
  integer,
  double precision,
  uuid,
  uuid
) to service_role;
