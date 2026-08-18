import { formatDisplayDate, todayLocalDate } from './dates'
import { openRow, openRows, sealRow } from './crypto/seal'
import { supabase } from './supabase'

export const DOCTOR_APPOINTMENT_TYPES = [
  { id: 'scheduled', label: 'Scheduled visit' },
  { id: 'regular_checkup', label: 'Regular checkup' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'telehealth', label: 'Telehealth' },
  { id: 'other', label: 'Other' },
] as const

export type DoctorAppointmentType = (typeof DOCTOR_APPOINTMENT_TYPES)[number]['id']

export type DoctorVisit = {
  id: string
  user_id: string
  visit_date: string
  visit_time: string | null
  appointment_type: DoctorAppointmentType | null
  provider_name: string | null
  specialty: string | null
  location: string | null
  reason: string | null
  notes: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
}

export type DoctorVisitInput = {
  visit_date: string
  visit_time: string
  appointment_type: DoctorAppointmentType | ''
  provider_name: string
  specialty: string
  location: string
  reason: string
  notes: string
  follow_up_date: string
}

export const emptyDoctorVisitInput = (visitDate = todayLocalDate()): DoctorVisitInput => ({
  visit_date: visitDate,
  visit_time: '',
  appointment_type: '',
  provider_name: '',
  specialty: '',
  location: '',
  reason: '',
  notes: '',
  follow_up_date: '',
})

export function formatAppointmentTypeLabel(
  type: DoctorAppointmentType | string | null | undefined,
): string | null {
  if (!type) return null
  const entry = DOCTOR_APPOINTMENT_TYPES.find((t) => t.id === type)
  return entry?.label ?? null
}

export function pickAppointmentFields(
  input: DoctorVisitInput,
): Pick<
  DoctorVisitInput,
  'visit_time' | 'appointment_type' | 'provider_name' | 'specialty' | 'location' | 'reason'
> {
  return {
    visit_time: input.visit_time,
    appointment_type: input.appointment_type,
    provider_name: input.provider_name,
    specialty: input.specialty,
    location: input.location,
    reason: input.reason,
  }
}

export function visitToInput(visit: DoctorVisit): DoctorVisitInput {
  return {
    visit_date: visit.visit_date,
    visit_time: visit.visit_time ?? '',
    appointment_type: visit.appointment_type ?? '',
    provider_name: visit.provider_name ?? '',
    specialty: visit.specialty ?? '',
    location: visit.location ?? '',
    reason: visit.reason ?? '',
    notes: visit.notes ?? '',
    follow_up_date: visit.follow_up_date ?? '',
  }
}

export function buildAppointmentSavePayload(
  draft: DoctorVisitInput,
  visitDate: string,
  savedVisit: DoctorVisit | null,
): DoctorVisitInput {
  const savedNotes = savedVisit ? visitToInput(savedVisit) : emptyDoctorVisitInput(visitDate)
  return {
    visit_date: visitDate,
    visit_time: draft.visit_time,
    appointment_type: draft.appointment_type,
    provider_name: draft.provider_name,
    specialty: draft.specialty,
    location: draft.location,
    reason: draft.reason,
    notes: savedNotes.notes,
    follow_up_date: savedNotes.follow_up_date,
  }
}

export function buildNotesSavePayload(
  draft: DoctorVisitInput,
  visitDate: string,
  savedVisit: DoctorVisit,
): DoctorVisitInput {
  const savedInput = visitToInput(savedVisit)
  return {
    ...savedInput,
    visit_date: visitDate,
    notes: draft.notes,
    follow_up_date: draft.follow_up_date,
  }
}

export function isDoctorVisitScheduled(input: DoctorVisitInput): boolean {
  return Boolean(
    input.visit_date.trim() &&
      (input.provider_name.trim() ||
        input.reason.trim() ||
        input.specialty.trim() ||
        input.location.trim()),
  )
}

export function isUpcomingVisit(visitDate: string, today = todayLocalDate()): boolean {
  return visitDate > today
}

export function visitNeedsNotes(visit: DoctorVisit, today = todayLocalDate()): boolean {
  return visit.visit_date <= today && !visit.notes?.trim()
}

export function splitDoctorVisits(visits: DoctorVisit[], today = todayLocalDate()) {
  const upcoming: DoctorVisit[] = []
  const past: DoctorVisit[] = []

  for (const visit of visits) {
    if (isUpcomingVisit(visit.visit_date, today)) {
      upcoming.push(visit)
    } else {
      past.push(visit)
    }
  }

  upcoming.sort((a, b) => a.visit_date.localeCompare(b.visit_date))
  past.sort((a, b) => b.visit_date.localeCompare(a.visit_date))

  return { upcoming, past }
}

