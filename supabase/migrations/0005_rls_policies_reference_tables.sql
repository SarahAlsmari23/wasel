create policy "public read access" on public.domains
  for select to anon, authenticated using (true);
create policy "public read access" on public.government_entities
  for select to anon, authenticated using (true);
create policy "public read access" on public.complaint_types
  for select to anon, authenticated using (true);
create policy "public read access" on public.government_services
  for select to anon, authenticated using (true);
create policy "public read access" on public.official_sources
  for select to anon, authenticated using (true);
-- knowledge_documents: no policy, intentionally. anon/authenticated remain locked out.
