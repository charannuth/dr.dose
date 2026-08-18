import { openRows } from './crypto/seal'
import { asStringArray } from './asStringArray'
import { todayLocalDate } from './dates'
import { filterMedicationsActiveOn } from './medicationDates'
import { isAsNeededMed } from './medicationSchedule'
import {
  copingTipsForCategory,
  inferPrnMedCategory,
  type PrnMedCategory,
} from './prnMedContext'
import { supabase } from './supabase'
import type { DoseLog, Medication } from './types'
import {
  isWellnessLogFilled,
  lastNDates,
  logFromRow,
  type WellnessLog,
} from './wellness'

export type PrnDoseDayEntry = {
  date: string
  doseCount: number
  reasons: string[]
  symptoms: string[]
  notes: string[]
  amounts: string[]
}

export type PrnMedInsight = {
  medicationId: string
  medicationName: string
  category: PrnMedCategory
  maxDosesPerDay: number | null
  totalDoses14d: number
  daysWithDoses: number
  daysAtMax: number
  daysMultiDose: number
  daysWithWellnessAndDose: number
  overlappingSymptoms: string[]
  observations: string[]
  copingTips: string[]
}

export type PrnInsightsSummary = {
  periodDays: number
  periodLabel: string
  meds: PrnMedInsight[]
  hasData: boolean
}

const INSIGHT_DAYS = 14

function normalizeToken(s: string): string {
  return s.trim().toLowerCase()
}

function symptomsOverlap(a: string[], b: string[]): string[] {
  const wellness = a.map(normalizeToken).filter(Boolean)
  const matches: string[] = []
  for (const symptom of b) {
    const t = normalizeToken(symptom)
    if (!t) continue
    const hit = wellness.some(
      (w) => w === t || w.includes(t) || t.includes(w),
    )
    if (hit && !matches.some((m) => normalizeToken(m) === t)) {
      matches.push(symptom.trim())
    }
  }
  return matches
}

function textMentionsFood(text: string): boolean {
  const lower = text.toLowerCase()
  return /\b(ate|eat|eating|meal|food|snack|lunch|dinner|breakfast|carb|sugar|glucose)\b/.test(
    lower,
  )
}

function buildMedInsight(
  med: Medication,
  doseDays: Map<string, PrnDoseDayEntry>,
  wellnessByDate: Map<string, WellnessLog>,
): PrnMedInsight {
  const category = inferPrnMedCategory(med)
  const max = med.max_doses_per_day
  let totalDoses14d = 0
  let daysWithDoses = 0
  let daysAtMax = 0
  let daysMultiDose = 0
  let daysWithWellnessAndDose = 0
  const overlapCounts = new Map<string, number>()
  const observations: string[] = []

  for (const [, day] of doseDays) {
    if (day.doseCount <= 0) continue
    daysWithDoses++
    totalDoses14d += day.doseCount
    if (day.doseCount >= 2) daysMultiDose++
    if (max != null && max > 0 && day.doseCount >= max) daysAtMax++

    const wellness = wellnessByDate.get(day.date)
    if (!wellness || !isWellnessLogFilled(logFromRow(wellness))) continue

    daysWithWellnessAndDose++
    const logInput = logFromRow(wellness)
    const overlap = symptomsOverlap(logInput.symptoms, day.symptoms)
    for (const s of overlap) {
      overlapCounts.set(s, (overlapCounts.get(s) ?? 0) + 1)
    }

    if (category === 'diabetes' && day.doseCount >= 2) {
      const foodInWellness =
        textMentionsFood(logInput.notes) ||
        textMentionsFood(med.notes ?? '') ||
        day.notes.some(textMentionsFood) ||
        day.reasons.some(textMentionsFood)
      if (foodInWellness) {
        observations.push(
          `On ${formatShortDate(day.date)}, you logged multiple doses of ${med.name} and your daily check-in mentioned food or eating — worth reviewing with your clinician (not a diagnosis of cause).`,
        )
      }
    }
  }

  const overlappingSymptoms = [...overlapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([symptom]) => symptom)

  if (daysAtMax > 0 && max != null && max > 0) {
    observations.push(
      `You reached your ${max}-dose daily limit for ${med.name} on ${daysAtMax} day${daysAtMax === 1 ? '' : 's'} in the last ${INSIGHT_DAYS} days.`,
    )
  }

  if (daysMultiDose > 0) {
    observations.push(
      `You took more than one dose of ${med.name} on ${daysMultiDose} day${daysMultiDose === 1 ? '' : 's'}; ${daysWithWellnessAndDose} of those also had a daily wellness check-in.`,
    )
  }

  if (overlappingSymptoms.length > 0) {
    const shown = overlappingSymptoms.slice(0, 4).join(', ')
    observations.push(
      `Same-day overlap between wellness symptoms and this medication's check-in: ${shown}. These patterns are for discussion with your doctor — the app does not determine cause.`,
    )
  }

  if (category === 'anxiety' && daysMultiDose > 0 && daysWithWellnessAndDose > 0) {
    observations.push(
      `On days with extra ${med.name} doses, your daily wellness log may help you and your clinician notice stressors or activities — log what was happening before the dose.`,
    )
  }

  if (observations.length === 0 && totalDoses14d > 0) {
    observations.push(
      `You logged ${totalDoses14d} dose${totalDoses14d === 1 ? '' : 's'} of ${med.name} in the last ${INSIGHT_DAYS} days. Keep using the check-in when you take extra doses so your visit report stays useful.`,
    )
  }

  return {
    medicationId: med.id,
    medicationName: med.name,
    category,
    maxDosesPerDay: max,
    totalDoses14d,
    daysWithDoses,
    daysAtMax,
    daysMultiDose,
    daysWithWellnessAndDose,
    overlappingSymptoms,
    observations,
    copingTips: copingTipsForCategory(category),
  }
}

