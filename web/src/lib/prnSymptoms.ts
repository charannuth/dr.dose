import { isMedicationRouteId, type MedicationRouteId } from './medicationForms'
import { asStringArray } from './asStringArray'

export type MedForPrnSymptoms = {
  name: string
  medication_route?: string | null
  medication_form?: string | null
  dose_pills?: string | null
  prn_symptom_hints?: string[] | null
}

const RESPIRATORY_SYMPTOMS = [
  'Shortness of breath',
  'Wheezing',
  'Chest tightness',
  'Cough',
  'Trouble breathing',
] as const

const PAIN_SYMPTOMS = [
  'Pain',
  'Headache',
  'Inflammation',
  'Muscle aches',
  'Fever',
] as const

const ALLERGY_SYMPTOMS = [
  'Itching',
  'Hives',
  'Runny nose',
  'Sneezing',
  'Swelling',
  'Allergy flare',
] as const

const GI_SYMPTOMS = [
  'Nausea',
  'Vomiting',
  'Heartburn',
  'Stomach pain',
  'Diarrhea',
] as const

const ANXIETY_SYMPTOMS = [
  'Anxiety',
  'Panic',
  'Restlessness',
  'Sleep trouble',
] as const

const INJECTION_SYMPTOMS = [
  'Injection site pain',
  'Redness at site',
  'Low blood sugar',
  'Shakiness',
] as const

const DERMAL_SYMPTOMS = [
  'Rash',
  'Itching',
  'Dry skin',
  'Redness',
] as const

const GENERIC_PRN_SYMPTOMS = [
  'Pain',
  'Discomfort',
  'Fatigue',
  'Dizziness',
] as const

function nameMatches(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase()
  return patterns.some((p) => lower.includes(p))
}

function defaultSymptomsForMed(med: MedForPrnSymptoms): string[] {
  const route: MedicationRouteId | null =
    med.medication_route && isMedicationRouteId(med.medication_route)
      ? med.medication_route
      : null
  const form = med.medication_form ?? ''
  const name = med.name

  if (
    form.includes('spray') ||
    nameMatches(name, [
      'inhaler',
      'albuterol',
      'ventolin',
      'proair',
      'symbicort',
      'advair',
      'breo',
      'spiriva',
      'nebul',
      'puff',
    ])
  ) {
    return [...RESPIRATORY_SYMPTOMS]
  }

  if (
    nameMatches(name, [
      'ibuprofen',
      'advil',
      'motrin',
      'acetaminophen',
      'tylenol',
      'naproxen',
      'aleve',
      'aspirin',
      'meloxicam',
      'tramadol',
      'hydrocodone',
      'oxycodone',
    ])
  ) {
    return [...PAIN_SYMPTOMS]
  }

  if (
    nameMatches(name, [
      'benadryl',
      'diphenhydramine',
      'loratadine',
      'claritin',
      'cetirizine',
      'zyrtec',
      'epinephrine',
      'epipen',
      'allergy',
    ])
  ) {
    return [...ALLERGY_SYMPTOMS]
  }

  if (
    nameMatches(name, [
      'ondansetron',
      'zofran',
      'promethazine',
      'metoclopramide',
      'pepto',
      'antacid',
    ])
  ) {
    return [...GI_SYMPTOMS]
  }

  if (route === 'injection' || form.includes('pen') || form.includes('inject')) {
    return [...INJECTION_SYMPTOMS]
  }

  if (route === 'dermal' || form.includes('cream') || form.includes('patch')) {
    return [...DERMAL_SYMPTOMS]
  }

  if (nameMatches(name, ['xanax', 'alprazolam', 'ativan', 'lorazepam', 'anxiety'])) {
    return [...ANXIETY_SYMPTOMS]
  }

  if (route === 'oral') {
    return [...PAIN_SYMPTOMS, ...GI_SYMPTOMS.slice(0, 2)]
  }

  return [...GENERIC_PRN_SYMPTOMS]
}

/** Chip options for PRN logging — configured hints override inferred defaults. */
export function prnSymptomOptionsForMed(med: MedForPrnSymptoms): string[] {
  const configured = asStringArray(med.prn_symptom_hints)
  if (configured.length > 0) return configured

  return defaultSymptomsForMed(med)
}

export function prnSymptomLegend(med: MedForPrnSymptoms): string {
  const name = med.name.trim() || 'this medication'
  return `Symptoms related to ${name}`
}

export function prnSymptomHint(med: MedForPrnSymptoms): string {
  const configured = asStringArray(med.prn_symptom_hints).length > 0
  if (configured) {
    return 'Tap what you are feeling now, or add your own below.'
  }
  return 'Suggested for this medication — tap any that apply, or add your own.'
}

export function prnAmountPlaceholder(med: MedForPrnSymptoms): string {
  const example = med.dose_pills?.trim()
  if (example && example !== 'Varies') {
    return `e.g. ${example}`
  }
  const form = med.medication_form ?? ''
  if (form.includes('spray') || med.name.toLowerCase().includes('inhal')) {
    return 'e.g. 2 puffs'
  }
  if (form.includes('patch')) return 'e.g. 1 patch'
  if (form.includes('cream') || form.includes('ointment')) {
    return 'e.g. thin layer, pea-sized amount'
  }
  return 'e.g. 1 tablet, 10 units, 0.5 mL'
}
