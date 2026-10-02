import type { WidgetKind, WidgetSummary } from './dashboardLayout';
import { fetchWellnessLog, isWellnessLogFilled, logFromRow } from './wellness';
import { fetchDoctorVisits, visitProviderLabel } from './doctorVisits';
import { fetchMedicalRecord } from './medicalRecords';
import { fetchWeightLogs } from './tracking/weight';
import { fetchCyclePeriods, fetchCycleDayLogs } from './tracking/cycle';
import { fetchHrtDayLog } from './tracking/hrt';
import { fetchEnabledTrackers } from './tracking/trackers';
import { trackerCatalogEntry } from './tracking/catalog';
import { formatWeightForUnit } from './bodyMetrics';
import { getReminders } from './settings';
import { lastNDays } from './dates';
import { parseAppointmentTime } from './appointmentCalendar';

function visitMinutes(time: string | null): number {
  try {
    const parsed = parseAppointmentTime(time ?? '');
    return parsed ? parsed.hour * 60 + parsed.minute : 1440;
  } catch { return 1440; }
}

export const REMOTE_WIDGETS: WidgetKind[] = ['wellness', 'visits', 'weight', 'cycle', 'hrt', 'tracking', 'records', 'account'];

export async function loadWidgetSummary(kind: WidgetKind, userId: string, today: string): Promise<WidgetSummary> {
  switch (kind) {
    case 'wellness': {
      const row = await fetchWellnessLog(userId, today);
      const filled = row && isWellnessLogFilled(logFromRow(row));
      return { value: filled ? 'Checked in' : 'Not logged', subtitle: 'Today’s wellness', details: filled ? [
        row.sleep_hours != null ? `${row.sleep_hours} hours of sleep` : 'Sleep not logged',
        row.energy_level != null ? `Energy: ${row.energy_level}/5` : 'Energy not logged',
        `${row.symptoms.length} symptoms logged`,
      ] : ['Log sleep, energy, and how you feel today.'] };
    }
    case 'visits': {
      const visits = (await fetchDoctorVisits(userId, 500)).filter((visit) => visit.visit_date >= today)
        .sort((a, b) => a.visit_date.localeCompare(b.visit_date) || visitMinutes(a.visit_time) - visitMinutes(b.visit_time));
      const next = visits[0];
      return { value: next ? visitProviderLabel(next) : 'No upcoming visits', subtitle: next ? `${next.visit_date}${next.visit_time ? ` · ${next.visit_time}` : ''}` : 'Plan your next appointment', details: next ? [next.location || 'Location not added', `${visits.length} saved visits from today`] : ['Add appointments and visit notes to your calendar.'] };
    }
    case 'weight': {
      const [logs, record] = await Promise.all([fetchWeightLogs(userId, lastNDays(90).at(-1)!, today), fetchMedicalRecord(userId)]);
      const measured = logs.filter((log) => log.weight_kg != null);
      const latest = measured.at(-1);
      const previous = measured.at(-2);
      const unit = record?.weight_unit ?? 'metric';
      const change = latest && previous ? latest.weight_kg! - previous.weight_kg! : null;
      const delta = change == null ? null : (unit === 'imperial' ? change * 2.2046226218 : change);
      return { value: latest ? formatWeightForUnit(latest.weight_kg, unit)! : 'No recent weight', subtitle: latest ? `Logged ${latest.log_date}` : 'Last 90 days', details: [delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit === 'imperial' ? 'lb' : 'kg'} since previous entry` : 'Add two weight entries to see a change.', `${measured.length} entries in the last 90 days`] };
    }
    case 'cycle': {
      const [periods, logs] = await Promise.all([fetchCyclePeriods(userId), fetchCycleDayLogs(userId, today, today)]);
      const latest = [...periods].filter((p) => p.started_on <= today).sort((a, b) => b.started_on.localeCompare(a.started_on))[0];
      return { value: latest ? latest.ended_on ? 'Period recorded' : 'Period ongoing' : 'No period logged', subtitle: latest ? `Started ${latest.started_on}` : 'Open cycle tracking to get started', details: [latest?.ended_on ? `Ended ${latest.ended_on}` : 'Based on your logged entries.', logs[0]?.flow_level ? `Today’s flow: ${logs[0].flow_level}` : 'No flow logged today'] };
    }
    case 'hrt': {
      const row = await fetchHrtDayLog(userId, today);
      return { value: row ? 'Journal saved' : 'Not logged', subtitle: 'Today’s HRT journal', details: row ? [`${row.bodily_changes.length} bodily changes logged`, `${row.mood_changes.length} mood changes logged`] : ['Record changes and notes in your HRT tracker.'] };
    }
    case 'tracking': {
      const trackers = await fetchEnabledTrackers(userId);
      return { value: `${trackers.length} active`, subtitle: 'Your health trackers', details: trackers.length ? trackers.map((id) => trackerCatalogEntry(id)?.label ?? id) : ['Choose trackers to personalize your health journal.'] };
    }
    case 'records': {
      const record = await fetchMedicalRecord(userId);
      return { value: record ? 'Records saved' : 'No records yet', subtitle: 'Your medical information', details: record ? [`${record.known_allergies.length} allergies · ${record.known_conditions.length} conditions`, `Blood type: ${record.blood_type || 'Not entered'}`] : ['Add allergies, conditions, and emergency information.'] };
    }
    case 'account': {
      const reminders = await getReminders();
      return { value: reminders.enabled ? 'Reminders on' : 'Reminders off', subtitle: 'App reminder preference', details: ['Manage your profile, appearance, and notification settings.'] };
    }
    default: throw new Error('No summary loader for this widget');
  }
}
