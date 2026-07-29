-- Reference data only: domains, government_entities.
-- No user, auth, complaint, conversation, message, or log data.

insert into public.domains (id, code, name_ar, description_ar, is_active)
values
  ('81d2b443-ee40-4e97-a26f-17fd93c0e57a', 'commerce', 'التجارة وحماية المستهلك', 'بلاغات المتاجر والمنتجات والتجارة الإلكترونية', true),
  ('93828853-f6f1-43ba-93d8-90befecd26c4', 'electricity', 'الكهرباء', 'بلاغات الكهرباء والانقطاعات والعدادات والفواتير', true),
  ('8866a76e-a911-4547-bb6c-7b5f5ac158e4', 'municipality', 'البلديات', 'بلاغات الطرق والإنارة والنظافة والمرافق العامة', true),
  ('04e0e5f3-e9ec-4187-91f9-a93152bd6b8f', 'telecom', 'الاتصالات', 'بلاغات الإنترنت والاتصالات والتغطية والفواتير', true),
  ('e33245ef-2624-4ce8-9df5-0c1f5fd0928a', 'water', 'المياه', 'بلاغات المياه والصرف الصحي والفواتير', true)
on conflict (code) do nothing;

insert into public.government_entities (id, code, name_ar, entity_type, description_ar, official_website, is_active)
values
  ('7f5cdd31-d0d1-4a07-b5b7-2cf77d418d56', 'balady', 'وزارة البلديات والإسكان', 'government', 'الجهة المسؤولة عن خدمات البلديات والطرق والمرافق العامة', 'https://balady.gov.sa', true),
  ('e1e736fb-8811-42dc-9dea-da85cafa05d2', 'cst', 'هيئة الاتصالات والفضاء والتقنية', 'government', 'الجهة المنظمة لقطاع الاتصالات والإنترنت', 'https://www.cst.gov.sa', true),
  ('572034ea-1d6f-4a79-85c5-943c8f7d3fa7', 'mc', 'وزارة التجارة', 'government', 'الجهة المسؤولة عن حماية المستهلك والخدمات التجارية', 'https://mc.gov.sa', true),
  ('9e58657a-7fc5-4691-b1ba-18271f6710a5', 'nwc', 'الشركة الوطنية للمياه', 'government', 'الجهة المسؤولة عن خدمات المياه والصرف الصحي', 'https://www.nwc.com.sa', true),
  ('80f3ba09-fb53-4b1f-acd0-054a8180257e', 'sec', 'السعودية للطاقة', 'government', 'الجهة المسؤولة عن خدمات الكهرباء', 'https://www.se.com.sa', true)
on conflict (code) do nothing;

-- === RAG source enrichment: complaint_types (general, one per domain) =====
-- government_services.complaint_type_id is NOT NULL with no default, so a
-- broad "general" complaint type per domain must exist before the services
-- below can be inserted. Reuses each domain's own id; code/name_ar/
-- description_ar are broad category labels, not specific procedures.
-- complaint_types.code has a real UNIQUE constraint, so `on conflict (code)
-- do nothing` matches the table's actual schema (same pattern as domains).

insert into public.complaint_types (id, domain_id, code, name_ar, description_ar)
values
  ('d1e2f3a4-b5c6-4708-9192-a3b4c5d6e7f8', '81d2b443-ee40-4e97-a26f-17fd93c0e57a', 'commerce_general', 'شكاوى التجارة وحماية المستهلك', 'شكاوى المتاجر والمنتجات والتجارة الإلكترونية'),
  ('e2f3a4b5-c6d7-4819-a2a3-b4c5d6e7f809', '04e0e5f3-e9ec-4187-91f9-a93152bd6b8f', 'telecom_general', 'شكاوى الاتصالات والإنترنت', 'شكاوى التغطية والاتصالات والإنترنت والفواتير'),
  ('f3a4b5c6-d7e8-492a-b3b4-c5d6e7f8091a', '8866a76e-a911-4547-bb6c-7b5f5ac158e4', 'municipality_general', 'شكاوى الخدمات البلدية', 'شكاوى الطرق والإنارة والنظافة والمرافق العامة'),
  ('a4b5c6d7-e8f9-4a3b-c4c5-d6e7f8091a2b', 'e33245ef-2624-4ce8-9df5-0c1f5fd0928a', 'water_general', 'شكاوى المياه والصرف الصحي', 'شكاوى المياه والصرف الصحي والفواتير'),
  ('b5c6d7e8-f9a0-4b4c-d5d6-e7f8091a2b3c', '93828853-f6f1-43ba-93d8-90befecd26c4', 'electricity_general', 'شكاوى الكهرباء', 'شكاوى الانقطاعات والعدادات والفواتير')
on conflict (code) do nothing;

-- === RAG source enrichment: government_services ===========================
-- One broad, factual service category per entity. name_ar/description_ar
-- are broad category labels, not specific procedures. description_ar is
-- reused verbatim from the domains rows above; official_url is reused
-- verbatim from the entity's own official_website above. complaint_type_id
-- references the general complaint type for the same domain, inserted
-- above. Fixed ids + `on conflict (id) do nothing` for idempotency — this
-- table has no natural unique business key like domains.code.

