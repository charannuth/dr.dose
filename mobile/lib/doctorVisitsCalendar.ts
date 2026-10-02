import { todayLocalDate } from './dates';
import {
  fetchDoctorVisitsForCalendar,
  visitNeedsNotes,
  visitSummaryLabel,
  type DoctorVisit,
} from './doctorVisits';
import type { TrackingCalendarCell, TrackingCalendarData } from './tracking/calendarTypes';
import { emptyCalendarCell } from './tracking/calendarTypes';

function datesInRange(start: string, end: string): string[] {
  const startMs = new Date(`${start}T12:00:00`).getTime();
  const endMs = new Date(`${end}T12:00:00`).getTime();
  const n = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000))) + 1;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

function shortLabel(text: string, max = 18): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function visitsByDate(visits: DoctorVisit[]): Map<string, DoctorVisit[]> {
  const map = new Map<string, DoctorVisit[]>();
  for (const visit of visits) {
    const list = map.get(visit.visit_date) ?? [];
    list.push(visit);
    map.set(visit.visit_date, list);
  }
  for (const [date, list] of map) {
    map.set(
      date,
      [...list].sort((a, b) => (a.visit_time ?? '').localeCompare(b.visit_time ?? '')),
    );
  }
  return map;
}

function followUpsByDate(visits: DoctorVisit[]): Map<string, DoctorVisit[]> {
  const map = new Map<string, DoctorVisit[]>();
  for (const visit of visits) {
    if (!visit.follow_up_date) continue;
    const list = map.get(visit.follow_up_date) ?? [];
    list.push(visit);
    map.set(visit.follow_up_date, list);
  }
  return map;
}

function cellForDate(
  date: string,
  today: string,
  dayVisits: DoctorVisit[],
  followUpVisits: DoctorVisit[],
): TrackingCalendarCell {
  const classNames: string[] = [];
  const markers: TrackingCalendarCell['markers'] = [];
  const events: TrackingCalendarCell['events'] = [];

  if (date > today) classNames.push('is-future');

  if (dayVisits.length > 0) {
    const upcoming = dayVisits.every((v) => v.visit_date > today);
    const needsNotes = dayVisits.some((v) => visitNeedsNotes(v, today));

    if (upcoming || date > today) {
      classNames.push('doctor-visit-upcoming');
    } else if (needsNotes) {
      classNames.push('doctor-visit-needs-notes');
      markers.push('dot');
    } else {
      classNames.push('doctor-visit-logged');
      markers.push('dot');
    }

    for (const visit of dayVisits) {
      const label = visitSummaryLabel(visit);
      let tone: TrackingCalendarCell['events'][number]['tone'] = 'doctor-past';
      if (visit.visit_date > today) tone = 'doctor-upcoming';
      else if (visitNeedsNotes(visit, today)) tone = 'doctor-notes';
      events.push({
        id: visit.id,
        label: visit.visit_time?.trim() ? `${label} · ${visit.visit_time.trim()}` : label,
        tone,
      });
    }

  }

  if (followUpVisits.length > 0) {
    classNames.push('doctor-visit-followup');
    markers.push('dot');
    for (const visit of followUpVisits) {
      events.push({
        id: `${visit.id}-followup`,
        label: `Follow-up · ${shortLabel(visitSummaryLabel(visit))}`,
        tone: 'doctor-followup',
      });
    }
  }

  return { date, classNames, markers, events };
}

const DOCTOR_VISITS_LEGEND: TrackingCalendarData['legend'] = [
  { id: 'upcoming', label: 'Upcoming visit', swatchClass: 'doctor-visit-upcoming' },
  { id: 'logged', label: 'Visit logged', swatchClass: 'doctor-visit-logged' },
  { id: 'notes', label: 'Needs visit notes', swatchClass: 'doctor-visit-needs-notes' },
  { id: 'followup', label: 'Follow-up scheduled', swatchClass: 'doctor-visit-followup' },
];

export async function loadDoctorVisitsCalendarData(
  userId: string,
  start: string,
  end: string,
  today = todayLocalDate(),
): Promise<TrackingCalendarData> {
  const visits = await fetchDoctorVisitsForCalendar(userId, start, end);
  const byDate = visitsByDate(visits);
  const followUps = followUpsByDate(visits);
  const cells = new Map<string, TrackingCalendarCell>();

  for (const date of datesInRange(start, end)) {
    cells.set(date, cellForDate(date, today, byDate.get(date) ?? [], followUps.get(date) ?? []));
  }

  for (const [date, dayVisits] of byDate) {
    if (cells.has(date)) continue;
    cells.set(date, cellForDate(date, today, dayVisits, followUps.get(date) ?? []));
  }

  return {
    cells,
    legend: DOCTOR_VISITS_LEGEND,
    emptyMessage: undefined,
    footer: undefined,
  };
}

export function emptyDoctorVisitsCalendarCell(date: string): TrackingCalendarCell {
  return emptyCalendarCell(date);
}
