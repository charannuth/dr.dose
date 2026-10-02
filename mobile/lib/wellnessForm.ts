import type { WellnessLogInput } from './wellness';
import { normalizeIsoDateDisplay } from './isoDateInput';

export function validateWellnessLog(input: WellnessLogInput, today: string): void {
  const date = normalizeIsoDateDisplay(input.log_date);
  if (!date || date > today) throw new Error('Choose today or an earlier date for your daily log.');
  for (const [label, value, max, integer] of [
    ['Sleep hours', input.sleep_hours, 24, false],
    ['Sleep quality', input.sleep_quality, 5, true],
    ['Energy', input.energy_level, 5, true],
    ['Exercise minutes', input.exercise_minutes, 1440, true],
  ] as const) {
    const min = label === 'Sleep quality' || label === 'Energy' ? 1 : 0;
    if (value !== null && (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))) {
      throw new Error(`${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`);
    }
  }
}
