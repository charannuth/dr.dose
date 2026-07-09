import {
  normalizeScheduleTimes,
  scheduleTimeToTwelveHour,
  todayLocalDate,
  type Meridiem,
} from '../../lib/dates';
import {
  isMedicationRouteId,
  type MedicationRouteId,
} from '../../lib/medicationForms';
import type { MedicationScheduleType } from '../../lib/medicationSchedule';
import {
  defaultInjectionStyle,
  parseInjectionFromMed,
  parseOralCount,
  type DosageWizardValues,
} from '../../lib/doseByRoute';
import type { Medication, MedicationTrackingSync } from '../../lib/types';
import {
  defaultTileColorForRoute,
  isTileColorId,
  type TileColorId,
} from '../../constants/theme';

/**
 * The add/edit flow is grouped into a few scrollable pages instead of one field
 * per screen. Safety is always its own final page and can never be skipped.
 */
export const WIZARD_PAGES = ['basics', 'schedule', 'extras', 'safety'] as const;

export type WizardPage = (typeof WIZARD_PAGES)[number];

export const PAGE_TITLES: Record<WizardPage, string> = {
  basics: 'Basics',
  schedule: 'Dose & schedule',
  extras: 'Reminders & tracking',
  safety: 'Safety review',
};

/** Short labels for the tappable page tabs at the top of the flow. */
export const PAGE_TABS: Record<WizardPage, string> = {
  basics: 'Basics',
  schedule: 'Schedule',
  extras: 'Reminders',
  safety: 'Safety',
};

export type DoseTimeRow = {
  id: string;
  time12: string;
  period: Meridiem;
};

export function newDoseTimeRow(time24?: string): DoseTimeRow {
  const base = time24
    ? scheduleTimeToTwelveHour(time24)
    : { time12: '8:00', period: 'AM' as Meridiem };
  return {
    id: `dt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    time12: base.time12,
    period: base.period,
  };
}

export function buildDoseTimes(initial?: Medication | null): DoseTimeRow[] {
  const times = normalizeScheduleTimes(initial?.schedule_times ?? []);
  if (times.length > 0) {
    return times.map((t) => newDoseTimeRow(t));
  }
  return [newDoseTimeRow()];
}

export function buildDosageWizardState(
  initial: Medication | null | undefined,
  route: MedicationRouteId | null,
  scheduleType: MedicationScheduleType,
): DosageWizardValues {
  const form = initial?.medication_form ?? '';
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
  };

  if (!initial) return base;

  if (scheduleType === 'as_needed') {
    const hints = [...(initial.prn_amount_hints ?? [])];
    let typical = initial.dose_pills?.trim() ?? '';
    if (typical === 'Varies') typical = '';
    if (typical && hints.includes(typical)) {
      return { ...base, prnTypicalAmount: typical, prnAmountHints: hints.filter((h) => h !== typical) };
    }
    return { ...base, prnTypicalAmount: typical, prnAmountHints: hints };
  }

  const medRoute =
    route ??
    (initial.medication_route && isMedicationRouteId(initial.medication_route)
      ? initial.medication_route
      : null);

  if (medRoute === 'oral') {
    return { ...base, route: medRoute, oralCount: parseOralCount(initial.dose_pills) };
  }
  if (medRoute === 'dermal') {
    const desc = initial.dose_pills?.trim() ?? '';
    return {
      ...base,
      route: medRoute,
      dermalDescription: desc === 'Apply to skin' ? '' : desc,
    };
  }
  if (medRoute === 'injection') {
    const inj = parseInjectionFromMed(initial.dose_pills, initial.dose_mg, form);
    return { ...base, route: medRoute, ...inj, doseMg: initial.dose_mg ?? '' };
  }
  return { ...base, route: medRoute, otherDescription: initial.dose_pills?.trim() ?? '' };
}

export function buildFormState(
  initial?: Medication | null,
  defaultScheduleType: MedicationScheduleType = 'scheduled',
) {
  const route =
    initial?.medication_route && isMedicationRouteId(initial.medication_route)
      ? initial.medication_route
      : null;
  const scheduleType: MedicationScheduleType =
    initial?.schedule_type === 'as_needed' ? 'as_needed' : defaultScheduleType;

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
      trackingSync:
        initial.tracking_sync === 'hrt' ? ('hrt' as MedicationTrackingSync) : 'none',
      tileColor: isTileColorId(initial.tile_color)
        ? initial.tile_color
        : defaultTileColorForRoute(initial.medication_route),
    };
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
    trackingSync: 'none' as MedicationTrackingSync,
    tileColor: 'accentPurple' as TileColorId,
  };
}
