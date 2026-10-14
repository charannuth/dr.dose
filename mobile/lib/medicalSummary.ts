/**
 * The "who I am medically" summary a doctor reads first: basics, allergies,
 * conditions, current medications, history, care team and emergency contact.
 * Used by the Medical records page and as the first section of the doctor
 * report. Pure (type-only imports) so it can be unit tested.
 */

import type { DoctorVisit } from './doctorVisits'
import {
  allergyLabel,
  conditionLabel,
  isSevere,
  type CareTeamItem,
  type MedicalRecordDetails,
} from './medicalRecordDetails'

export type SummaryMedication = { name: string; dose: string; schedule: string }

export type MedicalSummaryInput = {
  name?: string
  ageYears: number | null
  dateOfBirth: string
  sex: string | null
  heightLabel: string | null
  weightLabel: string | null
  bloodType: string
  allergies: string[]
  conditions: string[]
  pastSurgeriesText: string
  familyHistoryText: string
  emergencyNotes: string
  otherNotes: string
  details: MedicalRecordDetails
  medications: SummaryMedication[]
  visits: DoctorVisit[]
  today: string
}

export type CareTeamEntry = CareTeamItem & { fromVisits?: boolean; lastSeen?: string }

/** Care team the person entered, plus providers from logged visits not already listed. */
export function buildCareTeam(entered: CareTeamItem[], visits: DoctorVisit[], today: string): CareTeamEntry[] {
  const out: CareTeamEntry[] = entered.map((c) => ({ ...c }))
  const known = new Set(entered.map((c) => c.name.trim().toLowerCase()))
  const seen = new Map<string, CareTeamEntry>()
  for (const v of [...visits].sort((a, b) => b.visit_date.localeCompare(a.visit_date))) {
    const name = v.provider_name?.trim()
    if (!name || v.visit_date > today) continue
    const key = name.toLowerCase()
    if (known.has(key) || seen.has(key)) continue
    seen.set(key, { name, role: v.specialty?.trim() || undefined, fromVisits: true, lastSeen: v.visit_date })
  }
  return [...out, ...seen.values()]
}

/** Allergies with severe/anaphylaxis first, so they're seen first. */
export function sortedAllergies(names: string[], details: MedicalRecordDetails): string[] {
  return [...names].sort((a, b) => Number(isSevere(details.allergies[b])) - Number(isSevere(details.allergies[a])))
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const li = (items: string[], empty: string) =>
  items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : `<p><em>${empty}</em></p>`

/** HTML section for the doctor report (styles come from the report shell). */
export function buildMedicalHistoryHtml(s: MedicalSummaryInput): string {
  const d = s.details
  const basics = [
    s.ageYears != null ? `Age ${s.ageYears}` : null,
    s.dateOfBirth ? `DOB ${escapeHtml(fmtDate(s.dateOfBirth))}` : null,
    s.sex ? escapeHtml(s.sex) : null,
    s.heightLabel ? `Height ${escapeHtml(s.heightLabel)}` : null,
    s.weightLabel ? `Weight ${escapeHtml(s.weightLabel)}` : null,
    s.bloodType && s.bloodType !== 'unknown' ? `Blood type ${escapeHtml(s.bloodType)}` : null,
  ].filter(Boolean)

  const allergies = sortedAllergies(s.allergies, d).map((a) => {
    const label = escapeHtml(allergyLabel(a, d.allergies[a]))
    return isSevere(d.allergies[a]) ? `<strong>${label}</strong>` : label
  })
  const allergyBlock = allergies.length
    ? li(allergies, '')
    : d.noKnownAllergies
      ? '<p><strong>No known allergies.</strong></p>'
      : '<p><em>Not recorded.</em></p>'

  const conditions = s.conditions.map((c) => escapeHtml(conditionLabel(c, d.conditions[c])))
  const meds = s.medications.map(
    (m) => `${escapeHtml(m.name)}${m.dose ? ` — ${escapeHtml(m.dose)}` : ''}${m.schedule ? ` <span class="meta">(${escapeHtml(m.schedule)})</span>` : ''}`,
  )
  const surgeries = d.surgeries.length
    ? d.surgeries.map((x) => escapeHtml(x.year ? `${x.year}: ${x.name}` : x.name))
    : s.pastSurgeriesText.trim()
      ? s.pastSurgeriesText.split('\n').filter((l) => l.trim()).map(escapeHtml)
      : []
  const family = d.family.length
    ? d.family.map((x) => escapeHtml(x.relative ? `${x.condition} (${x.relative.toLowerCase()})` : x.condition))
    : s.familyHistoryText.trim()
      ? s.familyHistoryText.split('\n').filter((l) => l.trim()).map(escapeHtml)
      : []
  const vaccines = d.vaccines.map((v) => escapeHtml(v.date ? `${v.name}: ${fmtDate(v.date)}` : v.name))
  const team = buildCareTeam(d.careTeam, s.visits, s.today).map((c) =>
    [
      `<strong>${escapeHtml(c.name)}</strong>`,
      c.role ? escapeHtml(c.role) : null,
      c.phone ? escapeHtml(c.phone) : null,
      c.lastSeen ? `last seen ${escapeHtml(fmtDate(c.lastSeen))}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  )
  const ec = d.emergencyContact
  const emergency = [
    ec.name ? `Contact: <strong>${escapeHtml(ec.name)}</strong>${ec.relation ? ` (${escapeHtml(ec.relation)})` : ''}${ec.phone ? ` · ${escapeHtml(ec.phone)}` : ''}` : null,
    s.emergencyNotes.trim() ? escapeHtml(s.emergencyNotes.trim()) : null,
  ].filter((x): x is string => Boolean(x))

  return `
  <h2>Medical history</h2>
  <p class="meta">${basics.join(' · ') || 'Basics not recorded'}${d.reviewedAt ? ` · Record last reviewed ${escapeHtml(fmtDate(d.reviewedAt))}` : ''}</p>
  <h3>Allergies</h3>
  ${allergyBlock}
  <h3>Conditions</h3>
  ${li(conditions, 'None recorded.')}
  <h3>Current medications</h3>
  ${li(meds, 'None listed.')}
  <h3>Surgeries &amp; hospitalizations</h3>
  ${li(surgeries, 'None recorded.')}
  <h3>Family history</h3>
  ${li(family, 'None recorded.')}
  <h3>Vaccinations</h3>
  ${li(vaccines, 'None recorded.')}
  <h3>Care team</h3>
  ${li(team, 'None recorded.')}
  ${emergency.length ? `<h3>Emergency</h3>${li(emergency, '')}` : ''}
  ${s.otherNotes.trim() ? `<h3>Other notes</h3><p>${escapeHtml(s.otherNotes.trim())}</p>` : ''}`
}
