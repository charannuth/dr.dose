import {
  getFormLabel,
  type MedicationRouteId,
} from './medicationForms'
import type { MedicationScheduleType } from './medicationSchedule'
import { asStringArray } from './asStringArray'

export type InjectionLogStyle = 'simple' | 'measured'

export type DosageWizardValues = {
  route: MedicationRouteId | null
  form: string
  scheduleType: MedicationScheduleType
  oralCount: string
  doseMg: string
  injectionStyle: InjectionLogStyle
  injectionAmount: string
  injectionUnit: string
  dermalDescription: string
  otherDescription: string
  maxDosesPerDay: string
  prnTypicalAmount: string
  prnHintInput: string
  prnAmountHints: string[]
  prnSymptomHintInput: string
  prnSymptomHints: string[]
}

export function dosageStepTitle(
  route: MedicationRouteId | null,
  scheduleType: MedicationScheduleType,
): string {
  if (scheduleType === 'as_needed') return 'Max doses'
  switch (route) {
    case 'oral':
      return 'How many per dose?'
    case 'dermal':
      return 'Application'
    case 'injection':
      return 'Injection dose'
    case 'other':
      return 'Amount per dose'
    default:
      return 'Amount per dose'
  }
}

export function dosageStepHint(
  route: MedicationRouteId | null,
  scheduleType: MedicationScheduleType,
): string {
  if (scheduleType === 'as_needed') {
    return 'Set a daily maximum if you want a cap. Add typical amounts you take — you will pick or type the amount each time you log.'
  }
  switch (route) {
    case 'oral':
      return 'How many you take each scheduled time. Strength in mg is optional.'
    case 'dermal':
      return 'Creams and patches usually do not have a pill count. Describe how you apply it, or leave blank.'
    case 'injection':
      return 'Choose whether you log a simple injection or a specific measured dose (units, mg, mL).'
    case 'other':
      return 'Describe the amount you take each time.'
    default:
      return 'Enter how much you take per dose.'
  }
}

export function defaultInjectionStyle(formId: string): InjectionLogStyle {
  if (
    formId === 'prefilled-pen' ||
    formId === 'infusion' ||
    formId === 'intravenous'
  ) {
    return 'measured'
  }
  return 'simple'
}

export function parseOralCount(dosePills: string | null | undefined): string {
  const trimmed = dosePills?.trim() ?? ''
  const match = trimmed.match(/^(\d+(?:\.\d+)?)/)
  return match ? match[1] : '1'
}

export function parseInjectionFromMed(
  dosePills: string | null | undefined,
  doseMg: string | null | undefined,
  formId: string,
): Pick<DosageWizardValues, 'injectionStyle' | 'injectionAmount' | 'injectionUnit'> {
  const mg = doseMg?.trim() ?? ''
  const pills = dosePills?.trim() ?? ''
  if (mg) {
    const unitMatch = mg.match(/^([\d.]+)\s*(units?|iu|mg|ml|mL)?/i)
    return {
      injectionStyle: 'measured',
      injectionAmount: unitMatch?.[1] ?? '',
      injectionUnit: unitMatch?.[2]?.toLowerCase() === 'iu' ? 'units' : unitMatch?.[2] ?? 'units',
    }
  }
  if (pills && !/^1\s+injection/i.test(pills)) {
    return {
      injectionStyle: 'measured',
      injectionAmount: parseOralCount(pills),
      injectionUnit: 'dose',
    }
  }
  return {
    injectionStyle: defaultInjectionStyle(formId),
    injectionAmount: '',
    injectionUnit: 'units',
  }
}

function pluralizeUnit(count: string, singular: string): string {
  const n = parseFloat(count)
  if (n === 1) return singular
  return singular.endsWith('s') ? singular : `${singular}s`
}

export function buildOralDosePillsFixed(count: string, formId: string, route: MedicationRouteId): string {
  const n = count.trim() || '1'
  const formLabel = getFormLabel(route, formId) ?? 'dose'
  const lower = formLabel.toLowerCase()
  const singular =
    lower.includes('liquid') || lower.includes('syrup') || lower.includes('suspension')
      ? 'dose'
      : lower.includes('capsule')
        ? 'capsule'
        : lower.includes('tablet')
          ? 'tablet'
          : lower.includes('chewable')
            ? 'chewable'
            : lower.includes('lozenge')
              ? 'lozenge'
              : lower.includes('spray')
                ? 'spray'
                : lower.includes('powder')
                  ? 'dose'
                  : 'pill'
  return `${n} ${pluralizeUnit(n, singular)}`
}

