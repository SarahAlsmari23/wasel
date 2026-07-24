-- Requires migration 0003 to have moved the vector extension to extensions.
-- Must run before 0008.

alter table public.knowledge_documents
  alter column embedding type extensions.vector(768);
