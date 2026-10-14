/**
 * Glanceable summary for the Wellness page: three weekly numbers with a
 * 7-day series each, and a ranked list of plain-language insights so the
 * page can show only the most useful one.
 *
 * Pure module (type-only imports from wellness/prnInsights) so it can be unit tested.
 */

import type { PrnInsightsSummary } from './prnInsights'
import type { WellnessLog } from './wellness'

export type WeekStat = {
  key: 'sleep' | 'energy' | 'logged'
  label: string
  /** Display value, e.g. "7.2h", "3.8/5", "5/7". */
  value: string
  /** Oldest → newest, null where nothing was logged. */
  series: (number | null)[]
  /** Max of the series scale (for sparkline heights). */
  max: number
  /** Change vs the week before; null when either week has no data. */
  delta: number | null
  unit: string
}

export type WellnessInsight = {
  id: string
  emoji: string
  text: string
  tone: 'good' | 'neutral' | 'watch'
  /** Higher shows first. */
  weight: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Oldest → newest. */
function window(today: string, days: number, offset = 0): string[] {
  return Array.from({ length: days }, (_, i) => shift(today, -(offset + days - 1 - i)))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function avg(values: number[]): number | null {
  return values.length ? round1(values.reduce((s, n) => s + n, 0) / values.length) : null
}

function filled(log: WellnessLog | undefined): log is WellnessLog {
  return Boolean(
    log &&
      (log.sleep_hours != null ||
        log.sleep_quality != null ||
        log.energy_level != null ||
        log.appetite != null ||
        log.exercised ||
        log.exercise_minutes != null ||
        (log.symptoms?.length ?? 0) > 0 ||
        Boolean(log.notes?.trim())),
  )
}

export function buildWeekStats(logs: WellnessLog[], today: string): WeekStat[] {
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  const week = window(today, 7)
  const prior = window(today, 7, 7)
  const pick = (dates: string[], f: (l: WellnessLog) => number | null) =>
    dates.map((d) => {
      const l = byDate.get(d)
      return filled(l) ? f(l) : null
    })
  const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x != null)
  const delta = (a: number | null, b: number | null) => (a != null && b != null ? round1(a - b) : null)

  const sleep = pick(week, (l) => l.sleep_hours)
  const sleepAvg = avg(nums(sleep))
  const sleepPrior = avg(nums(pick(prior, (l) => l.sleep_hours)))

  const energy = pick(week, (l) => l.energy_level)
  const energyAvg = avg(nums(energy))
  const energyPrior = avg(nums(pick(prior, (l) => l.energy_level)))

  const logged = week.map((d) => (filled(byDate.get(d)) ? 1 : 0))
  const loggedCount = logged.reduce<number>((s, n) => s + n, 0)
  const loggedPrior = prior.filter((d) => filled(byDate.get(d))).length

  return [
    {
      key: 'sleep',
      label: 'Sleep',
      value: sleepAvg != null ? `${sleepAvg}h` : '—',
      series: sleep,
      max: 10,
      delta: delta(sleepAvg, sleepPrior),
      unit: 'h',
    },
    {
      key: 'energy',
      label: 'Energy',
      value: energyAvg != null ? `${energyAvg}/5` : '—',
      series: energy,
      max: 5,
      delta: delta(energyAvg, energyPrior),
      unit: '',
    },
    {
      key: 'logged',
      label: 'Logged',
      value: `${loggedCount}/7`,
      series: logged.map((n) => (n ? 1 : null)),
      max: 1,
      delta: loggedPrior || loggedCount ? loggedCount - loggedPrior : null,
      unit: ' days',
    },
  ]
}

/** Compare a number between two groups of days; null unless both groups have ≥2 values. */
function splitAverage(
  logs: WellnessLog[],
  inGroup: (l: WellnessLog) => boolean,
  value: (l: WellnessLog) => number | null,
): { yes: number; no: number } | null {
  const yes: number[] = []
  const no: number[] = []
  for (const l of logs) {
    const v = value(l)
    if (v == null) continue
    ;(inGroup(l) ? yes : no).push(v)
  }
  if (yes.length < 2 || no.length < 2) return null
  return { yes: avg(yes) as number, no: avg(no) as number }
}

/**
 * Every insight the last 14 days support, most useful first. Thresholds are
 * deliberately conservative so the top line is worth reading.
 */
export function buildWellnessInsights(
  logs: WellnessLog[],
  prn: PrnInsightsSummary | null,
  today: string,
): WellnessInsight[] {
  const from = shift(today, -13)
  const recent = logs.filter((l) => l.log_date >= from && l.log_date <= today && filled(l))
  const out: WellnessInsight[] = []

  for (const med of prn?.meds ?? []) {
    if (med.daysAtMax > 0) {
      out.push({
        id: `prn-max-${med.medicationId}`,
        emoji: '⚠️',
        tone: 'watch',
        weight: 100 + med.daysAtMax,
        text: `You reached the daily limit for ${med.medicationName} on ${med.daysAtMax} day${med.daysAtMax === 1 ? '' : 's'} in the last 2 weeks. Worth mentioning to your clinician.`,
      })
    } else if (med.totalDoses14d >= 3 && med.overlappingSymptoms.length) {
      out.push({
        id: `prn-sym-${med.medicationId}`,
        emoji: '💊',
        tone: 'neutral',
        weight: 60 + med.totalDoses14d,
        text: `${med.medicationName} was taken ${med.totalDoses14d} times in 2 weeks, mostly on days you logged ${med.overlappingSymptoms.slice(0, 2).join(' or ').toLowerCase()}.`,
      })
    } else if (med.totalDoses14d >= 3) {
      out.push({
        id: `prn-use-${med.medicationId}`,
        emoji: '💊',
        tone: 'neutral',
        weight: 40 + med.totalDoses14d,
        text: `${med.medicationName}: ${med.totalDoses14d} doses across ${med.daysWithDoses} days in the last 2 weeks.`,
      })
    }
  }

  const exercise = splitAverage(recent, (l) => l.exercised || (l.exercise_minutes ?? 0) > 0, (l) => l.energy_level)
  if (exercise && Math.abs(exercise.yes - exercise.no) >= 0.5) {
    const better = exercise.yes > exercise.no
    out.push({
      id: 'exercise-energy',
      emoji: better ? '🏃' : '🛋️',
      tone: better ? 'good' : 'neutral',
      weight: 50 + Math.abs(exercise.yes - exercise.no) * 10,
      text: better
        ? `Your energy is higher on days you move (${exercise.yes}/5 vs ${exercise.no}/5).`
        : `Your energy is lower on days you exercise (${exercise.yes}/5 vs ${exercise.no}/5). Lighter sessions or more rest may help.`,
    })
  }

  const sleepEnergy = splitAverage(recent, (l) => (l.sleep_hours ?? 0) >= 7, (l) => l.energy_level)
  if (sleepEnergy && sleepEnergy.yes - sleepEnergy.no >= 0.5) {
    out.push({
      id: 'sleep-energy',
      emoji: '😴',
      tone: 'good',
      weight: 45 + (sleepEnergy.yes - sleepEnergy.no) * 10,
      text: `On days after 7+ hours of sleep your energy averages ${sleepEnergy.yes}/5, compared with ${sleepEnergy.no}/5 otherwise.`,
    })
  }

  const counts = new Map<string, number>()
  for (const l of recent) for (const s of l.symptoms ?? []) counts.set(s, (counts.get(s) ?? 0) + 1)
  const [topSymptom, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? []
  if (topSymptom && (topCount as number) >= 3) {
    out.push({
      id: 'symptom',
      emoji: '🩺',
      tone: 'watch',
      weight: 35 + (topCount as number),
      text: `${topSymptom} came up on ${topCount} of the last 14 days.`,
    })
  }

  const shortNights = recent.filter((l) => l.sleep_hours != null && l.sleep_hours < 6).length
  if (shortNights >= 4) {
    out.push({
      id: 'short-sleep',
      emoji: '🌙',
      tone: 'watch',
      weight: 30 + shortNights,
      text: `${shortNights} nights under 6 hours in the last 2 weeks.`,
    })
  }

  for (const s of buildWeekStats(logs, today)) {
    if (s.key === 'logged' || s.delta == null) continue
    const big = s.key === 'sleep' ? Math.abs(s.delta) >= 0.75 : Math.abs(s.delta) >= 0.5
    if (!big) continue
    const up = s.delta > 0
    out.push({
      id: `delta-${s.key}`,
      emoji: up ? '📈' : '📉',
      tone: up ? 'good' : 'watch',
      weight: 20 + Math.abs(s.delta) * 10,
      text: `${s.label} is ${up ? 'up' : 'down'} ${Math.abs(s.delta)}${s.unit || ' points'} compared with last week.`,
    })
  }

  if (out.length === 0) {
    const days = recent.length
    out.push({
      id: 'nudge',
      emoji: '✨',
      tone: 'neutral',
      weight: 0,
      text:
        days === 0
          ? 'Log a quick check-in and your patterns will start showing up here.'
          : `${days} check-in${days === 1 ? '' : 's'} so far. A few more and patterns will start to show.`,
    })
  }

  return out.sort((a, b) => b.weight - a.weight)
}
