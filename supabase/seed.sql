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
  ('80f3ba09-fb53-4b1f-acd0-054a8180257e', 'sec', 'الشركة السعودية للكهرباء', 'government', 'الجهة المسؤولة عن خدمات الكهرباء', 'https://www.se.com.sa', true)
on conflict (code) do nothing;
