'use client'

import { useState } from 'react'
import { ComplaintDraftPreview } from '@/components/complaints/complaint-draft-preview'
import { ComplaintStepper } from '@/components/complaints/complaint-stepper'
import { ComplaintTypeStep } from '@/components/complaints/steps/complaint-type-step'
import { ComplaintReviewStep } from '@/components/complaints/steps/complaint-review-step'
import { ContactDetailsStep } from '@/components/complaints/steps/contact-details-step'
import { ProblemDetailsStep } from '@/components/complaints/steps/problem-details-step'
import { generateComplaintDraft } from '@/lib/complaints/generate-draft'
import {
  MOCK_COMPLAINT_TYPES,
  MOCK_ENTITIES,
  MOCK_SERVICES,
} from '@/lib/mock/complaint-reference-data'
import {
  validateComplaintTypeStep,
  validateContactDetailsStep,
  validateProblemDetailsStep,
} from '@/lib/complaints/validation'
import type {
  ComplaintTypeStepValues,
  ContactDetailsStepValues,
  ProblemDetailsStepValues,
  ValidationErrors,
} from '@/types/complaint'

const INITIAL_TYPE: ComplaintTypeStepValues = {
  domainId: '',
  entityId: '',
  serviceId: '',
  complaintTypeId: '',
}

const INITIAL_PROBLEM: ProblemDetailsStepValues = {
  title: '',
  description: '',
  issueDate: '',
  city: '',
  referenceNumber: '',
}

const INITIAL_CONTACT: ContactDetailsStepValues = {
  fullName: '',
  nationalId: '',
  phone: '',
  email: '',
  preferredContactMethod: 'phone',
}

export function ComplaintBuilder() {
  const [currentStep, setCurrentStep] = useState(1)
  const [typeValues, setTypeValues] = useState(INITIAL_TYPE)
  const [problemValues, setProblemValues] = useState(INITIAL_PROBLEM)
  const [contactValues, setContactValues] = useState(INITIAL_CONTACT)
  const [typeErrors, setTypeErrors] = useState<ValidationErrors>({})
  const [problemErrors, setProblemErrors] = useState<ValidationErrors>({})
  const [contactErrors, setContactErrors] = useState<ValidationErrors>({})
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  function goToStep(step: number) {
    setCurrentStep(step)
  }

  function handleNext() {
    if (currentStep === 1) {
      const errors = validateComplaintTypeStep(typeValues)
      setTypeErrors(errors)
      if (Object.keys(errors).length > 0) return
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      const errors = validateProblemDetailsStep(problemValues)
      setProblemErrors(errors)
      if (Object.keys(errors).length > 0) return
      setCurrentStep(3)
      return
    }

    if (currentStep === 3) {
      const errors = validateContactDetailsStep(contactValues)
      setContactErrors(errors)
      if (Object.keys(errors).length > 0) return
      setCurrentStep(4)
    }
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  function handleGenerateDraft() {
    if (isGenerating) return

    const typeErr = validateComplaintTypeStep(typeValues)
    const problemErr = validateProblemDetailsStep(problemValues)
    const contactErr = validateContactDetailsStep(contactValues)
    setTypeErrors(typeErr)
    setProblemErrors(problemErr)
    setContactErrors(contactErr)

    if (
      Object.keys(typeErr).length > 0 ||
      Object.keys(problemErr).length > 0 ||
      Object.keys(contactErr).length > 0
    ) {
      return
    }

    setIsGenerating(true)
    try {
      const entityName =
        MOCK_ENTITIES.find((entity) => entity.id === typeValues.entityId)?.name ?? ''
      const serviceName =
        MOCK_SERVICES.find((service) => service.id === typeValues.serviceId)?.name ?? ''
      const categoryName =
        MOCK_COMPLAINT_TYPES.find((type) => type.id === typeValues.complaintTypeId)?.name ?? ''

      const draft = generateComplaintDraft(
        { type: typeValues, problem: problemValues, contact: contactValues },
        { entityName, serviceName, categoryName },
      )
      setGeneratedDraft(draft)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleStartNew() {
    setCurrentStep(1)
    setTypeValues(INITIAL_TYPE)
    setProblemValues(INITIAL_PROBLEM)
    setContactValues(INITIAL_CONTACT)
    setTypeErrors({})
    setProblemErrors({})
    setContactErrors({})
    setGeneratedDraft(null)
  }

  function handleEditDraft() {
    setGeneratedDraft(null)
    setCurrentStep(4)
  }

  if (generatedDraft) {
    return (
      <ComplaintDraftPreview
        draftText={generatedDraft}
        onEdit={handleEditDraft}
        onStartNew={handleStartNew}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ComplaintStepper currentStep={currentStep} onStepClick={goToStep} />

      {currentStep === 1 ? (
        <ComplaintTypeStep values={typeValues} errors={typeErrors} onChange={setTypeValues} />
      ) : null}
      {currentStep === 2 ? (
        <ProblemDetailsStep
          values={problemValues}
          errors={problemErrors}
          onChange={setProblemValues}
        />
      ) : null}
      {currentStep === 3 ? (
        <ContactDetailsStep
          values={contactValues}
          errors={contactErrors}
          onChange={setContactValues}
        />
      ) : null}
      {currentStep === 4 ? (
        <ComplaintReviewStep
          values={{ type: typeValues, problem: problemValues, contact: contactValues }}
          typeErrors={typeErrors}
          problemErrors={problemErrors}
          contactErrors={contactErrors}
          isGenerating={isGenerating}
          onEditStep={goToStep}
          onGenerateDraft={handleGenerateDraft}
        />
      ) : null}

      {currentStep < 4 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
          >
            السابق
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium"
          >
            التالي
          </button>
        </div>
      ) : null}
    </div>
  )
}
