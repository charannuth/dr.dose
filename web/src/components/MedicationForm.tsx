import { useState, type FormEvent } from 'react'
import {
  normalizeScheduleTimes,
  scheduleTimeToTwelveHour,
  todayLocalDate,
  twelveHourToScheduleTime,
  type Meridiem,
} from '../lib/dates'
import { normalizeTime12Display } from '../lib/doseTimeInput'
import { DoseTimeInput } from './DoseTimeInput'
import { IsoDateInput } from './IsoDateInput'
import { getErrorMessage } from '../lib/errors'
import {
  isMedicationRouteId,
  MEDICATION_FORMS_BY_ROUTE,
  MEDICATION_ROUTES,
  type MedicationRouteId,
} from '../lib/medicationForms'
import {
  getDoseDeductionAmount,
  inventoryUnitLabel,
} from '../lib/inventory'
import { validateMedicationDates } from '../lib/medicationDates'
import type { MedicationScheduleType } from '../lib/medicationSchedule'
import type { MedicationSuggestion } from '../lib/medicationSuggestions'
import {
  canUseNotifications,
  requestNotificationPermission,
} from '../lib/notifications'
import { getReminders, setReminders } from '../lib/settings'
import {
  buildDoseFieldsFromWizard,
  dosageStepTitle,
  defaultInjectionStyle,
  parseInjectionFromMed,
  parseOralCount,
  validateDosageWizard,
  type DosageWizardValues,
} from '../lib/doseByRoute'
import type { Medication, MedicationInput, MedicationTrackingSync } from '../lib/types'
import { DosageStepPanel } from './DosageStepPanel'
import { MedicationNameInput } from './MedicationNameInput'
import { MedicationSafetyPanel } from './MedicationSafetyPanel'

type MedicationFormProps = {
  initial?: Medication | null
  existingMedicationNames?: string[]
  defaultScheduleType?: MedicationScheduleType
  onSave: (input: MedicationInput) => Promise<void>
  onCancel: () => void
}

const BASE_STEPS = [
  'name',
  'route',
  'form',
  'dates',
  'frequency',
  'dosage',
] as const

const TAIL_SCHEDULED = ['times', 'notes', 'tracking', 'notifications', 'safety'] as const
const TAIL_AS_NEEDED = ['notes', 'tracking', 'safety'] as const

type WizardStep =
  | (typeof BASE_STEPS)[number]
  | (typeof TAIL_SCHEDULED)[number]
  | (typeof TAIL_AS_NEEDED)[number]

function wizardStepsFor(scheduleType: MedicationScheduleType): WizardStep[] {
  if (scheduleType === 'as_needed') {
    return [...BASE_STEPS, ...TAIL_AS_NEEDED]
  }
  return [...BASE_STEPS, ...TAIL_SCHEDULED]
}

const STEP_TITLES: Record<WizardStep, string> = {
  name: 'Medication name',
  route: 'How do you take it?',
  form: 'What type is it?',
  dates: 'Schedule dates',
  frequency: 'How often?',
  dosage: 'Dose amount',
  times: 'Dose times',
  notes: 'Notes',
  tracking: 'Refill tracking',
  notifications: 'Reminders',
  safety: 'Safety review',
}

type DoseTimeRow = {
  id: string
  time12: string
  period: Meridiem
}

function newDoseTimeRow(time24?: string): DoseTimeRow {
  const base = time24
    ? scheduleTimeToTwelveHour(time24)
    : { time12: '8:00', period: 'AM' as Meridiem }
  return {
    id: crypto.randomUUID(),
    time12: base.time12,
    period: base.period,
  }
}

function buildDoseTimes(initial?: Medication | null): DoseTimeRow[] {
  const times = normalizeScheduleTimes(initial?.schedule_times ?? [])
  if (times.length > 0) {
    return times.map((t) => newDoseTimeRow(t))
  }
  return [newDoseTimeRow()]
}

