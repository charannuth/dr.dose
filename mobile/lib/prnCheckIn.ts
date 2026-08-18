import { asStringArray } from './asStringArray'

export type PrnDoseLogPayload = {
  amount: string
  symptoms: string[]
  reason: string
  notes: string
}

export function emptyPrnDoseLogPayload(): PrnDoseLogPayload {
  return {
    amount: '',
    symptoms: [],
    reason: '',
    notes: '',
  }
}

export function isPrnLogReady(payload: PrnDoseLogPayload): boolean {
  return Boolean(payload.amount.trim())
}

export function usesOralPrnAmountDropdown(
  route: string | null | undefined,
): boolean {
  return route === 'oral'
}

export const ORAL_PRN_AMOUNT_PRESETS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
] as const

export type OralPrnAmountPick =
  | ''
  | (typeof ORAL_PRN_AMOUNT_PRESETS)[number]
  | 'custom'

export function formatPrnDoseSummary(log: {
  logged_amount: string | null
  prn_symptoms?: string[] | null | unknown
  prn_reason?: string | null
}): string {
  const parts: string[] = []
  const amount = log.logged_amount?.trim()
  if (amount) parts.push(amount)
  if (log.prn_reason?.trim()) parts.push(log.prn_reason.trim())
  const symptoms = asStringArray(log.prn_symptoms)
  if (symptoms.length > 0) {
    const shown = symptoms.slice(0, 2).join(', ')
    parts.push(symptoms.length > 2 ? `${shown}…` : shown)
  }
  return parts.join(' · ')
}
