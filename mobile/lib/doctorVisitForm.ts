import type { DoctorVisitInput } from './doctorVisits';
import { normalizeIsoDateDisplay } from './isoDateInput';
import { parseAppointmentTime } from './appointmentCalendar';

/** Validate once before saving either a new or existing appointment. */
export function prepareDoctorVisitInput(draft: DoctorVisitInput): DoctorVisitInput {
  if (!draft.provider_name.trim() && !draft.reason.trim()) throw new Error('Add a doctor or clinic name, or a reason for the visit.');
  const visit_date = normalizeIsoDateDisplay(draft.visit_date);
  if (!visit_date) throw new Error('Choose an appointment date.');
  try { parseAppointmentTime(draft.visit_time); }
  catch { throw new Error('Choose a valid appointment time, or clear it.'); }
  let follow_up_date: string;
  try { follow_up_date = normalizeIsoDateDisplay(draft.follow_up_date); }
  catch { throw new Error('Enter a valid follow-up date using YYYY-MM-DD.'); }
  return { ...draft, visit_date, follow_up_date, provider_name: draft.provider_name.trim(), specialty: draft.specialty.trim(),
    location: draft.location.trim(), reason: draft.reason.trim(), visit_time: draft.visit_time.trim(), notes: draft.notes.trim() };
}