function buildDosageWizardState(
  initial: Medication | null | undefined,
  route: MedicationRouteId | null,
  scheduleType: MedicationScheduleType,
): DosageWizardValues {
  const form = initial?.medication_form ?? ''
  const base: DosageWizardValues = {
    route,
    form,
    scheduleType,
    oralCount: '1',
    doseMg: initial?.dose_mg ?? '',
    injectionStyle: defaultInjectionStyle(form),
    injectionAmount: '',
    injectionUnit: 'units',
    dermalDescription: '',
    otherDescription: '',
    maxDosesPerDay:
      initial?.max_doses_per_day != null ? String(initial.max_doses_per_day) : '',
    prnTypicalAmount: '',
    prnHintInput: '',
    prnAmountHints: [...(initial?.prn_amount_hints ?? [])],
    prnSymptomHintInput: '',
    prnSymptomHints: [...(initial?.prn_symptom_hints ?? [])],
  }

  if (!initial) return base

  if (scheduleType === 'as_needed') {
    const hints = [...(initial.prn_amount_hints ?? [])]
    let typical = initial.dose_pills?.trim() ?? ''
    if (typical === 'Varies') typical = ''
    if (typical && hints.includes(typical)) {
      return { ...base, prnTypicalAmount: typical, prnAmountHints: hints.filter((h) => h !== typical) }
    }
    if (typical && !hints.includes(typical)) {
      return { ...base, prnTypicalAmount: typical, prnAmountHints: hints }
    }
    return { ...base, prnAmountHints: hints }
  }

  const medRoute =
    route ??
    (initial.medication_route && isMedicationRouteId(initial.medication_route)
      ? initial.medication_route
      : null)

  if (medRoute === 'oral') {
    return {
      ...base,
      route: medRoute,
      oralCount: parseOralCount(initial.dose_pills),
    }
  }
  if (medRoute === 'dermal') {
    const desc = initial.dose_pills?.trim() ?? ''
    return {
      ...base,
      route: medRoute,
      dermalDescription: desc === 'Apply to skin' ? '' : desc,
    }
  }
  if (medRoute === 'injection') {
    const inj = parseInjectionFromMed(initial.dose_pills, initial.dose_mg, form)
    return { ...base, route: medRoute, ...inj, doseMg: initial.dose_mg ?? '' }
  }
  return {
    ...base,
    route: medRoute,
    otherDescription: initial.dose_pills?.trim() ?? '',
  }
}

function buildFormState(
  initial?: Medication | null,
  defaultScheduleType: MedicationScheduleType = 'scheduled',
) {
  const route =
    initial?.medication_route && isMedicationRouteId(initial.medication_route)
      ? initial.medication_route
      : null
  const scheduleType: MedicationScheduleType =
    initial?.schedule_type === 'as_needed' ? 'as_needed' : defaultScheduleType

  if (initial) {
    return {
      name: initial.name,
      route,
      form: initial.medication_form ?? '',
      scheduleType,
      doseTimes: buildDoseTimes(initial),
      notes: initial.notes ?? '',
      trackPills: initial.pills_remaining != null,
      pillsRemaining:
        initial.pills_remaining != null ? String(initial.pills_remaining) : '',
      startDate: initial.start_date ?? todayLocalDate(),
      hasEndDate: Boolean(initial.end_date),
      endDate: initial.end_date ?? '',
      remindersOn: getReminders().enabled,
      trackingSync:
        initial.tracking_sync === 'hrt' ? ('hrt' as MedicationTrackingSync) : 'none',
    }
  }

  return {
    name: '',
    route: null as MedicationRouteId | null,
    form: '',
    scheduleType,
    doseTimes: buildDoseTimes(),
    notes: '',
    trackPills: false,
    pillsRemaining: '',
    startDate: todayLocalDate(),
    hasEndDate: false,
    endDate: '',
    remindersOn: getReminders().enabled,
    trackingSync: 'none' as MedicationTrackingSync,
  }
}

