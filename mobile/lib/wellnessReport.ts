import type { MedicationSafetyReview } from './medicationSafetyReview'
import type { WellnessProfileInput } from './wellness'
import {
  formatWellnessLogSummary,
  isWellnessLogFilled,
  lastNDates,
  logFromRow,
  type WellnessLog,
} from './wellness'
import { formatComparisonLine, compareWeekMetrics } from './wellnessTrends'
import { todayLocalDate } from './dates'
import type { MedBriefingEntry } from '../hooks/useWellnessMedBriefings'
import type { PrnInsightsSummary } from './prnInsights'

export type ActiveMedicationSummary = {
  name: string
  start_date: string
  end_date: string | null
}

export type WellnessReportData = {
  generatedAt: string
  userEmail: string | undefined
  profile: WellnessProfileInput
  medications: ActiveMedicationSummary[]
  logs: WellnessLog[]
  logDates: string[]
  weekComparisons: ReturnType<typeof compareWeekMetrics>
  medReviews: { med: ActiveMedicationSummary; review: MedicationSafetyReview }[]
  prnInsights: PrnInsightsSummary
}

export function createWellnessReportData(input: {
  userEmail: string | undefined
  profile: WellnessProfileInput
  medications: ActiveMedicationSummary[]
  reportLogs: WellnessLog[]
  prnInsights: PrnInsightsSummary
  briefingEntries: MedBriefingEntry[]
}): WellnessReportData {
  const today = todayLocalDate()
  const recentWeek = lastNDates(7, today)
  const priorWeek = lastNDates(14, today).slice(7, 14)
  const logDates = lastNDates(14, today)

  return {
    generatedAt: new Date().toLocaleString(),
    userEmail: input.userEmail,
    profile: input.profile,
    medications: input.medications,
    logs: input.reportLogs,
    logDates,
    weekComparisons: compareWeekMetrics(recentWeek, priorWeek, input.reportLogs),
    medReviews: input.briefingEntries.map((e) => ({
      med: e.med,
      review: e.review,
    })),
    prnInsights: input.prnInsights,
  }
}

function formatReportDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type DoctorReportOptions = {
  /** Medical history section (from Medical records), shown first. */
  medicalHistoryHtml?: string
  /** Include the last 14 days of wellness, as-needed use and medication notes. */
  includeWellness?: boolean
}