export function formatVisitWhen(visit: DoctorVisit): string {
  const dateLabel = formatDisplayDate(visit.visit_date)
  if (visit.visit_time?.trim()) {
    return `${dateLabel} · ${visit.visit_time.trim()}`
  }
  return dateLabel
}

export function visitProviderLabel(visit: DoctorVisit): string {
  if (visit.provider_name?.trim()) return visit.provider_name.trim()
  if (visit.specialty?.trim()) return visit.specialty.trim()
  const typeLabel = formatAppointmentTypeLabel(visit.appointment_type)
  if (typeLabel) return typeLabel
  return 'Doctor visit'
}

export function visitSummaryLabel(visit: DoctorVisit): string {
  const provider = visitProviderLabel(visit)
  const typeLabel = formatAppointmentTypeLabel(visit.appointment_type)
  if (typeLabel && visit.provider_name?.trim()) {
    return `${typeLabel} · ${provider}`
  }
  return provider
}

export async function fetchDoctorVisits(userId: string, limit = 48): Promise<DoctorVisit[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('doctor_visits')
    .select('*')
    .eq('user_id', userId)
    .order('visit_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return openRows(
    'doctor_visits',
    (data ?? []) as Record<string, unknown>[],
  ) as unknown as DoctorVisit[]
}

export async function fetchDoctorVisitsForCalendar(
  userId: string,
  start: string,
  end: string,
): Promise<DoctorVisit[]> {
  const all = await fetchDoctorVisits(userId, 200)
  return all.filter(
    (v) =>
      (v.visit_date >= start && v.visit_date <= end) ||
      (v.follow_up_date != null &&
        v.follow_up_date >= start &&
        v.follow_up_date <= end),
  )
}

export async function fetchDoctorVisitsOnDate(
  userId: string,
  visitDate: string,
): Promise<DoctorVisit[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('doctor_visits')
    .select('*')
    .eq('user_id', userId)
    .eq('visit_date', visitDate)
    .order('visit_time', { ascending: true })
  if (error) throw error
  return openRows(
    'doctor_visits',
    (data ?? []) as Record<string, unknown>[],
  ) as unknown as DoctorVisit[]
}

export async function insertDoctorVisit(
  userId: string,
  input: DoctorVisitInput,
): Promise<DoctorVisit> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!input.visit_date.trim()) throw new Error('Visit date is required.')

  const sealed = sealRow('doctor_visits', {
    user_id: userId,
    visit_date: input.visit_date.trim(),
    visit_time: input.visit_time.trim() || null,
    appointment_type: input.appointment_type || null,
    provider_name: input.provider_name.trim() || null,
    specialty: input.specialty.trim() || null,
    location: input.location.trim() || null,
    reason: input.reason.trim() || null,
    notes: input.notes.trim() || null,
    follow_up_date: input.follow_up_date.trim() || null,
  })

  const { data, error } = await supabase
    .from('doctor_visits')
    .insert(sealed)
    .select('*')
    .single()

  if (error) throw error
  return openRow('doctor_visits', data as Record<string, unknown>) as unknown as DoctorVisit
}

export async function updateDoctorVisit(
  userId: string,
  visitId: string,
  input: DoctorVisitInput,
): Promise<DoctorVisit> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!input.visit_date.trim()) throw new Error('Visit date is required.')

  const sealed = sealRow('doctor_visits', {
    id: visitId,
    visit_date: input.visit_date.trim(),
    visit_time: input.visit_time.trim() || null,
    appointment_type: input.appointment_type || null,
    provider_name: input.provider_name.trim() || null,
    specialty: input.specialty.trim() || null,
    location: input.location.trim() || null,
    reason: input.reason.trim() || null,
    notes: input.notes.trim() || null,
    follow_up_date: input.follow_up_date.trim() || null,
  })

  const { id: _id, ...payload } = sealed

  const { data, error } = await supabase
    .from('doctor_visits')
    .update(payload)
    .eq('id', visitId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return openRow('doctor_visits', data as Record<string, unknown>) as unknown as DoctorVisit
}

export async function deleteDoctorVisit(userId: string, visitId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('doctor_visits')
    .delete()
    .eq('id', visitId)
    .eq('user_id', userId)
  if (error) throw error
}