export function MedicationForm({
  initial,
  existingMedicationNames = [],
  defaultScheduleType = 'scheduled',
  onSave,
  onCancel,
}: MedicationFormProps) {
  const defaults = buildFormState(initial, defaultScheduleType)
  const [stepIndex, setStepIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward')

  const [name, setName] = useState(defaults.name)
  const [route, setRoute] = useState<MedicationRouteId | null>(defaults.route)
  const [form, setForm] = useState(defaults.form)
  const [scheduleType, setScheduleType] = useState<MedicationScheduleType>(
    defaults.scheduleType,
  )
  const [dosageWizard, setDosageWizard] = useState<DosageWizardValues>(() =>
    buildDosageWizardState(initial, defaults.route, defaults.scheduleType),
  )
  const [doseTimes, setDoseTimes] = useState(defaults.doseTimes)
  const [notes, setNotes] = useState(defaults.notes)
  const [trackPills, setTrackPills] = useState(defaults.trackPills)
  const [pillsRemaining, setPillsRemaining] = useState(defaults.pillsRemaining)
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [hasEndDate, setHasEndDate] = useState(defaults.hasEndDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [remindersOn, setRemindersOn] = useState(defaults.remindersOn)
  const [trackingSync, setTrackingSync] = useState<MedicationTrackingSync>(
    defaults.trackingSync,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const wizardSteps = wizardStepsFor(scheduleType)
  const step = wizardSteps[stepIndex] ?? wizardSteps[0]
  const isLastStep = stepIndex === wizardSteps.length - 1
  const isOtherRoute = route === 'other'
  const formOptions =
    route && !isOtherRoute ? MEDICATION_FORMS_BY_ROUTE[route] : []

  function stepLabel(wizardStep: WizardStep): string {
    if (wizardStep === 'form' && isOtherRoute) {
      return 'Describe how you take it'
    }
    if (wizardStep === 'dosage') {
      return dosageStepTitle(route, scheduleType)
    }
    return STEP_TITLES[wizardStep]
  }

  function patchDosage(patch: Partial<DosageWizardValues>) {
    setDosageWizard((prev) => ({
      ...prev,
      ...patch,
      route,
      form,
      scheduleType,
    }))
  }

  function updateDoseTime(id: string, patch: Partial<Pick<DoseTimeRow, 'time12' | 'period'>>) {
    setDoseTimes((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  function addDoseTime() {
    setDoseTimes((rows) => [...rows, newDoseTimeRow()])
  }

  function removeDoseTime(id: string) {
    setDoseTimes((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }

  function applySuggestion(suggestion: MedicationSuggestion) {
    if (scheduleType === 'as_needed') {
      if (!dosageWizard.prnTypicalAmount.trim() && suggestion.dosePills) {
        patchDosage({ prnTypicalAmount: suggestion.dosePills })
      }
    } else if (route === 'oral' && !dosageWizard.oralCount.trim() && suggestion.dosePills) {
      patchDosage({ oralCount: parseOralCount(suggestion.dosePills) })
    }
    if (!dosageWizard.doseMg.trim() && suggestion.doseMg) {
      patchDosage({ doseMg: suggestion.doseMg })
    }
  }

  function selectScheduleType(next: MedicationScheduleType) {
    setScheduleType(next)
    setError(null)
    setDosageWizard(buildDosageWizardState(initial, route, next))
    const maxIndex = wizardStepsFor(next).length - 1
    if (stepIndex > maxIndex) setStepIndex(maxIndex)
  }

  function selectRoute(next: MedicationRouteId) {
    setRoute(next)
    setForm('')
    setError(null)
    setDosageWizard(buildDosageWizardState(initial, next, scheduleType))
  }

  function selectFormType(formId: string) {
    setForm(formId)
    setError(null)
    patchDosage({
      injectionStyle: defaultInjectionStyle(formId),
    })
  }

  function parseScheduleTimes(): string[] {
    const parsed = doseTimes.map((row, index) => {
      try {
        const normalized = normalizeTime12Display(row.time12)
        return twelveHourToScheduleTime(normalized, row.period)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid time'
        throw new Error(`Dose ${index + 1}: ${msg}`, { cause: err })
      }
    })
    return normalizeScheduleTimes(parsed)
  }

  function validateStep(current: WizardStep): string | null {
    switch (current) {
      case 'name':
        if (!name.trim()) return 'Enter a medication name.'
        return null
      case 'route':
        if (!route) return 'Choose how you take this medication.'
        return null
      case 'form':
        if (!form.trim()) {
          return isOtherRoute
            ? 'Describe how you take this medication.'
            : 'Choose the medication type.'
        }
        return null
      case 'dates': {
        const end = hasEndDate && endDate.trim() ? endDate.trim() : null
        try {
          validateMedicationDates(startDate, end)
        } catch (err) {
          return getErrorMessage(err, 'Check your schedule dates.')
        }
        if (hasEndDate && !endDate.trim()) return 'Enter an end date or turn it off.'
        return null
      }
      case 'dosage':
        return validateDosageWizard({ ...dosageWizard, route, form, scheduleType })
      case 'frequency':
        return null
      case 'times':
        if (scheduleType === 'as_needed') return null
        try {
          if (parseScheduleTimes().length === 0) {
            return 'Add at least one dose time.'
          }
        } catch (err) {
          return getErrorMessage(err, 'Check your dose times.')
        }
        return null
      case 'tracking':
        if (trackPills) {
          const n = parseInt(pillsRemaining, 10)
          if (Number.isNaN(n) || n < 0) {
            return 'Remaining supply must be a non-negative number.'
          }
        }
        return null
      default:
        return null
    }
  }

  function goNext() {
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setSlideDirection('forward')
    setStepIndex((i) => Math.min(i + 1, wizardStepsFor(scheduleType).length - 1))
  }

  function goBack() {
    setError(null)
    setSlideDirection('back')
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function handleRemindersToggle(enabled: boolean) {
    if (enabled) {
      const ok = await requestNotificationPermission()
      if (!ok) {
        setError('Enable notifications in your browser to use reminders.')
        setRemindersOn(false)
        return
      }
    }
    setRemindersOn(enabled)
    setReminders({ enabled })
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    if (!isLastStep) {
      goNext()
      return
    }

    setError(null)
    setBusy(true)

    try {
      if (!route) throw new Error('Choose how you take this medication.')

      const schedule_times =
        scheduleType === 'as_needed' ? [] : parseScheduleTimes()
      const end_date = hasEndDate && endDate.trim() ? endDate.trim() : null
      validateMedicationDates(startDate, end_date)

      let pills: number | null = null
      if (trackPills) {
        const n = parseInt(pillsRemaining, 10)
        if (Number.isNaN(n) || n < 0) {
          throw new Error('Remaining supply must be a non-negative number')
        }
        pills = n
      }

      if (scheduleType === 'scheduled') {
        setReminders({ enabled: remindersOn })
      }

      const built = buildDoseFieldsFromWizard({
        ...dosageWizard,
        route,
        form,
        scheduleType,
      })

      await onSave({
        name,
        medication_route: route,
        medication_form: form.trim(),
        dose_pills: built.dose_pills,
        dose_mg: built.dose_mg,
        max_doses_per_day: built.max_doses_per_day,
        prn_amount_hints: built.prn_amount_hints,
        prn_symptom_hints: built.prn_symptom_hints,
        schedule_type: scheduleType,
        schedule_times,
        tracking_sync: trackingSync,
        notes,
        pills_remaining: pills,
        start_date: startDate,
        end_date,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save'))
    } finally {
      setBusy(false)
    }
  }

  function renderStepPanel(current: WizardStep) {
    switch (current) {
      case 'name':
        return (
          <div className="med-wizard-panel-inner">
            <p className="field-hint">
              Type a medication name — pick a suggestion or enter your own.
            </p>
            <label>
              Name *
              <MedicationNameInput
                required
                value={name}
                onChange={setName}
                onSelectSuggestion={applySuggestion}
              />
            </label>
          </div>
        )

      case 'route':
        return (
          <div className="med-wizard-panel-inner med-wizard-panel-inner--scroll">
            <p className="field-hint">Pick the category that best matches how you use it.</p>
            <p className="field-hint med-wizard-nav-hint">Select one option, then tap Next.</p>
            <div className="med-type-grid med-type-grid-route">
              {MEDICATION_ROUTES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`med-type-card${route === option.id ? ' selected' : ''}`}
                  onClick={() => selectRoute(option.id)}
                  aria-pressed={route === option.id}
                >
                  <span className="med-type-card-label">{option.label}</span>
                  <span className="med-type-card-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 'form':
        return (
          <div className="med-wizard-panel-inner med-wizard-panel-inner--scroll">
            {isOtherRoute ? (
              <>
                <p className="field-hint">
                  Tell us how this medication is taken (e.g. inhaler, eye drops, suppository).
                </p>
                <p className="field-hint med-wizard-nav-hint">
                  Describe it below, then tap Next.
                </p>
                <label>
                  How do you take it? *
                  <textarea
                    value={form}
                    onChange={(e) => {
                      setForm(e.target.value)
                      setError(null)
                    }}
                    rows={4}
                    placeholder="e.g. One puff from inhaler twice daily"
                  />
                </label>
              </>
            ) : (
              <>
                <p className="field-hint">
                  {route
                    ? `Options for ${MEDICATION_ROUTES.find((r) => r.id === route)?.label ?? 'this route'}`
                    : 'Go back and choose a route first.'}
                </p>
                <p className="field-hint med-wizard-nav-hint">
                  Select one type, then tap Next.
                </p>
                <div className="med-type-grid med-type-grid-form">
                  {formOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`med-type-chip${form === option.id ? ' selected' : ''}`}
                      onClick={() => selectFormType(option.id)}
                      aria-pressed={form === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )

      case 'dates':
        return (
          <div className="med-wizard-panel-inner">
            <label>
              Start date *
              <IsoDateInput
                value={startDate}
                onChange={setStartDate}
                aria-label="Medication start date"
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => {
                  setHasEndDate(e.target.checked)
                  if (!e.target.checked) setEndDate('')
                }}
              />
              Set an end date (optional)
            </label>
            {hasEndDate && (
              <label>
                End date
                <IsoDateInput
                  value={endDate}
                  onChange={setEndDate}
                  aria-label="Medication end date"
                />
              </label>
            )}
            <p className="field-hint">
              Doses appear on Today only between these dates. Leave end date empty for
              ongoing medications.
            </p>
          </div>
        )

      case 'frequency':
        return (
          <div className="med-wizard-panel-inner">
            <p className="field-hint">
              Daily medications use fixed reminder times. As-needed (PRN) meds are logged
              when you take them — no fixed schedule.
            </p>
            <div className="med-type-grid med-type-grid-route">
              <button
                type="button"
                className={`med-type-card${scheduleType === 'scheduled' ? ' selected' : ''}`}
                onClick={() => selectScheduleType('scheduled')}
                aria-pressed={scheduleType === 'scheduled'}
              >
                <span className="med-type-card-label">Daily schedule</span>
                <span className="med-type-card-desc">
                  Fixed times each day (morning, evening, etc.)
                </span>
              </button>
              <button
                type="button"
                className={`med-type-card${scheduleType === 'as_needed' ? ' selected' : ''}`}
                onClick={() => selectScheduleType('as_needed')}
                aria-pressed={scheduleType === 'as_needed'}
              >
                <span className="med-type-card-label">As needed (PRN)</span>
                <span className="med-type-card-desc">
                  Pain relievers, rescue inhalers — log when taken
                </span>
              </button>
            </div>
          </div>
        )

      case 'dosage':
        return (
          <DosageStepPanel
            route={route}
            scheduleType={scheduleType}
            values={{ ...dosageWizard, route, form, scheduleType }}
            onChange={patchDosage}
          />
        )

      case 'times':
        return (
          <div className="med-wizard-panel-inner">
            <p className="field-hint">
              One row per daily dose (e.g. morning and evening = two rows).
            </p>
            {doseTimes.map((row, index) => (
              <div key={row.id} className="dose-time-row">
                <span className="dose-time-label">Dose {index + 1}:</span>
                <DoseTimeInput
                  label={`Dose ${index + 1}`}
                  time12={row.time12}
                  period={row.period}
                  onChange={(next) => updateDoseTime(row.id, next)}
                />
                {doseTimes.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm dose-time-remove"
                    onClick={() => removeDoseTime(row.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm dose-time-add"
              onClick={addDoseTime}
            >
              + Add dose time
            </button>
          </div>
        )

      case 'notes':
        return (
          <div className="med-wizard-panel-inner">
            <label>
              Notes (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Take with food, avoid alcohol, etc."
              />
            </label>
            <label className="checkbox-row tracking-sync-row">
              <input
                type="checkbox"
                checked={trackingSync === 'hrt'}
                onChange={(e) =>
                  setTrackingSync(e.target.checked ? 'hrt' : 'none')
                }
              />
              Sync doses to <strong>Tracking → HRT</strong> when logged on Today
            </label>
            <p className="field-hint">
              Use for hormone therapy (patches, gel, injections, etc.). Logging still
              happens on Today; this copies each dose into your HRT tracker.
            </p>
          </div>
        )

      case 'tracking': {
        const built = buildDoseFieldsFromWizard({
          ...dosageWizard,
          route,
          form,
          scheduleType,
        })
        const invMed = {
          dose_pills: built.dose_pills,
          medication_form: form,
          medication_route: route,
        }
        const unitPlural = inventoryUnitLabel(invMed)
        const unitSingular = inventoryUnitLabel(invMed, false)
        const perDose = getDoseDeductionAmount(built.dose_pills)
        const unitTitle =
          unitPlural.charAt(0).toUpperCase() + unitPlural.slice(1)

        return (
          <div className="med-wizard-panel-inner">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={trackPills}
                onChange={(e) => setTrackPills(e.target.checked)}
              />
              Track supply remaining (for refill reminders)
            </label>
            {trackPills && (
              <label>
                {unitTitle} remaining
                <input
                  type="number"
                  min={0}
                  value={pillsRemaining}
                  onChange={(e) => setPillsRemaining(e.target.value)}
                  placeholder={
                    unitPlural === 'puffs'
                      ? 'e.g. 150'
                      : unitPlural === 'sprays'
                        ? 'e.g. 120'
                        : 'e.g. 30'
                  }
                />
              </label>
            )}
            <p className="field-hint">
              {trackPills
                ? `Each dose logged subtracts ${perDose} ${perDose === 1 ? unitSingular : unitPlural} from this total (from your dose amount). Undo adds them back.`
                : 'When enabled, marking doses taken updates your remaining count automatically.'}
            </p>
          </div>
        )
      }

      case 'notifications':
        return (
          <div className="med-wizard-panel-inner">
            <p className="field-hint">
              Get browser reminders while this app is open when a dose time passes.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remindersOn}
                disabled={!canUseNotifications()}
                onChange={(e) => void handleRemindersToggle(e.target.checked)}
              />
              Enable dose reminders
            </label>
            {!canUseNotifications() && (
              <p className="field-hint">Notifications are not supported in this browser.</p>
            )}
          </div>
        )

      case 'safety':
        return (
          <div className="med-wizard-panel-inner med-wizard-panel-inner--scroll">
            <MedicationSafetyPanel
              drugName={name}
              existingMedicationNames={existingMedicationNames.filter(
                (medName) =>
                  medName.toLowerCase() !== name.trim().toLowerCase() &&
                  medName.toLowerCase() !== (initial?.name.trim().toLowerCase() ?? ''),
              )}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal med-form-modal"
        role="dialog"
        aria-labelledby="med-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="med-wizard-header">
          <h2 id="med-form-title">{initial ? 'Edit medication' : 'Add medication'}</h2>
          <p className="med-wizard-step-label">
            Step {stepIndex + 1} of {wizardSteps.length} — {stepLabel(step)}
          </p>
          <div
            className="med-wizard-progress"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={wizardSteps.length}
          >
            {wizardSteps.map((wizardStep, i) => (
              <span
                key={wizardStep}
                className={`med-wizard-dot${i <= stepIndex ? ' filled' : ''}${i === stepIndex ? ' current' : ''}`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="med-form med-form-wizard">
          <div className="med-wizard-viewport" data-direction={slideDirection}>
            <div key={step} className="med-wizard-slide">
              <h3 className="med-wizard-panel-title">{stepLabel(step)}</h3>
              {renderStepPanel(step)}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions med-wizard-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <div className="med-wizard-nav">
              {stepIndex > 0 && (
                <button type="button" className="btn btn-secondary" onClick={goBack}>
                  Back
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : isLastStep ? 'Save' : 'Next'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