insert into public.government_services (id, entity_id, complaint_type_id, name_ar, description_ar, official_url, is_active)
values
  ('3a1b2c3d-4e5f-4061-8a2b-3c4d5e6f7081', '572034ea-1d6f-4a79-85c5-943c8f7d3fa7', 'd1e2f3a4-b5c6-4708-9192-a3b4c5d6e7f8', 'خدمات حماية المستهلك والتجارة', 'بلاغات المتاجر والمنتجات والتجارة الإلكترونية', 'https://mc.gov.sa', true),
  ('4b2c3d4e-5f60-4172-9b3c-4d5e6f708192', 'e1e736fb-8811-42dc-9dea-da85cafa05d2', 'e2f3a4b5-c6d7-4819-a2a3-b4c5d6e7f809', 'خدمات تنظيم الاتصالات وجودة الخدمة', 'بلاغات الإنترنت والاتصالات والتغطية والفواتير', 'https://www.cst.gov.sa', true),
  ('5c3d4e5f-6071-4283-ac4d-5e6f708192a3', '7f5cdd31-d0d1-4a07-b5b7-2cf77d418d56', 'f3a4b5c6-d7e8-492a-b3b4-c5d6e7f8091a', 'الخدمات البلدية العامة', 'بلاغات الطرق والإنارة والنظافة والمرافق العامة', 'https://balady.gov.sa', true),
  ('6d4e5f60-7182-4394-bd5e-6f708192a3b4', '9e58657a-7fc5-4691-b1ba-18271f6710a5', 'a4b5c6d7-e8f9-4a3b-c4c5-d6e7f8091a2b', 'خدمات المياه والصرف الصحي', 'بلاغات المياه والصرف الصحي والفواتير', 'https://www.nwc.com.sa', true),
  ('7e5f6071-8293-44a5-ce6f-708192a3b4c5', '80f3ba09-fb53-4b1f-acd0-054a8180257e', 'b5c6d7e8-f9a0-4b4c-d5d6-e7f8091a2b3c', 'خدمات الكهرباء', 'بلاغات الكهرباء والانقطاعات والعدادات والفواتير', 'https://www.se.com.sa', true)
on conflict (id) do nothing;

-- === RAG source enrichment: official_sources ===============================
-- source_url/source_name reused verbatim from the same already-reviewed
-- entity data above. verification_status is 'verified' because this is the
-- exact same official website URL already reviewed and seeded on
-- government_entities, not a newly-sourced claim.

insert into public.official_sources (id, service_id, entity_id, source_name, source_url, source_type, verification_status)
values
  ('8f607182-93a4-45b6-8f70-8192a3b4c5d6', '3a1b2c3d-4e5f-4061-8a2b-3c4d5e6f7081', '572034ea-1d6f-4a79-85c5-943c8f7d3fa7', 'وزارة التجارة', 'https://mc.gov.sa', 'official_webpage', 'verified'),
  ('90718293-a4b5-4607-9081-92a3b4c5d6e7', '4b2c3d4e-5f60-4172-9b3c-4d5e6f708192', 'e1e736fb-8811-42dc-9dea-da85cafa05d2', 'هيئة الاتصالات والفضاء والتقنية', 'https://www.cst.gov.sa', 'official_webpage', 'verified'),
  ('a1829304-b5c6-4718-a192-a3b4c5d6e7f8', '5c3d4e5f-6071-4283-ac4d-5e6f708192a3', '7f5cdd31-d0d1-4a07-b5b7-2cf77d418d56', 'وزارة البلديات والإسكان', 'https://balady.gov.sa', 'official_webpage', 'verified'),
  ('b2930415-c6d7-4829-b2a3-b4c5d6e7f809', '6d4e5f60-7182-4394-bd5e-6f708192a3b4', '9e58657a-7fc5-4691-b1ba-18271f6710a5', 'الشركة الوطنية للمياه', 'https://www.nwc.com.sa', 'official_webpage', 'verified'),
  ('c3041526-d7e8-493a-c3b4-c5d6e7f8091a', '7e5f6071-8293-44a5-ce6f-708192a3b4c5', '80f3ba09-fb53-4b1f-acd0-054a8180257e', 'السعودية للطاقة', 'https://www.se.com.sa', 'official_webpage', 'verified')
on conflict (id) do nothing;

-- === RAG source enrichment: link the 10 existing knowledge_documents rows ==
-- Idempotent by nature — re-running sets the same value again. Depends on
-- the government_services insert above having already run in this file.

update public.knowledge_documents set service_id = '3a1b2c3d-4e5f-4061-8a2b-3c4d5e6f7081'
  where id in ('90215d19-77e6-43a7-9807-0bee6e291e83', 'ec0625c2-6b78-4086-b3db-08e23359eabb'); -- وزارة التجارة (2 entries)
update public.knowledge_documents set service_id = '4b2c3d4e-5f60-4172-9b3c-4d5e6f708192'
  where id in ('0f9ab2c3-cad5-49ef-9624-a638bc390a8a', '7d46f5d8-196b-46a9-89ef-c018653d1eaf'); -- هيئة الاتصالات والفضاء والتقنية (2 entries)
update public.knowledge_documents set service_id = '5c3d4e5f-6071-4283-ac4d-5e6f708192a3'
  where id in ('1d3cfefe-4677-423c-8937-cf5028b0d959', 'cdf4adb7-b9fb-4478-9ddb-b292ba14532e'); -- وزارة البلديات والإسكان (2 entries)
update public.knowledge_documents set service_id = '6d4e5f60-7182-4394-bd5e-6f708192a3b4'
  where id in ('052dba13-61e9-49a6-bf7c-105cd4dce495', '95971720-2cdc-419e-9d65-7362c6d06e8f'); -- الشركة الوطنية للمياه (2 entries)
update public.knowledge_documents set service_id = '7e5f6071-8293-44a5-ce6f-708192a3b4c5'
  where id in ('13713daa-c965-488e-a931-bc43e24a1d3c', '020a5f0e-8b16-4aef-8bd0-4a52fb39d360'); -- السعودية للطاقة (2 entries)
