/**
 * HRT personalization + the extra day details stored in tracker_day_entries
 * (tracker_id = 'hrt'). Pure data + helpers, no runtime imports.
 */

export type HrtRegimen = 'feminizing' | 'masculinizing' | 'nonbinary' | 'menopause' | 'other'

export type HrtRoute =
  | 'pill'
  | 'sublingual'
  | 'injection_im'
  | 'injection_subq'
  | 'patch'
  | 'gel'
  | 'implant'
  | 'spray'

export type HrtSectionKey =
  | 'dose'
  | 'body'
  | 'mood'
  | 'sideEffects'
  | 'menopause'
  | 'labs'
  | 'measurements'
  | 'milestone'
  | 'notes'

export type HrtPrefs = {
  regimen: HrtRegimen | null
  startDate: string | null
  routes: HrtRoute[]
  /** Injection / patch change interval, for the "next due" countdown. */
  everyDays: number | null
  sections: Record<HrtSectionKey, boolean>
  explainers: boolean
  measurementUnit: 'cm' | 'in'
  configured: boolean
}

export type HrtExtras = {
  administered?: boolean
  route?: string
  site?: string
  siteReaction?: string[]
  mood?: number
  energy?: number
  /** 1 = really uncomfortable in my body … 5 = really at home in my body. */
  bodyComfort?: number
  libido?: string
  sideEffects?: string[]
  menopauseSymptoms?: string[]
  hotFlashes?: number
  labs?: Record<string, string>
  measurements?: Record<string, string>
  milestone?: string
}

export const HRT_REGIMEN_OPTIONS: { value: HrtRegimen; label: string; emoji: string; hint: string }[] = [
  { value: 'feminizing', label: 'Feminizing', emoji: '🌸', hint: 'Estrogen, often with an anti-androgen' },
  { value: 'masculinizing', label: 'Masculinizing', emoji: '🌿', hint: 'Testosterone' },
  { value: 'nonbinary', label: 'Non-binary / microdosing', emoji: '✨', hint: 'Your own mix, your own goals' },
  { value: 'menopause', label: 'Menopause HRT', emoji: '🌙', hint: 'Estrogen, progesterone, or both' },
  { value: 'other', label: 'Other hormones', emoji: '💊', hint: 'Fertility, thyroid, or something else' },
]

export const HRT_ROUTE_OPTIONS: { value: HrtRoute; label: string }[] = [
  { value: 'pill', label: 'Pill' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'injection_im', label: 'Injection (IM)' },
  { value: 'injection_subq', label: 'Injection (SubQ)' },
  { value: 'patch', label: 'Patch' },
  { value: 'gel', label: 'Gel / cream' },
  { value: 'implant', label: 'Implant / pellet' },
  { value: 'spray', label: 'Spray' },
]

export const HRT_SECTION_OPTIONS: {
  key: HrtSectionKey
  label: string
  emoji: string
  explainer: string
}[] = [
  {
    key: 'dose',
    label: 'Dose & site',
    emoji: '💉',
    explainer:
      'Log when you took or applied your dose and where. Rotating injection and patch sites helps your skin heal and keeps absorption steady.',
  },
  {
    key: 'body',
    label: 'Body changes',
    emoji: '🦋',
    explainer:
      'Changes arrive gradually over months and years and everyone is different. Logging small ones makes progress easier to see.',
  },
  {
    key: 'mood',
    label: 'Mood & how you feel',
    emoji: '🌈',
    explainer: 'Hormones can shift emotions, energy and libido. There is no right way to feel.',
  },
  {
    key: 'sideEffects',
    label: 'Side effects',
    emoji: '⚠️',
    explainer:
      'Note anything new. Leg swelling or pain, chest pain, or sudden shortness of breath need urgent care.',
  },
  {
    key: 'menopause',
    label: 'Menopause symptoms',
    emoji: '🌡️',
    explainer: 'Track hot flashes, sleep and comfort to see how well your treatment is working.',
  },
  {
    key: 'labs',
    label: 'Lab results',
    emoji: '🧪',
    explainer:
      'Enter results from blood tests on the day they were taken. Your clinician will tell you which ranges they aim for.',
  },
  {
    key: 'measurements',
    label: 'Measurements',
    emoji: '📏',
    explainer: 'Optional. Some people like tracking body shape changes; skip it if it does not feel good.',
  },
  {
    key: 'milestone',
    label: 'Milestones',
    emoji: '🏁',
    explainer: 'Celebrate the moments that matter to you: a first, a feeling, a change you noticed.',
  },
  { key: 'notes', label: 'Notes', emoji: '📝', explainer: 'Anything else worth remembering.' },
]

