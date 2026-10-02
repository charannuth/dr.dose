import type { DoctorVisit } from './doctorVisits';

export type CalendarCopy = {
  title: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  date: string;
  endDate: string;
  timeZone: string;
};

export function parseAppointmentTime(value: string): { hour: number; minute: number } | null {
  if (!value.trim()) return null;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value.trim());
  if (!match) throw new Error('Use a time like 2:30 PM or 14:30 before adding to a calendar.');
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3]?.toLowerCase();
  if (minute > 59 || hour > (period ? 12 : 23) || (period && hour < 1)) {
    throw new Error('Enter a valid appointment time before adding to a calendar.');
  }
  if (period) hour = hour % 12 + (period === 'pm' ? 12 : 0);
  return { hour, minute };
}

/** Resolve the appointment wall clock in the app's chosen timezone, not the phone's. */
function zonedInstant(date: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const wallTime = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  };
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const delta = target - wallTime(instant);
    if (delta === 0) return new Date(instant);
    instant += delta;
  }
  throw new Error('This time does not exist because of a daylight-saving change. Choose another time.');
}

export function buildCalendarCopy(visit: DoctorVisit, timeZone: string, durationMinutes = 60): CalendarCopy {
  const date = visit.visit_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Save a valid appointment date first.');
  }
  const time = parseAppointmentTime(visit.visit_time ?? '');
  const nextDay = new Date(`${date}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endDate = nextDay.toISOString().slice(0, 10);
  const start = zonedInstant(date, time?.hour ?? 0, time?.minute ?? 0, timeZone);
  const end = time ? new Date(start.getTime() + durationMinutes * 60_000) : zonedInstant(endDate, 0, 0, timeZone);
  return {
    title: visit.provider_name?.trim() ? `Doctor appointment · ${visit.provider_name.trim()}` : 'Doctor appointment',
    location: visit.location?.trim() ?? '', start, end, allDay: !time, date, endDate, timeZone,
  };
}

export function calendarComposeUrl(provider: 'google' | 'microsoft' | 'microsoft-work', event: CalendarCopy): string {
  const compact = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams();
  if (provider === 'google') {
    params.set('action', 'TEMPLATE');
    params.set('text', event.title);
    params.set('dates', event.allDay
      ? `${event.date.replace(/-/g, '')}/${event.endDate.replace(/-/g, '')}`
      : `${compact(event.start)}/${compact(event.end)}`);
    params.set('ctz', event.timeZone);
    params.set('location', event.location);
    return `https://calendar.google.com/calendar/render?${params}`;
  }
  params.set('path', '/calendar/action/compose');
  params.set('rru', 'addevent');
  params.set('subject', event.title);
  params.set('startdt', event.allDay ? event.date : event.start.toISOString());
  params.set('enddt', event.allDay ? event.endDate : event.end.toISOString());
  params.set('allday', String(event.allDay));
  params.set('location', event.location);
  return `https://${provider === 'microsoft-work' ? 'outlook.office.com' : 'outlook.live.com'}/calendar/0/deeplink/compose?${params}`;
}
