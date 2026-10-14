/**
 * Pure cycle insight helpers (no I/O, no runtime imports) so they can be unit
 * tested directly. All dates are YYYY-MM-DD strings in the user's local day.
 */

export type InsightPeriod = {
  started_on: string
  ended_on: string | null
  cycle_length_days?: number | null
}

export type InsightDayLog = {
  log_date: string
  flow_level?: string | null
  symptoms?: string[]
  symptoms_pre?: string[]
}

export type InsightExtras = {
  moods?: string[]
  painAreas?: string[]
  bodyExtras?: string[]
  pain?: number
}

export type CycleFlag = { id: string; title: string; body: string }

export type CycleInsights = {
  /** Oldest → newest, at most 6, for a small bar chart. */
  cycleLengths: number[]
  avgCycle: number | null
  shortestCycle: number | null
  longestCycle: number | null
  /** Longest minus shortest of the recent cycles. */
  variation: number | null
  regularity: 'regular' | 'variable' | 'irregular' | null
  avgPeriodLength: number | null
  topSymptoms: { label: string; count: number }[]
  flags: CycleFlag[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

export function shiftDate(date: string, days: number): string {
  const t = new Date(toUtc(date) + days * DAY_MS)
  return t.toISOString().slice(0, 10)
}

/** Newest first, using recorded lengths or the gap to the previous start. */
export function cycleLengthsFromPeriods(periods: InsightPeriod[]): number[] {
  const sorted = [...periods].sort((a, b) => b.started_on.localeCompare(a.started_on))
  const out: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (p.cycle_length_days != null) {
      out.push(p.cycle_length_days)
      continue
    }
    const older = sorted[i + 1]
    if (!older) continue
    const days = diffDays(older.started_on, p.started_on)
    if (days >= 15 && days <= 90) out.push(days)
  }
  return out
}

export function periodLengths(periods: InsightPeriod[]): number[] {
  return periods
    .filter((p) => p.ended_on)
    .sort((a, b) => b.started_on.localeCompare(a.started_on))
    .map((p) => diffDays(p.started_on, p.ended_on as string) + 1)
    .filter((n) => n >= 1 && n <= 20)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((s, n) => s + n, 0) / values.length)
}

export type InsightOptions = {
  today: string
  /** Teens' cycles are often 21–45 days in the first years. */
  youngUser?: boolean
  /** Skip the "no period in 90 days" flag (pregnancy, postpartum, menopause, LARC). */
  expectsMissedPeriods?: boolean
}

export function buildCycleInsights(
  periods: InsightPeriod[],
  logs: InsightDayLog[],
  extrasByDate: Record<string, InsightExtras>,
  options: InsightOptions,
): CycleInsights {
  const recent = cycleLengthsFromPeriods(periods).slice(0, 6)
  const avgCycle = average(recent)
  const shortest = recent.length ? Math.min(...recent) : null
  const longest = recent.length ? Math.max(...recent) : null
  const variation = shortest != null && longest != null && recent.length >= 2 ? longest - shortest : null
  let regularity: CycleInsights['regularity'] = null
  if (variation != null && recent.length >= 3) {
    regularity = variation <= 7 ? 'regular' : variation <= 14 ? 'variable' : 'irregular'
  }
  const pLens = periodLengths(periods).slice(0, 6)
  const avgPeriodLength = average(pLens)

  const counts = new Map<string, number>()
  const bump = (label: string) => counts.set(label, (counts.get(label) ?? 0) + 1)
  for (const log of logs) {
    for (const s of new Set([...(log.symptoms ?? []), ...(log.symptoms_pre ?? [])])) bump(s)
  }
  for (const extras of Object.values(extrasByDate)) {
    for (const s of extras.bodyExtras ?? []) bump(s)
    for (const m of extras.moods ?? []) bump(m)
  }
  const topSymptoms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))

  const flags: CycleFlag[] = []
  const minNormal = 21
  const maxNormal = options.youngUser ? 45 : 35
  if (recent.length >= 2) {
    const outOfRange = recent.slice(0, 3).filter((n) => n < minNormal || n > maxNormal)
    if (outOfRange.length >= 2) {
      flags.push({
        id: 'cycle-length',
        title: 'Your cycle length is outside the usual range',
        body: `Two or more recent cycles were shorter than ${minNormal} or longer than ${maxNormal} days. That can happen for lots of reasons (stress, travel, PCOS, thyroid), so it is worth a chat with a clinician.`,
      })
    }
  }
  if (pLens.slice(0, 3).some((n) => n > 7)) {
    flags.push({
      id: 'long-period',
      title: 'A recent period lasted more than 7 days',
      body: 'Long periods are common now and then. If it keeps happening, or you feel tired or dizzy, ask a clinician to check for things like anemia.',
    })
  }
  const heavyDays = logs.filter((l) => l.flow_level === 'heavy').length
  if (heavyDays >= 4) {
    flags.push({
      id: 'heavy',
      title: 'Lots of heavy-flow days logged',
      body: 'Heavy periods are very common and very treatable. A clinician can help, and iron levels are worth checking.',
    })
  }
  const severePainDays = Object.values(extrasByDate).filter((e) => (e.pain ?? 0) >= 7).length
  if (severePainDays >= 3) {
    flags.push({
      id: 'pain',
      title: 'Strong pain on several days',
      body: 'Severe period pain is not something you have to tough out. It can be a sign of conditions like endometriosis, which a clinician can look into.',
    })
  }
  const latestStart = [...periods].sort((a, b) => b.started_on.localeCompare(a.started_on))[0]
  if (
    latestStart &&
    !options.expectsMissedPeriods &&
    !periods.some((p) => !p.ended_on) &&
    diffDays(latestStart.started_on, options.today) > 90
  ) {
    flags.push({
      id: 'missed',
      title: 'No period logged for over 90 days',
      body: 'If you have not just forgotten to log it, a missed period for 3 months is worth checking with a clinician (and a pregnancy test, if that is possible).',
    })
  }

  return {
    cycleLengths: [...recent].reverse(),
    avgCycle,
    shortestCycle: shortest,
    longestCycle: longest,
    variation,
    regularity,
    avgPeriodLength,
    topSymptoms,
    flags,
  }
}

/**
 * Estimated fertile window for the cycle ending at `nextStart`:
 * ovulation ≈ 14 days before the next period; sperm can survive ~5 days.
 */
export function fertileWindow(nextStart: string): { start: string; end: string; ovulation: string } {
  const ovulation = shiftDate(nextStart, -14)
  return { start: shiftDate(ovulation, -5), end: shiftDate(ovulation, 1), ovulation }
}

/** Earliest–latest next start when cycles vary (null when not enough history). */
export function predictionRange(
  lastStart: string | null,
  shortest: number | null,
  longest: number | null,
): { earliest: string; latest: string } | null {
  if (!lastStart || shortest == null || longest == null || longest - shortest < 3) return null
  return { earliest: shiftDate(lastStart, shortest), latest: shiftDate(lastStart, longest) }
}

/** "in 3 days", "tomorrow", "today", "2 days ago". */
export function relativeDayLabel(today: string, date: string): string {
  const d = diffDays(today, date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  return d > 0 ? `in ${d} days` : `${-d} days ago`
}