const COMMON_BODY = [
  'Skin changes',
  'Sleep changes',
  'Libido changes',
  'Appetite changes',
] as const

const BODY_BY_REGIMEN: Record<HrtRegimen, readonly string[]> = {
  feminizing: [
    'Breast growth / tenderness',
    'Softer skin',
    'Less body hair',
    'Slower facial hair',
    'Fat moving to hips & thighs',
    'Less muscle mass',
    'Fewer spontaneous erections',
    'Smell / taste changes',
  ],
  masculinizing: [
    'Voice deepening / cracking',
    'Facial hair',
    'More body hair',
    'Bottom growth',
    'Periods slowing / stopped',
    'Acne',
    'More muscle',
    'Fat moving to belly',
    'Hairline changes',
    'More sweat / body odor',
  ],
  nonbinary: [
    'Chest / breast changes',
    'Hair growth changes',
    'Voice changes',
    'Fat distribution changes',
    'Muscle / strength changes',
    'Periods changing',
  ],
  menopause: [
    'Fewer hot flashes',
    'Better sleep',
    'Breast tenderness',
    'Spotting / bleeding',
    'Bloating',
    'Vaginal comfort better',
    'Joint aches easing',
  ],
  other: ['Fat distribution changes', 'Hair growth changes', 'Muscle / strength changes', 'Voice changes'],
}

/** Body-change chips for a regimen (common ones last). */
export function bodyChangeOptions(regimen: HrtRegimen | null): string[] {
  const specific = regimen ? BODY_BY_REGIMEN[regimen] : BODY_BY_REGIMEN.nonbinary
  return [...new Set([...specific, ...COMMON_BODY])]
}

export const HRT_SIDE_EFFECT_OPTIONS = [
  'Headache',
  'Nausea',
  'Dizziness',
  'Fatigue',
  'Breast / chest tenderness',
  'Spotting',
  'Acne',
  'Hot flashes',
  'Mood swings',
  'Injection site pain',
  'Patch / gel irritation',
  'High blood pressure',
  'Leg swelling or pain',
  'Chest pain / short of breath',
] as const

export const URGENT_SIDE_EFFECTS = ['Leg swelling or pain', 'Chest pain / short of breath'] as const

export const SITE_REACTION_OPTIONS = ['None', 'Redness', 'Soreness', 'Bruising', 'Lump', 'Itching'] as const

export const HRT_MENOPAUSE_OPTIONS = [
  'Hot flashes',
  'Night sweats',
  'Trouble sleeping',
  'Brain fog',
  'Vaginal dryness',
  'Joint aches',
  'Heart racing',
  'Mood swings',
] as const

export const HRT_LIBIDO_OPTIONS = ['Low', 'Normal', 'High'] as const

const INJECTION_SITES = [
  'Left thigh',
  'Right thigh',
  'Left belly',
  'Right belly',
  'Left glute',
  'Right glute',
  'Left arm',
  'Right arm',
]
const PATCH_SITES = ['Left belly', 'Right belly', 'Left hip', 'Right hip', 'Left buttock', 'Right buttock']
const GEL_SITES = ['Arms / shoulders', 'Thighs', 'Belly']

export function siteOptionsForRoute(route: string | undefined): string[] {
  if (route === 'injection_im' || route === 'injection_subq') return INJECTION_SITES
  if (route === 'patch') return PATCH_SITES
  if (route === 'gel' || route === 'spray') return GEL_SITES
  return []
}

export type LabField = { key: string; label: string; unit: string }

