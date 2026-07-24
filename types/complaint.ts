export type ComplaintStatus = 'draft' | 'ready' | 'completed'

export type PreferredContactMethod = 'phone' | 'email'

export type MockComplaint = {
  id: string
  title: string
  entityName: string
  categoryName: string
  status: ComplaintStatus
  updatedAt: string
  referenceNumber: string
  description: string
  city: string
  issueDate: string
  contactFullName: string
  draftText: string
  timeline: { label: string; at: string }[]
}

export type ComplaintTypeStepValues = {
  domainId: string
  entityId: string
  serviceId: string
  complaintTypeId: string
}

export type ProblemDetailsStepValues = {
  title: string
  description: string
  issueDate: string
  city: string
  referenceNumber: string
}

export type ContactDetailsStepValues = {
  fullName: string
  nationalId: string
  phone: string
  email: string
  preferredContactMethod: PreferredContactMethod
}

export type ComplaintDraftFormValues = {
  type: ComplaintTypeStepValues
  problem: ProblemDetailsStepValues
  contact: ContactDetailsStepValues
}

export type ValidationErrors = Record<string, string>
