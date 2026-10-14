/**
 * Declarative tracker engine. Every tracker beyond cycle / HRT / weight /
 * medication progress is a `TrackerDef`: setup questions, goal chips,
 * sections of fields, a hero summary, safety flags and insight fields.
 * Data lives in tracker_day_entries (one JSON object per day) and the user's
 * choices in tracker_preferences, so adding a tracker needs no migration.
 *
 * Pure module (type-only imports) so it can be unit tested directly.
 */

import type { TrackerAccent } from './catalog'

export type Entry = Record<string, unknown>

export type Opt = string | { value: string; label?: string; emoji?: string; hint?: string }

export type GenericPrefs = {
  goals: string[]
  sections: Record<string, boolean>
  /** Answers to the tracker's setup questions (due date, units, …). */
  setup: Record<string, unknown>
  /** User-added chip options per field id. */
  customOptions: Record<string, string[]>
  explainers: boolean
  configured: boolean
  /** Only used by the custom tracker. */
  customFields: CustomFieldDef[]
}

export type FieldCtx = { data: Entry; prefs: GenericPrefs }

type FieldBase = {
  id: string
  label: string
  hint?: string
  showIf?: (ctx: FieldCtx) => boolean
}

export type FieldDef =
  | (FieldBase & { type: 'chips'; options: Opt[]; allowCustom?: boolean })
  | (FieldBase & { type: 'choice'; options: Opt[] })
  | (FieldBase & {
      type: 'scale'
      min: number
      max: number
      low: string
      high: string
      emojis?: string[]
    })
  | (FieldBase & {
      type: 'number'
      unit?: string | ((prefs: GenericPrefs) => string)
      placeholder?: string
      decimal?: boolean
    })
  | (FieldBase & { type: 'toggle' })
  | (FieldBase & { type: 'stepper'; max?: number; unit?: string })
  | (FieldBase & { type: 'time'; placeholder?: string })
  | (FieldBase & { type: 'date' })
  | (FieldBase & { type: 'text'; multiline?: boolean; placeholder?: string })

export type SectionDef = {
  key: string
  label: string
  emoji: string
  accent: TrackerAccent
  explainer?: string
  fields: FieldDef[]
  /** On by default? A function receives the user's goals. Default true. */
  defaultOn?: boolean | ((goals: string[], setup: Record<string, unknown>) => boolean)
  /** Collapsed by default (e.g. private sections). */
  collapsed?: boolean
}

export type GoalOpt = { value: string; label: string; emoji: string; hint?: string }

export type HeroInfo = {
  center: string
  caption: string
  title: string
  subtitle?: string | null
  pills?: string[]
  progress?: number | null
}

export type FlagTone = 'info' | 'warn' | 'urgent'
export type Flag = { id: string; tone: FlagTone; title?: string; body: string }

export type TrackerCtx = {
  prefs: GenericPrefs
  /** All loaded entries, oldest first (selected day excluded when it is being edited). */
  history: { log_date: string; data: Entry }[]
  /** The draft for the selected day. */
  day: Entry
  date: string
  today: string
}

export type TrackerDef = {
  id: string
  label: string
  emoji: string
  accent: TrackerAccent
  category: TrackerCategory
  description: string
  /** Shown once at the top of the panel. */
  intro: string
  disclaimer?: string
  goals: GoalOpt[]
  setup?: FieldDef[]
  sections: SectionDef[]
  /** Custom tracker: sections come from the user's own fields. */
  dynamicSections?: (prefs: GenericPrefs) => SectionDef[]
  hero?: (ctx: TrackerCtx) => HeroInfo
  flags?: (ctx: TrackerCtx) => Flag[]
  /** Field ids summarized in "Your patterns". */
  insightFields?: string[]
  /** Short calendar / summary label for a logged day. */
  dayLabel?: (data: Entry, prefs: GenericPrefs) => string | null
}

export type TrackerCategory = 'cycle' | 'body' | 'mind' | 'family' | 'everyday' | 'custom'

export const CATEGORY_LABELS: Record<TrackerCategory, string> = {
  cycle: 'Cycle, hormones & identity',
  body: 'Body & symptoms',
  mind: 'Mind & rest',
  family: 'Pregnancy, fertility & parenting',
  everyday: 'Everyday habits',
  custom: 'Make your own',
}

export type CustomFieldType = 'scale' | 'number' | 'toggle' | 'chips' | 'choice' | 'text' | 'stepper'

export type CustomFieldDef = {
  id: string
  label: string
  type: CustomFieldType
  unit?: string
  options?: string[]
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export function optValue(o: Opt): string {
  return typeof o === 'string' ? o : o.value
}

export function optLabel(o: Opt): string {
  return typeof o === 'string' ? o : o.label ?? o.value
}

export function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : []
}