export function validateDosageWizard(values: DosageWizardValues): string | null {
  const { route, scheduleType } = values

  if (scheduleType === 'as_needed') {
    const max = values.maxDosesPerDay.trim()
    if (max) {
      const n = parseInt(max, 10)
      if (Number.isNaN(n) || n < 1 || n > 99) {
        return 'Max doses per day must be between 1 and 99.'
      }
    }
    return null
  }

  if (!route) return 'Choose how you take this medication first.'

  switch (route) {
    case 'oral': {
      const count = values.oralCount.trim()
      if (!count) return 'Enter how many you take.'
      const n = parseFloat(count)
      if (!Number.isFinite(n) || n <= 0) return 'Enter a valid number.'
      return null
    }
    case 'dermal':
      return null
    case 'injection':
      if (values.injectionStyle === 'measured') {
        if (!values.injectionAmount.trim()) return 'Enter the dose amount.'
        return null
      }
      return null
    case 'other':
      if (!values.otherDescription.trim() && !values.doseMg.trim()) {
        return 'Describe the amount or enter mg.'
      }
      return null
    default:
      return null
  }
}

export function buildDoseFieldsFromWizard(values: DosageWizardValues): {
  dose_pills: string
  dose_mg: string
  max_doses_per_day: number | null
  prn_amount_hints: string[]
  prn_symptom_hints: string[]
} {
  if (values.scheduleType === 'as_needed') {
    const hints = [...values.prnAmountHints]
    const typical = values.prnTypicalAmount.trim()
    if (typical && !hints.includes(typical)) hints.unshift(typical)
    const maxRaw = values.maxDosesPerDay.trim()
    const max_doses_per_day = maxRaw ? parseInt(maxRaw, 10) : null
    return {
      dose_pills: typical || hints[0] || 'Varies',
      dose_mg: values.doseMg.trim(),
      max_doses_per_day,
      prn_amount_hints: hints,
      prn_symptom_hints: values.prnSymptomHints,
    }
  }

  const route = values.route!
  const form = values.form

  switch (route) {
    case 'oral':
      return {
        dose_pills: buildOralDosePillsFixed(values.oralCount, form, route),
        dose_mg: values.doseMg.trim(),
        max_doses_per_day: null,
        prn_amount_hints: [],
        prn_symptom_hints: [],
      }
    case 'dermal': {
      const desc = values.dermalDescription.trim()
      return {
        dose_pills: desc || 'Apply to skin',
        dose_mg: values.doseMg.trim(),
        max_doses_per_day: null,
        prn_amount_hints: [],
        prn_symptom_hints: [],
      }
    }
    case 'injection':
      if (values.injectionStyle === 'simple') {
        return {
          dose_pills: '1 injection',
          dose_mg: values.doseMg.trim(),
          max_doses_per_day: null,
          prn_amount_hints: [],
          prn_symptom_hints: [],
        }
      }
      return {
        dose_pills: `${values.injectionAmount.trim()} ${values.injectionUnit}`,
        dose_mg: values.doseMg.trim(),
        max_doses_per_day: null,
        prn_amount_hints: [],
        prn_symptom_hints: [],
      }
    case 'other':
    default:
      return {
        dose_pills: values.otherDescription.trim(),
        dose_mg: values.doseMg.trim(),
        max_doses_per_day: null,
        prn_amount_hints: [],
        prn_symptom_hints: [],
      }
  }
}

export function ensureDoseConstraint(fields: {
  dose_pills: string
  dose_mg: string
  schedule_type: MedicationScheduleType
  max_doses_per_day: number | null
}): void {
  const pills = fields.dose_pills.trim()
  const mg = fields.dose_mg.trim()
  if (pills || mg) return
  if (fields.schedule_type === 'as_needed' && fields.max_doses_per_day != null) return
  throw new Error('Enter dose information.')
}

export function prnAmountOptions(med: {
  dose_pills: string | null
  prn_amount_hints?: string[] | null
}): string[] {
  const hints = asStringArray(med.prn_amount_hints).filter((h) => h !== 'Other…')
  if (hints.length > 0) return [...hints, 'Other…']
  const typical = med.dose_pills?.trim()
  if (typical && typical !== 'Varies') return [typical, '1 dose', 'Other…']
  return ['1 dose', '2 doses', 'Other…']
}

export function formatPrnSlotLabel(
  scheduleTime: string,
  loggedAmount: string | null | undefined,
  formatTime: (t: string) => string,
): string {
  const time = formatTime(scheduleTime)
  const amount = loggedAmount?.trim()
  return amount ? `Taken ${time} · ${amount}` : `Taken ${time}`
}
