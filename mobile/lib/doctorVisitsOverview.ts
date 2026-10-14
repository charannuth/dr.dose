import type { DoctorVisit } from './doctorVisits'

/** Minutes after midnight for "3:00 PM", "15:00" or "9am"; null if unknown. */
export function visitTimeMinutes(time: string | null | undefined): number | null {
  const m = time?.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function sortKey(v: DoctorVisit): string {
  const mins = visitTimeMinutes(v.visit_time)
  return `${v.visit_date} ${String(mins ?? 24 * 60).padStart(4, '0')}`
}

function dayDiff(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10))
  return Math.round((b - a) / 86400000)
}

/** "Today", "Tomorrow", "In 5 days", "In 3 weeks", "Yesterday", "4 days ago". */
export function relativeVisitDay(date: string, today: string): string {
  const d = dayDiff(today, date)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d > 1) return d < 14 ? `In ${d} days` : d < 60 ? `In ${Math.round(d / 7)} weeks` : `In ${Math.round(d / 30)} months`
  return -d < 14 ? `${-d} days ago` : -d < 60 ? `${Math.round(-d / 7)} weeks ago` : `${Math.round(-d / 30)} months ago`
}

export type FollowUp = { visit: DoctorVisit; date: string }

export type VisitsOverview = {
  /** Soonest visit today or later. */
  next: DoctorVisit | null
  /** Later upcoming visits, soonest first (excludes `next`). */
  upcoming: DoctorVisit[]
  /** Past visits in the last 60 days with no notes yet, newest first. */
  needsNotes: DoctorVisit[]
  /** Past visits, newest first. */
  past: DoctorVisit[]
  /** Follow-ups someone should book: due within 30 days or overdue, with no visit booked on/after the date. */
  followUps: FollowUp[]
}

export function buildVisitsOverview(visits: DoctorVisit[], today: string): VisitsOverview {
  const future = visits.filter((v) => v.visit_date >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const past = visits.filter((v) => v.visit_date < today).sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
  const needsNotes = past.filter((v) => !v.notes?.trim() && dayDiff(v.visit_date, today) <= 60)
  const followUps: FollowUp[] = []
  for (const v of visits) {
    const date = v.follow_up_date
    if (!date) continue
    const inDays = dayDiff(today, date)
    if (inDays > 30 || inDays < -60) continue
    const booked = visits.some((o) => o.id !== v.id && o.visit_date >= v.visit_date && o.visit_date >= addDays(date, -14))
    if (!booked) followUps.push({ visit: v, date })
  }
  followUps.sort((a, b) => a.date.localeCompare(b.date))
  return { next: future[0] ?? null, upcoming: future.slice(1), needsNotes, past, followUps }
}

function addDays(date: string, n: number): string {
  const t = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + n * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

/** Telehealth links open directly; anything else opens in maps. */
export function locationAction(location: string | null | undefined): { kind: 'link' | 'map'; url: string } | null {
  const loc = location?.trim()
  if (!loc) return null
  if (/^https?:\/\//i.test(loc)) return { kind: 'link', url: loc }
  return { kind: 'map', url: `https://maps.apple.com/?q=${encodeURIComponent(loc)}` }
}