export function has(v: unknown, value: string): boolean {
  return list(v).includes(value)
}

// ---------------------------------------------------------------------------
// Dates (local YYYY-MM-DD strings)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}
export function shiftDate(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10)
}
export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** "23:30" → minutes after midnight. */
export function parseClock(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Hours between a bedtime and a wake time (crossing midnight if needed). */
export function hoursBetweenClock(start: unknown, end: unknown): number | null {
  const a = parseClock(start)
  const b = parseClock(end)
  if (a == null || b == null) return null
  const mins = b >= a ? b - a : b + 24 * 60 - a
  return Math.round((mins / 60) * 10) / 10
}

// ---------------------------------------------------------------------------
// Prefs + entries
// ---------------------------------------------------------------------------

export function sectionsFor(def: TrackerDef, prefs: Partial<GenericPrefs>): SectionDef[] {
  if (!def.dynamicSections) return def.sections
  const full: GenericPrefs = {
    goals: [],
    sections: {},
    setup: {},
    customOptions: {},
    explainers: true,
    configured: false,
    customFields: [],
    ...prefs,
  }
  return [...def.dynamicSections(full), ...def.sections]
}

export function recommendedSectionsFor(
  def: TrackerDef,
  goals: string[],
  setup: Record<string, unknown>,
  customFields: CustomFieldDef[] = [],
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const s of sectionsFor(def, { customFields, setup, goals })) {
    const d = s.defaultOn
    out[s.key] = d == null ? true : typeof d === 'function' ? d(goals, setup) : d
  }
  return out
}

function normalizeCustomFields(raw: unknown): CustomFieldDef[] {
  if (!Array.isArray(raw)) return []
  const types: CustomFieldType[] = ['scale', 'number', 'toggle', 'chips', 'choice', 'text', 'stepper']
  const out: CustomFieldDef[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const label = str(o.label)
    const type = types.includes(o.type as CustomFieldType) ? (o.type as CustomFieldType) : null
    const id = str(o.id)
    if (!label || !type || !id) continue
    out.push({ id, label, type, unit: str(o.unit), options: list(o.options).slice(0, 20) })
  }
  return out.slice(0, 30)
}

export function normalizeGenericPrefs(def: TrackerDef, raw: Record<string, unknown>): GenericPrefs {
  const goals = list(raw.goals).filter((g) => def.goals.some((o) => o.value === g))
  const setup = raw.setup && typeof raw.setup === 'object' && !Array.isArray(raw.setup)
    ? (raw.setup as Record<string, unknown>)
    : {}
  const customFields = normalizeCustomFields(raw.customFields)
  const recommended = recommendedSectionsFor(def, goals, setup, customFields)
  const rawSections =
    raw.sections && typeof raw.sections === 'object' ? (raw.sections as Record<string, unknown>) : {}
  const sections: Record<string, boolean> = {}
  for (const key of Object.keys(recommended)) {
    sections[key] = typeof rawSections[key] === 'boolean' ? (rawSections[key] as boolean) : recommended[key]
  }
  const customOptions: Record<string, string[]> = {}
  if (raw.customOptions && typeof raw.customOptions === 'object') {
    for (const [k, v] of Object.entries(raw.customOptions as Record<string, unknown>)) {
      const l = [...new Set(list(v))].slice(0, 40)
      if (l.length) customOptions[k] = l
    }
  }
  return {
    goals,
    sections,
    setup,
    customOptions,
    // On by default: explainers carry the safety notes (binding limits, kick counts…).
    explainers: raw.explainers !== false,
    configured: raw.configured === true,
    customFields,
  }
}

/** Drop empty values and unchecked toggles before saving. */
export function compactGenericEntry(data: Entry): Entry {
  const out: Entry = {}
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === false) continue
    if (typeof v === 'string' && !v.trim()) continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    out[k] = typeof v === 'string' ? v.trim() : v
  }
  return out
}

export function entryHasData(data: Entry | undefined): boolean {
  return Boolean(data && Object.keys(compactGenericEntry(data)).length > 0)
}

export function fieldUnit(field: FieldDef, prefs: GenericPrefs): string | undefined {
  if (field.type === 'number') return typeof field.unit === 'function' ? field.unit(prefs) : field.unit
  if (field.type === 'stepper') return field.unit
  return undefined
}