const LAB_FIELDS: Record<string, LabField> = {
  estradiol: { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL' },
  testosterone: { key: 'testosterone', label: 'Testosterone', unit: 'ng/dL' },
  prolactin: { key: 'prolactin', label: 'Prolactin', unit: 'ng/mL' },
  potassium: { key: 'potassium', label: 'Potassium', unit: 'mmol/L' },
  hematocrit: { key: 'hematocrit', label: 'Hematocrit', unit: '%' },
  hemoglobin: { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  fsh: { key: 'fsh', label: 'FSH', unit: 'IU/L' },
  progesterone: { key: 'progesterone', label: 'Progesterone', unit: 'ng/mL' },
  tsh: { key: 'tsh', label: 'TSH', unit: 'mIU/L' },
}

export function labFieldsForRegimen(regimen: HrtRegimen | null): LabField[] {
  const keys: Record<HrtRegimen, string[]> = {
    feminizing: ['estradiol', 'testosterone', 'prolactin', 'potassium'],
    masculinizing: ['testosterone', 'estradiol', 'hematocrit', 'hemoglobin'],
    nonbinary: ['estradiol', 'testosterone', 'hematocrit'],
    menopause: ['estradiol', 'fsh', 'progesterone'],
    other: ['estradiol', 'testosterone', 'progesterone', 'tsh'],
  }
  return (regimen ? keys[regimen] : keys.nonbinary).map((k) => LAB_FIELDS[k])
}

export function labLabel(key: string): string {
  const f = LAB_FIELDS[key]
  return f ? `${f.label} (${f.unit})` : key
}

export const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest / bust' },
  { key: 'underbust', label: 'Underbust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
] as const

export function recommendedHrtSections(regimen: HrtRegimen | null): Record<HrtSectionKey, boolean> {
  return {
    dose: true,
    body: true,
    mood: true,
    sideEffects: true,
    menopause: regimen === 'menopause',
    labs: true,
    measurements: false,
    milestone: regimen !== 'menopause',
    notes: true,
  }
}

export function defaultHrtPrefs(): HrtPrefs {
  return {
    regimen: null,
    startDate: null,
    routes: [],
    everyDays: null,
    sections: recommendedHrtSections(null),
    explainers: false,
    measurementUnit: 'cm',
    configured: false,
  }
}

export function normalizeHrtPrefs(raw: Record<string, unknown>): HrtPrefs {
  const base = defaultHrtPrefs()
  const regimen = HRT_REGIMEN_OPTIONS.some((o) => o.value === raw.regimen)
    ? (raw.regimen as HrtRegimen)
    : null
  const routes = Array.isArray(raw.routes)
    ? (raw.routes.filter((r) => HRT_ROUTE_OPTIONS.some((o) => o.value === r)) as HrtRoute[])
    : []
  const recommended = recommendedHrtSections(regimen)
  const rawSections =
    raw.sections && typeof raw.sections === 'object' ? (raw.sections as Record<string, unknown>) : {}
  const sections = {} as Record<HrtSectionKey, boolean>
  for (const { key } of HRT_SECTION_OPTIONS) {
    sections[key] = typeof rawSections[key] === 'boolean' ? (rawSections[key] as boolean) : recommended[key]
  }
  const every = Number(raw.everyDays)
  return {
    regimen,
    startDate:
      typeof raw.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate) ? raw.startDate : null,
    routes,
    everyDays: Number.isFinite(every) && every >= 1 && every <= 120 ? Math.round(every) : null,
    sections,
    explainers: typeof raw.explainers === 'boolean' ? raw.explainers : base.explainers,
    measurementUnit: raw.measurementUnit === 'in' ? 'in' : 'cm',
    configured: raw.configured === true,
  }
}

function scale(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : undefined
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const l = value.map(String).filter(Boolean)
  return l.length ? l : undefined
}

function record(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const s = v == null ? '' : String(v).trim()
    if (s) out[k] = s
  }
  return Object.keys(out).length ? out : undefined
}

