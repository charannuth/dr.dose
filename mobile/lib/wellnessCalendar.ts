import type { WellnessLog } from './wellness';
import type { TrackingCalendarData, TrackingCalendarEvent } from './tracking/calendarTypes';

export function buildWellnessCalendarData(logs: WellnessLog[]): TrackingCalendarData {
  return { legend: [], cells: new Map(logs.map((log) => {
    const events: TrackingCalendarEvent[] = [];
    const add = (id: string, label: string) => events.push({ id, label, tone: 'wellness' });
    if (log.sleep_hours !== null) add('sleep', `${log.sleep_hours}h sleep`);
    if (log.sleep_quality !== null) add('quality', `Sleep quality ${log.sleep_quality}/5`);
    if (log.energy_level !== null) add('energy', `Energy ${log.energy_level}/5`);
    if (log.appetite) add('appetite', `Appetite: ${log.appetite}`);
    if (log.exercised) add('exercise', log.exercise_minutes !== null ? `${log.exercise_minutes} min exercise` : 'Exercise logged');
    if (log.symptoms.length) add('symptoms', log.symptoms.join(', '));
    if (log.notes?.trim()) add('notes', 'Notes saved');
    return [log.log_date, { date: log.log_date, classNames: [], markers: [], events }];
  })) };
}