function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function groupPrnDosesByMedAndDate(
  logs: DoseLog[],
): Map<string, Map<string, PrnDoseDayEntry>> {
  const byMed = new Map<string, Map<string, PrnDoseDayEntry>>()

  for (const log of logs) {
    let byDate = byMed.get(log.medication_id)
    if (!byDate) {
      byDate = new Map()
      byMed.set(log.medication_id, byDate)
    }

    let day = byDate.get(log.taken_on)
    if (!day) {
      day = {
        date: log.taken_on,
        doseCount: 0,
        reasons: [],
        symptoms: [],
        notes: [],
        amounts: [],
      }
      byDate.set(log.taken_on, day)
    }

    day.doseCount++
    if (log.logged_amount?.trim()) day.amounts.push(log.logged_amount.trim())
    if (log.prn_reason?.trim()) day.reasons.push(log.prn_reason.trim())
    if (log.prn_notes?.trim()) day.notes.push(log.prn_notes.trim())
    for (const s of asStringArray(log.prn_symptoms)) {
      if (s.trim() && !day.symptoms.includes(s.trim())) {
        day.symptoms.push(s.trim())
      }
    }
  }

  return byMed
}

export async function fetchPrnInsights(
  userId: string,
  dayCount = INSIGHT_DAYS,
): Promise<PrnInsightsSummary> {
  const today = todayLocalDate()
  const dates = lastNDates(dayCount, today)
  const startDate = dates[dates.length - 1]

  if (!supabase) {
    return {
      periodDays: dayCount,
      periodLabel: `Last ${dayCount} days`,
      meds: [],
      hasData: false,
    }
  }

  const [medsResult, logsResult, wellnessResult] = await Promise.all([
    supabase.from('medications').select('*').eq('user_id', userId),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_on', startDate),
    supabase
      .from('wellness_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error
  if (wellnessResult.error) throw wellnessResult.error

  const allMeds = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  const prnMeds = filterMedicationsActiveOn(allMeds, today).filter(isAsNeededMed)

  const wellnessByDate = new Map<string, WellnessLog>()
  for (const row of openRows(
    'wellness_logs',
    (wellnessResult.data ?? []) as Record<string, unknown>[],
  ) as WellnessLog[]) {
    wellnessByDate.set(row.log_date, row)
  }

  const prnMedIds = new Set(prnMeds.map((m) => m.id))
  const prnLogs = (
    openRows(
      'dose_logs',
      (logsResult.data ?? []) as Record<string, unknown>[],
    ) as DoseLog[]
  ).filter((l) => prnMedIds.has(l.medication_id))

  const grouped = groupPrnDosesByMedAndDate(prnLogs)

  const meds = prnMeds.map((med) => {
    const doseDays = grouped.get(med.id) ?? new Map()
    return buildMedInsight(med, doseDays, wellnessByDate)
  })

  const hasData = meds.some((m) => m.totalDoses14d > 0)

  return {
    periodDays: dayCount,
    periodLabel: `Last ${dayCount} days`,
    meds: meds.filter((m) => m.totalDoses14d > 0 || m.maxDosesPerDay != null),
    hasData,
  }
}
