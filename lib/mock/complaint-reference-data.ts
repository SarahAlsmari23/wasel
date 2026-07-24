export type MockDomain = { id: string; name: string }
export type MockEntity = { id: string; name: string; domainId: string }
export type MockService = { id: string; name: string; entityId: string }
export type MockComplaintType = { id: string; name: string; domainId: string }

export const MOCK_DOMAINS: MockDomain[] = [
  { id: 'municipality', name: 'البلديات' },
  { id: 'water', name: 'المياه' },
  { id: 'telecom', name: 'الاتصالات' },
  { id: 'electricity', name: 'الكهرباء' },
]

export const MOCK_ENTITIES: MockEntity[] = [
  { id: 'balady', name: 'وزارة البلديات والإسكان', domainId: 'municipality' },
  { id: 'nwc', name: 'الشركة الوطنية للمياه', domainId: 'water' },
  { id: 'cst', name: 'هيئة الاتصالات والفضاء والتقنية', domainId: 'telecom' },
  { id: 'sec', name: 'الشركة السعودية للكهرباء', domainId: 'electricity' },
]

export const MOCK_SERVICES: MockService[] = [
  { id: 'municipal-maintenance', name: 'صيانة الطرق والإنارة', entityId: 'balady' },
  { id: 'water-billing', name: 'فوترة المياه', entityId: 'nwc' },
  { id: 'telecom-coverage', name: 'تغطية الشبكة', entityId: 'cst' },
  { id: 'electricity-outage', name: 'انقطاع التيار الكهربائي', entityId: 'sec' },
]

export const MOCK_COMPLAINT_TYPES: MockComplaintType[] = [
  { id: 'delay', name: 'تأخر في تقديم الخدمة', domainId: 'municipality' },
  { id: 'billing-dispute', name: 'اعتراض على فاتورة', domainId: 'water' },
  { id: 'coverage-issue', name: 'ضعف التغطية', domainId: 'telecom' },
  { id: 'outage', name: 'انقطاع الخدمة', domainId: 'electricity' },
]

export function getEntitiesByDomain(domainId: string): MockEntity[] {
  return MOCK_ENTITIES.filter((entity) => entity.domainId === domainId)
}

export function getServicesByEntity(entityId: string): MockService[] {
  return MOCK_SERVICES.filter((service) => service.entityId === entityId)
}

export function getComplaintTypesByDomain(domainId: string): MockComplaintType[] {
  return MOCK_COMPLAINT_TYPES.filter((type) => type.domainId === domainId)
}
