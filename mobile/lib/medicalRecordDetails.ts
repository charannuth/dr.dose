/**
 * Structured extras for the medical record (stored as one encrypted JSON
 * column, `medical_records.details`, migration 031). The flat columns stay the
 * source of truth for names (allergy checks read `known_allergies`), and the
 * free-text history columns are kept in sync so the web app still shows them.
 *
 * Pure module so it can be unit tested.
 */

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'anaphylaxis'
export type ConditionStatus = 'active' | 'managed' | 'resolved'

export type AllergyDetail = { reaction?: string; severity?: AllergySeverity }
export type ConditionDetail = { since?: string; status?: ConditionStatus }
export type SurgeryItem = { name: string; year?: string }
export type FamilyItem = { condition: string; relative?: string }
export type VaccineItem = { name: string; date?: string }
export type CareTeamItem = { name: string; role?: string; phone?: string }
export type EmergencyContact = { name?: string; relation?: string; phone?: string }

export type MedicalRecordDetails = {
  allergies: Record<string, AllergyDetail>
  conditions: Record<string, ConditionDetail>
  surgeries: SurgeryItem[]
  family: FamilyItem[]
  vaccines: VaccineItem[]
  careTeam: CareTeamItem[]
  emergencyContact: EmergencyContact
  /** The person confirmed they have no known allergies (NKDA). */
  noKnownAllergies?: boolean
  /** YYYY-MM-DD the person last saved or confirmed the record. */
  reviewedAt?: string
}

export const ALLERGY_SEVERITIES: { id: AllergySeverity; label: string }[] = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
  { id: 'anaphylaxis', label: 'Anaphylaxis' },
]

export const CONDITION_STATUSES: { id: ConditionStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'managed', label: 'Managed' },
  { id: 'resolved', label: 'Resolved' },
]

export const FAMILY_RELATIVES = ['Parent', 'Sibling', 'Grandparent', 'Child', 'Aunt/Uncle', 'Other']
export const CARE_TEAM_ROLES = ['Primary care', 'Specialist', 'Pharmacy', 'Therapist', 'Dentist', 'Other']

export const emptyDetails = (): MedicalRecordDetails => ({
  allergies: {},
  conditions: {},
  surgeries: [],
  family: [],
  vaccines: [],
  careTeam: [],
  emergencyContact: {},
})

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object') : []
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

function oneOf<T extends string>(v: unknown, ids: readonly { id: T }[]): T | undefined {
  return ids.some((o) => o.id === v) ? (v as T) : undefined
}

/** Tolerant reader for whatever is in the column (object, JSON string, null). */
export function parseDetails(raw: unknown): MedicalRecordDetails {
  let source: unknown = raw
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw)
    } catch {
      source = {}
    }
  }
  const o = obj(source)
  const allergies: Record<string, AllergyDetail> = {}
  for (const [name, d] of Object.entries(obj(o.allergies))) {
    const x = obj(d)
    allergies[name] = { reaction: str(x.reaction), severity: oneOf(x.severity, ALLERGY_SEVERITIES) }
  }
  const conditions: Record<string, ConditionDetail> = {}
  for (const [name, d] of Object.entries(obj(o.conditions))) {
    const x = obj(d)
    conditions[name] = { since: str(x.since), status: oneOf(x.status, CONDITION_STATUSES) }
  }
  const ec = obj(o.emergencyContact)
  return {
    allergies,
    conditions,
    surgeries: list(o.surgeries).flatMap((x) => (str(x.name) ? [{ name: str(x.name)!, year: str(x.year) }] : [])),
    family: list(o.family).flatMap((x) =>
      str(x.condition) ? [{ condition: str(x.condition)!, relative: str(x.relative) }] : [],
    ),
    vaccines: list(o.vaccines).flatMap((x) => (str(x.name) ? [{ name: str(x.name)!, date: str(x.date) }] : [])),
    careTeam: list(o.careTeam).flatMap((x) =>
      str(x.name) ? [{ name: str(x.name)!, role: str(x.role), phone: str(x.phone) }] : [],
    ),
    emergencyContact: { name: str(ec.name), relation: str(ec.relation), phone: str(ec.phone) },
    noKnownAllergies: o.noKnownAllergies === true ? true : undefined,
    reviewedAt: str(o.reviewedAt),
  }
}