export function buildWellnessReportHtml(data: WellnessReportData, options: DoctorReportOptions = {}): string {
  const includeWellness = options.includeWellness !== false
  const comparisonLines = data.weekComparisons
    .map(formatComparisonLine)
    .filter((line): line is string => line != null)

  const logRows = data.logDates
    .map((date) => {
      const row = data.logs.find((l) => l.log_date === date)
      if (!row || !isWellnessLogFilled(logFromRow(row))) {
        return `<tr><td>${escapeHtml(formatReportDate(date))}</td><td colspan="2"><em>No log</em></td></tr>`
      }
      const logInput = logFromRow(row)
      return `<tr>
        <td>${escapeHtml(formatReportDate(date))}</td>
        <td>${escapeHtml(formatWellnessLogSummary(logInput))}</td>
        <td>${escapeHtml(logInput.notes.trim() || '—')}</td>
      </tr>`
    })
    .join('')

  const prnMeds = data.prnInsights.meds.filter((m) => m.totalDoses14d > 0)
  const prnSection =
    prnMeds.length > 0
      ? prnMeds
          .map((med) => {
            const observations = med.observations
              .map((o) => `<li>${escapeHtml(o)}</li>`)
              .join('')
            const tips = med.copingTips
              .map((t) => `<li>${escapeHtml(t)}</li>`)
              .join('')
            return `
        <section class="med-block">
          <h3>${escapeHtml(med.medicationName)} (as needed)</h3>
          <p class="meta">${escapeHtml(data.prnInsights.periodLabel)} · ${med.totalDoses14d} dose(s) on ${med.daysWithDoses} day(s)${
            med.daysAtMax > 0
              ? ` · max limit reached ${med.daysAtMax} day(s)`
              : ''
          }</p>
          <p><em>Not a diagnosis.</em> Self-reported patterns vs daily wellness logs.</p>
          <h4>Observations</h4>
          <ul>${observations || '<li><em>No patterns yet.</em></li>'}</ul>
          <h4>Ideas to discuss (educational)</h4>
          <ul>${tips}</ul>
        </section>`
          })
          .join('')
      : '<p><em>No as-needed doses logged in this period.</em></p>'

  const medSections = data.medReviews
    .map(({ med, review }) => {
      const sideEffects = review.sideEffects.map((e) => `<li>${escapeHtml(e)}</li>`).join('')
      const substances =
        review.substanceWarnings.length > 0
          ? review.substanceWarnings
              .map(
                (w) =>
                  `<li><strong>${escapeHtml(w.label)}:</strong> ${escapeHtml(w.description)}</li>`,
              )
              .join('')
          : '<li><em>No specific substance notes in our database.</em></li>'
      const interactions =
        review.existingMedInteractions.length > 0
          ? review.existingMedInteractions
              .map(
                (i) =>
                  `<li>${escapeHtml(i.displayA)} + ${escapeHtml(i.displayB)}: ${escapeHtml(i.description)}</li>`,
              )
              .join('')
          : '<li><em>No known interactions with your other listed medications in our database.</em></li>'

      return `
        <section class="med-block">
          <h3>${escapeHtml(med.name)}</h3>
          <p class="meta">Active since ${escapeHtml(formatReportDate(med.start_date))}</p>
          <p><strong>What to discuss with your clinician:</strong> New or changed medicines can affect sleep, energy, appetite, and daily routines. Track how you feel and share this log — patterns are not proof the medicine caused a change.</p>
          <h4>Possible side effects (educational)</h4>
          <ul>${sideEffects}</ul>
          <h4>Alcohol, cannabis, tobacco</h4>
          <ul>${substances}</ul>
          <h4>Interactions with your other medications</h4>
          <ul>${interactions}</ul>
        </section>`
    })
    .join('')

  const substanceLines = Object.entries(data.profile.substance_use)
    .map(([key, level]) => `<li>${escapeHtml(key)}: ${escapeHtml(level ?? '')}</li>`)
    .join('')

  const wellnessHtml = includeWellness
    ? `
  <h2>Your baseline</h2>
  <ul>
    <li>Usual bedtime: ${escapeHtml(data.profile.usual_bedtime || '—')}</li>
    <li>Usual wake: ${escapeHtml(data.profile.usual_wake_time || '—')}</li>
    <li>Eating: ${escapeHtml(data.profile.eating_notes || '—')}</li>
    <li>Symptoms you track: ${escapeHtml(data.profile.symptom_focus.join(', ') || '—')}</li>
    ${substanceLines}
    <li>Notes: ${escapeHtml(data.profile.profile_notes || '—')}</li>
  </ul>

  <h2>Recent week vs prior week</h2>
  ${
    comparisonLines.length > 0
      ? `<ul>${comparisonLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : '<p><em>Not enough daily logs yet for a two-week comparison.</em></p>'
  }

  <h2>Daily wellness logs</h2>
  <table>
    <thead><tr><th>Date</th><th>Summary</th><th>Notes for clinician</th></tr></thead>
    <tbody>${logRows}</tbody>
  </table>

  <h2>As-needed (PRN) medication patterns</h2>
  ${prnSection}

  <h2>Medication briefings</h2>
  ${medSections || '<p><em>No active medications.</em></p>'}

`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dr. Dose — Report for your doctor</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12pt; line-height: 1.45; color: #111; max-width: 720px; margin: 1.5rem auto; padding: 0 1rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.25rem; }
    h2 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
    h3 { font-size: 1rem; margin: 1rem 0 0.35rem; }
    h4 { font-size: 0.95rem; margin: 0.75rem 0 0.25rem; }
    .disclaimer { background: #f4f4f5; border: 1px solid #d4d4d8; padding: 0.75rem 1rem; margin: 1rem 0; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.9rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
    ul { margin: 0.25rem 0 0.75rem; padding-left: 1.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin: 0 0 0.5rem; }
    .med-block { margin-bottom: 1.25rem; page-break-inside: avoid; }
    @media print { body { margin: 0.5in; } }
  </style>
</head>
<body>
  <h1>Dr. Dose — Health summary for your doctor</h1>
  <p class="meta">Generated ${escapeHtml(data.generatedAt)}${data.userEmail ? ` · ${escapeHtml(data.userEmail)}` : ''}</p>

  <div class="disclaimer">
    <strong>Not medical advice.</strong> This report summarizes your self-reported logs and educational medication information.
    It does not diagnose conditions or recommend treatment. Consult your doctor or pharmacist for medical decisions.
    Trends may reflect many factors, not only your medications.
  </div>

${options.medicalHistoryHtml ?? ''}
  ${wellnessHtml}
  <div class="disclaimer">
    Bring this printout or PDF to your appointment. Dr. Dose is for personal tracking only.
  </div>
</body>
</html>`
}