/** One-line summary of a section's values for its collapsed header. */
export function summarizeFields(fields: FieldDef[], data: Entry, prefs: GenericPrefs): string | null {
  const parts: string[] = []
  for (const f of fields) {
    const v = data[f.id]
    if (v == null || v === '' || v === false) continue
    if (Array.isArray(v)) {
      if (v.length) parts.push(v.length > 2 ? `${v.slice(0, 2).join(', ')} +${v.length - 2}` : v.join(', '))
    } else if (v === true) {
      parts.push(f.label)
    } else if (f.type === 'scale') {
      parts.push(`${f.label} ${String(v)}/${f.max}`)
    } else if (f.type === 'number' || f.type === 'stepper') {
      const unit = fieldUnit(f, prefs)
      parts.push(`${f.label} ${String(v)}${unit ? ` ${unit}` : ''}`)
    } else if (f.type === 'choice') {
      const o = f.options.find((x) => optValue(x) === v)
      parts.push(o ? optLabel(o) : String(v))
    } else {
      parts.push(String(v))
    }
    if (parts.length >= 3) break
  }
  return parts.length ? parts.join(' · ') : null
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export type FieldInsight =
  | { id: string; label: string; kind: 'counts'; top: { value: string; count: number }[] }
  | { id: string; label: string; kind: 'average'; avg: number; recent: number | null; previous: number | null; unit?: string }
  | { id: string; label: string; kind: 'days'; days: number }

export function buildFieldInsights(
  def: TrackerDef,
  prefs: GenericPrefs,
  entries: { log_date: string; data: Entry }[],
  today: string,
  windowDays = 30,
): { loggedDays: number; streak: number; fields: FieldInsight[] } {
  const from = shiftDate(today, -(windowDays - 1))
  const recent = entries.filter((e) => e.log_date >= from && e.log_date <= today && entryHasData(e.data))
  const logged = new Set(recent.map((e) => e.log_date))
  let streak = 0
  let cursor = logged.has(today) ? today : shiftDate(today, -1)
  while (logged.has(cursor)) {
    streak++
    cursor = shiftDate(cursor, -1)
  }
  const allFields = sectionsFor(def, prefs).flatMap((s) => s.fields)
  const ids = def.insightFields ?? allFields.filter((f) => f.type === 'scale').map((f) => f.id)
  const fields: FieldInsight[] = []
  for (const id of ids) {
    const f = allFields.find((x) => x.id === id)
    if (!f) continue
    if (f.type === 'chips' || f.type === 'choice') {
      const counts = new Map<string, number>()
      for (const e of recent) {
        const v = e.data[id]
        for (const x of Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : []) {
          counts.set(x, (counts.get(x) ?? 0) + 1)
        }
      }
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }))
      if (top.length) fields.push({ id, label: f.label, kind: 'counts', top })
    } else if (f.type === 'scale' || f.type === 'number' || f.type === 'stepper') {
      const vals = recent
        .map((e) => ({ d: e.log_date, n: num(e.data[id]) }))
        .filter((x): x is { d: string; n: number } => x.n != null)
      if (!vals.length) continue
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10 : null)
      const week = shiftDate(today, -6)
      const prevWeek = shiftDate(today, -13)
      fields.push({
        id,
        label: f.label,
        kind: 'average',
        avg: avg(vals.map((v) => v.n)) as number,
        recent: avg(vals.filter((v) => v.d >= week).map((v) => v.n)),
        previous: avg(vals.filter((v) => v.d >= prevWeek && v.d < week).map((v) => v.n)),
        unit: fieldUnit(f, prefs),
      })
    } else if (f.type === 'toggle') {
      const days = recent.filter((e) => e.data[id] === true).length
      if (days) fields.push({ id, label: f.label, kind: 'days', days })
    }
  }
  return { loggedDays: logged.size, streak, fields }
}

/** Default hero: streak + logged days this month. */
export function defaultHero(def: TrackerDef, ctx: TrackerCtx): HeroInfo {
  const all = [...ctx.history]
  if (entryHasData(ctx.day)) all.push({ log_date: ctx.date, data: ctx.day })
  const { loggedDays, streak } = buildFieldInsights(def, ctx.prefs, all, ctx.today)
  return {
    center: String(streak),
    caption: streak === 1 ? 'day streak' : 'day streak',
    title: loggedDays ? `${loggedDays} day${loggedDays === 1 ? '' : 's'} logged this month` : `Start your ${def.label.toLowerCase()} log`,
    subtitle: loggedDays ? 'Patterns get clearer the more you log. Missing days is fine.' : def.intro,
    progress: Math.min(1, loggedDays / 30),
  }
}

/** Entries within the last `days` days (inclusive of today). */
export function recentEntries(ctx: TrackerCtx, days: number): { log_date: string; data: Entry }[] {
  const from = shiftDate(ctx.today, -(days - 1))
  const all = ctx.history.filter((e) => e.log_date >= from && e.log_date !== ctx.date)
  if (ctx.date >= from && ctx.date <= ctx.today) all.push({ log_date: ctx.date, data: ctx.day })
  return all
}

export function slugId(label: string, taken: string[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'field'
  let id = `c_${base}`
  let i = 2
  while (taken.includes(id)) id = `c_${base}_${i++}`
  return id
}