export function normalizeHrtExtras(raw: Record<string, unknown>): HrtExtras {
  const hot = Number(raw.hotFlashes)
  const out: HrtExtras = {
    administered: raw.administered === true ? true : undefined,
    route: typeof raw.route === 'string' && raw.route ? raw.route : undefined,
    site: typeof raw.site === 'string' && raw.site ? raw.site : undefined,
    siteReaction: strings(raw.siteReaction),
    mood: scale(raw.mood),
    energy: scale(raw.energy),
    bodyComfort: scale(raw.bodyComfort),
    libido: typeof raw.libido === 'string' && raw.libido ? raw.libido : undefined,
    sideEffects: strings(raw.sideEffects),
    menopauseSymptoms: strings(raw.menopauseSymptoms),
    hotFlashes: Number.isFinite(hot) && hot > 0 ? Math.min(50, Math.round(hot)) : undefined,
    labs: record(raw.labs),
    measurements: record(raw.measurements),
    milestone: typeof raw.milestone === 'string' && raw.milestone.trim() ? raw.milestone.trim() : undefined,
  }
  for (const key of Object.keys(out) as (keyof HrtExtras)[]) {
    if (out[key] === undefined) delete out[key]
  }
  return out
}

const DAY_MS = 24 * 60 * 60 * 1000
function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}
function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}
function shiftDate(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/** "Day 1" on the start date. Null before the start or with no start date. */
export function daysOnHrt(startDate: string | null, today: string): number | null {
  if (!startDate) return null
  const d = diffDays(startDate, today)
  return d < 0 ? null : d + 1
}

/** Friendly duration: "3 weeks", "5 months", "1 year 2 months". */
export function hrtDurationLabel(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
  if (days < 60) return `${Math.floor(days / 7)} weeks`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return `${years} year${years === 1 ? '' : 's'}${rest ? ` ${rest} month${rest === 1 ? '' : 's'}` : ''}`
}

/** Next anniversary-style milestone (1, 3, 6 months, then yearly). */
export function nextHrtMilestone(
  startDate: string | null,
  today: string,
): { label: string; date: string; inDays: number } | null {
  if (!startDate) return null
  const marks: { label: string; days: number }[] = [
    { label: '1 month', days: 30 },
    { label: '3 months', days: 91 },
    { label: '6 months', days: 182 },
  ]
  for (let y = 1; y <= 30; y++) marks.push({ label: `${y} year${y === 1 ? '' : 's'}`, days: Math.round(y * 365.25) })
  const elapsed = diffDays(startDate, today)
  const next = marks.find((m) => m.days >= elapsed)
  if (!next) return null
  return { label: next.label, date: shiftDate(startDate, next.days), inDays: next.days - elapsed }
}

type DatedExtras = { log_date: string; data: HrtExtras }

/** Most recent day a dose/injection/patch change was logged (on or before today). */
export function lastAdministered(entries: DatedExtras[], today: string): DatedExtras | null {
  const done = entries
    .filter((e) => e.log_date <= today && (e.data.administered || e.data.site))
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
  return done[0] ?? null
}

export function nextDoseDue(
  entries: DatedExtras[],
  everyDays: number | null,
  today: string,
): { date: string; inDays: number } | null {
  if (!everyDays) return null
  const last = lastAdministered(entries, today)
  if (!last) return null
  const date = shiftDate(last.log_date, everyDays)
  return { date, inDays: diffDays(today, date) }
}

/** Least recently used site for the route (never-used sites first, in list order). */
export function suggestNextSite(entries: DatedExtras[], route: string | undefined): string | null {
  const options = siteOptionsForRoute(route)
  if (options.length === 0) return null
  const lastUsed = new Map<string, string>()
  for (const e of entries) {
    if (e.data.site && options.includes(e.data.site)) {
      const prev = lastUsed.get(e.data.site)
      if (!prev || e.log_date > prev) lastUsed.set(e.data.site, e.log_date)
    }
  }
  const unused = options.find((o) => !lastUsed.has(o))
  if (unused) return unused
  return [...lastUsed.entries()].sort((a, b) => a[1].localeCompare(b[1]))[0]?.[0] ?? null
}

/** Lab history newest first: [{date, key, value}] */
export function labHistory(entries: DatedExtras[]): { date: string; key: string; value: string }[] {
  const out: { date: string; key: string; value: string }[] = []
  for (const e of entries) {
    for (const [key, value] of Object.entries(e.data.labs ?? {})) out.push({ date: e.log_date, key, value })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
}
