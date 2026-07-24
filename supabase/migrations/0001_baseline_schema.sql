-- Baseline schema snapshot.
--
-- This is a hand-reconstruction of the schema exactly as it exists today on the
-- remote Wasal project (ref: lijbyntwbfegfjefmnel), built from read-only
-- introspection (list_tables, pg_get_functiondef, information_schema.triggers,
-- pg_indexes) rather than `supabase db pull` (see Phase 2 plan for why: `db pull`
-- would write a migration-tracking table to the remote database, which this
-- phase avoids entirely). It has not been applied anywhere yet.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema public;

-- === Reference / lookup tables ===================================

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  description_ar text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.domains enable row level security;

create table public.government_entities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  entity_type text not null default 'government',
  description_ar text,
  official_website text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.government_entities enable row level security;

create table public.complaint_types (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id),
  code text not null unique,
  name_ar text not null,
  description_ar text not null,
  examples_ar jsonb not null default '[]',
  keywords_ar jsonb not null default '[]',
  required_fields jsonb not null default '[]',
  clarification_rules jsonb not null default '[]',
  severity_rules jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.complaint_types enable row level security;
create index complaint_types_domain_idx on public.complaint_types (domain_id);

create table public.government_services (
  id uuid primary key default gen_random_uuid(),
  complaint_type_id uuid not null references public.complaint_types (id),
  entity_id uuid not null references public.government_entities (id),
  name_ar text not null,
  description_ar text not null,
  official_url text,
  required_documents jsonb not null default '[]',
  routing_rules jsonb not null default '{}',
  escalation_rules jsonb not null default '{}',
  is_active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.government_services enable row level security;
create index services_complaint_type_idx on public.government_services (complaint_type_id);
create index services_entity_idx on public.government_services (entity_id);

create table public.official_sources (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.government_services (id),
  entity_id uuid references public.government_entities (id),
  source_name text not null,
  source_url text not null,
  source_type text not null default 'official_webpage',
  verification_status text not null default 'pending',
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.official_sources enable row level security;

-- === Knowledge base (RAG) =========================================
-- knowledge_documents is never given an anon/authenticated RLS policy, in this
-- migration or any other. RLS-enabled-with-no-policy is the intended access
-- control: server-side / service_role only.

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.government_services (id),
  complaint_type_id uuid references public.complaint_types (id),
  title text not null,
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector,
  embedding_model text,
  content_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sector text,
  entity text,
  document_type text,
  source_file text
);
alter table public.knowledge_documents enable row level security;
create index knowledge_documents_service_idx on public.knowledge_documents (service_id);
create index knowledge_documents_complaint_type_idx on public.knowledge_documents (complaint_type_id);

-- === User & conversation flow ======================================

create table public.profiles (
  id uuid primary key references auth.users (id),
  full_name text,
  email text,
  avatar_url text,
  preferred_theme text not null default 'system'
    check (preferred_theme = any (array['light', 'dark', 'system'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  entity_id uuid references public.government_entities (id),
  service_id uuid references public.government_services (id),
  complaint_type_id uuid references public.complaint_types (id),
  title text not null default 'محادثة جديدة',
  conversation_status text not null default 'collecting_information'
    check (conversation_status = any (array[
      'collecting_information', 'determining_authority', 'ready_to_generate',
      'complaint_generated', 'completed'
    ])),
  entity_reason text,
  started_at timestamptz not null default now(),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  role text not null check (role = any (array['user', 'assistant', 'system'])),
  content text not null,
  message_type text not null default 'text'
    check (message_type = any (array[
      'text', 'status_update', 'entity_update', 'complaint_card', 'confirmation', 'error'
    ])),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index idx_messages_conversation_id on public.messages (conversation_id);
create index idx_messages_created_at on public.messages (created_at);

create table public.collected_information (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  field_key text not null,
  field_label_ar text not null,
  field_value text,
  source_message_id uuid references public.messages (id),
  is_required boolean not null default false,
  confidence_score numeric
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, field_key)
);
alter table public.collected_information enable row level security;
create index idx_collected_information_conversation_id on public.collected_information (conversation_id);

-- complaints <-> complaint_versions is a circular FK pair: complaints references
-- its own current_version_id, and complaint_versions references its parent
-- complaint. complaints is created first without that FK, complaint_versions is
-- created next, then the FK is added to complaints afterward.

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id),
  user_id uuid not null references public.profiles (id),
  entity_id uuid references public.government_entities (id),
  service_id uuid references public.government_services (id),
  complaint_type_id uuid references public.complaint_types (id),
  reference_number text not null unique,
  status text not null default 'draft'
    check (status = any (array['draft', 'generated', 'completed'])),
  current_version_id uuid,
  generated_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.complaints enable row level security;
create index idx_complaints_user_id on public.complaints (user_id);
create index idx_complaints_status on public.complaints (status);
create index idx_complaints_entity_id on public.complaints (entity_id);

create table public.complaint_versions (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id),
  version_number integer not null check (version_number > 0),
  complaint_text text not null,
  generated_from_data jsonb not null default '{}',
  change_summary text,
  is_current boolean not null default false,
  pdf_url text,
  created_at timestamptz not null default now(),
  unique (complaint_id, version_number)
);
alter table public.complaint_versions enable row level security;
create index idx_complaint_versions_complaint_id on public.complaint_versions (complaint_id);
create unique index idx_one_current_version_per_complaint
  on public.complaint_versions (complaint_id) where (is_current = true);

alter table public.complaints
  add constraint complaints_current_version_id_fkey
  foreign key (current_version_id) references public.complaint_versions (id);

-- attachments: schema only. No RLS policy is added for this table in any
-- migration — it is a future, unbuilt feature and stays completely untouched.

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  message_id uuid references public.messages (id),
  user_id uuid not null references public.profiles (id),
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  attachment_type text not null default 'other'
    check (attachment_type = any (array[
      'image', 'pdf', 'document', 'invoice', 'receipt', 'contract', 'other'
    ])),
  analysis_status text not null default 'pending'
    check (analysis_status = any (array['pending', 'processing', 'completed', 'failed'])),
  extracted_text text,
  analysis_result jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.attachments enable row level security;
create index idx_attachments_conversation_id on public.attachments (conversation_id);
create index idx_attachments_message_id on public.attachments (message_id);
create index idx_attachments_user_id on public.attachments (user_id);

create table public.retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  message_id uuid references public.messages (id),
  knowledge_document_id uuid not null references public.knowledge_documents (id),
  rank_position integer check (rank_position is null or rank_position > 0),
  similarity_score numeric
    check (similarity_score is null or (similarity_score >= 0 and similarity_score <= 1)),
  chunk_excerpt text,
  created_at timestamptz not null default now(),
  unique (message_id, knowledge_document_id)
);
alter table public.retrieval_logs enable row level security;
create index idx_retrieval_logs_conversation_id on public.retrieval_logs (conversation_id);
create index idx_retrieval_logs_message_id on public.retrieval_logs (message_id);
create index idx_retrieval_logs_document_id on public.retrieval_logs (knowledge_document_id);

-- === Functions & triggers ==========================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger set_collected_information_updated_at
  before update on public.collected_information
  for each row execute function public.set_updated_at();

create trigger set_complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url;

  return new;
end;
$function$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
