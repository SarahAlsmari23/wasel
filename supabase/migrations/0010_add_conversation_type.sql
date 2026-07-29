-- Numbered 0010, not 0009: migration 0009 (a proposed RLS policy allowing
-- authenticated clients to insert role='assistant'/'system' messages) was
-- explicitly rejected on security grounds and must never be created.
alter table public.conversations
  add column conversation_type text not null default 'assistant'
    check (conversation_type = any (array['assistant', 'complaint']));