/** Drop details for allergies/conditions that were removed, and empty rows. */
export function cleanDetails(
  details: MedicalRecordDetails,
  allergyNames: string[],
  conditionNames: string[],
): MedicalRecordDetails {
  const keep = <T,>(m: Record<string, T>, names: string[]) =>
    Object.fromEntries(Object.entries(m).filter(([k]) => names.includes(k)))
  return parseDetails(
    JSON.parse(
      JSON.stringify({
        ...details,
        allergies: keep(details.allergies, allergyNames),
        conditions: keep(details.conditions, conditionNames),
      }),
    ),
  )
}

/** Free-text versions for the legacy columns (web app, older builds). */
export function surgeriesText(items: SurgeryItem[]): string {
  return items.map((s) => (s.year ? `${s.year} — ${s.name}` : s.name)).join('\n')
}
export function familyText(items: FamilyItem[]): string {
  return items.map((f) => (f.relative ? `${f.condition} (${f.relative.toLowerCase()})` : f.condition)).join('\n')
}

export function allergyLabel(name: string, d: AllergyDetail | undefined): string {
  const bits = [d?.reaction, d?.severity ? ALLERGY_SEVERITIES.find((s) => s.id === d.severity)?.label : undefined]
    .filter(Boolean)
    .join(', ')
  return bits ? `${name} (${bits.toLowerCase()})` : name
}

export function conditionLabel(name: string, d: ConditionDetail | undefined): string {
  const bits = [
    d?.status ? CONDITION_STATUSES.find((s) => s.id === d.status)?.label : undefined,
    d?.since ? `since ${d.since}` : undefined,
  ]
    .filter(Boolean)
    .join(', ')
  return bits ? `${name} (${bits.toLowerCase()})` : name
}

export function isSevere(d: AllergyDetail | undefined): boolean {
  return d?.severity === 'severe' || d?.severity === 'anaphylaxis'
}

export type CompletenessItem = { key: string; label: string; done: boolean }

export type CompletenessInput = {
  date_of_birth: string
  blood_type: string
  known_allergies: string[]
  known_conditions: string[]
  past_surgeries: string
  family_history: string
}

/**
 * What a new doctor asks for first. An empty allergy list counts as unknown,
 * not "none", unless the person said so.
 */
export function recordCompleteness(input: CompletenessInput, details: MedicalRecordDetails): CompletenessItem[] {
  const ec = details.emergencyContact
  return [
    { key: 'basics', label: 'Birth date and blood type', done: Boolean(input.date_of_birth && input.blood_type) },
    {
      key: 'allergies',
      label: 'Allergies with reactions',
      done:
        (input.known_allergies.length === 0 && details.noKnownAllergies === true) ||
        (input.known_allergies.length > 0 &&
        input.known_allergies.every((a) => details.allergies[a]?.reaction || details.allergies[a]?.severity)),
    },
    { key: 'conditions', label: 'Conditions', done: input.known_conditions.length > 0 },
    { key: 'history', label: 'Surgeries and family history', done: Boolean(details.surgeries.length || input.past_surgeries.trim()) && Boolean(details.family.length || input.family_history.trim()) },
    { key: 'vaccines', label: 'Vaccinations', done: details.vaccines.length > 0 },
    { key: 'careTeam', label: 'Care team', done: details.careTeam.length > 0 },
    { key: 'emergency', label: 'Emergency contact', done: Boolean(ec.name && ec.phone) },
  ]
}

const DAY_MS = 86_400_000

/** "Reviewed today" / "Reviewed 3 months ago"; stale after ~6 months. */
export function reviewStatus(reviewedAt: string | undefined, today: string): { label: string; stale: boolean } {
  if (!reviewedAt) return { label: 'Not reviewed yet', stale: true }
  const days = Math.round(
    (Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) -
      Date.UTC(+reviewedAt.slice(0, 4), +reviewedAt.slice(5, 7) - 1, +reviewedAt.slice(8, 10))) /
      DAY_MS,
  )
  const stale = days > 182
  if (days <= 0) return { label: 'Reviewed today', stale }
  if (days === 1) return { label: 'Reviewed yesterday', stale }
  if (days < 31) return { label: `Reviewed ${days} days ago`, stale }
  const months = Math.round(days / 30.4)
  if (months < 12) return { label: `Reviewed ${months} month${months === 1 ? '' : 's'} ago`, stale }
  const years = Math.round(days / 365)
  return { label: `Reviewed ${years} year${years === 1 ? '' : 's'} ago`, stale }
}
