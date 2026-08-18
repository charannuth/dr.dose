import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { todayLocalDate } from '../../lib/dates'
import { HeightWeightFields } from '../HeightWeightFields'
import type { BodyMetricUnit } from '../../lib/bodyMetrics'
import { fetchMedicalRecord, updateBodyMetricUnits } from '../../lib/medicalRecords'
import type { MedicalRecord } from '../../lib/medicalRecords'
import { CycleDayStrip } from './CycleDayStrip'
import { sealRow } from '../../lib/crypto/seal'
import { supabase } from '../../lib/supabase'
import {
  computeDailyTargets,
  computeMaintenanceCalories,
  fetchWeightLog,
  fetchWeightLogs,
  fetchWeightSettings,
  type WeightGoalDirection,
  type WeightGoalRate,
  type WeightActivityLevel,
  type WeightLog,
  type WeightSettings,
  upsertWeightLog,
  updateWeightSettings,
} from '../../lib/tracking/weight'
import {
  kgToLbString,
  lbStringToKg,
  parsePositiveNumber,
} from '../../lib/bodyMetrics'

type WeightTrackerPanelProps = {
  selectedDate: string
  onSelectDate: (date: string) => void
  onDataMutated?: () => void
}

function parseMaybeInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

function parseMaybeNumber(value: string): number | null {
  // For baseline/calorie math we only accept positive values.
  return parsePositiveNumber(value)
}

function freqLabel(days: number): string {
  if (days === 1) return 'Every day'
  if (days === 3) return 'Every 3 days'
  if (days === 7) return 'Every 7 days'
  return `Every ${days} days`
}

function daysBetweenAnchor(anchor: string, date: string): number {
  const [y1, m1, d1] = anchor.split('-').map(Number)
  const [y2, m2, d2] = date.split('-').map(Number)
  const t1 = new Date(y1, m1 - 1, d1, 12).getTime()
  const t2 = new Date(y2, m2 - 1, d2, 12).getTime()
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000))
}

export function WeightTrackerPanel({
  selectedDate,
  onSelectDate,
  onDataMutated,
}: WeightTrackerPanelProps) {
  const { user } = useAuth()
  const today = todayLocalDate()

  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null)
  const [settings, setSettings] = useState<WeightSettings | null>(null)
  const [weightLogsInMonth, setWeightLogsInMonth] = useState<WeightLog[]>([])
  const [selectedLog, setSelectedLog] = useState<WeightLog | null>(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [heightUnit, setHeightUnit] = useState<BodyMetricUnit>('metric')
  const [weightUnit, setWeightUnit] = useState<BodyMetricUnit>('metric')

  const isFutureDay = selectedDate > today

  // Drafts for the selected day.
  const [breakfastDraft, setBreakfastDraft] = useState('')
  const [lunchDraft, setLunchDraft] = useState('')
  const [dinnerDraft, setDinnerDraft] = useState('')
  const [didWorkoutDraft, setDidWorkoutDraft] = useState(false)
  const [workoutCaloriesDraft, setWorkoutCaloriesDraft] = useState('')
  const [weightKgDraft, setWeightKgDraft] = useState('') // always in kg storage units
  const [notesDraft, setNotesDraft] = useState('')
  const [dayLogExpanded, setDayLogExpanded] = useState(true)

  const [settingsDraft, setSettingsDraft] = useState<{
    baseline_height_cm: string
    baseline_weight_kg: string
    goal_direction: WeightGoalDirection
    goal_rate: WeightGoalRate
    activity_level: WeightActivityLevel
    log_frequency_days: number
    sync_weight_to_medical_records: boolean
  } | null>(null)
  const [weightPlanExpanded, setWeightPlanExpanded] = useState(true)
  const [weightPlanSaved, setWeightPlanSaved] = useState(false)

  const monthBounds = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    return { start, end }
  }, [selectedDate])

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [medical, s, logsMonth, sel] = await Promise.all([
        fetchMedicalRecord(user.id),
        fetchWeightSettings(user.id),
        fetchWeightLogs(user.id, monthBounds.start, monthBounds.end),
        fetchWeightLog(user.id, selectedDate),
      ])

      setMedicalRecord(medical)
      setSettings(s)
      setWeightLogsInMonth(logsMonth)
      setSelectedLog(sel)

      setHeightUnit((medical?.height_unit ?? 'metric') as BodyMetricUnit)
      setWeightUnit((medical?.weight_unit ?? 'metric') as BodyMetricUnit)

      // Seed day drafts.
      setBreakfastDraft(String(sel?.breakfast_calories ?? ''))
      setLunchDraft(String(sel?.lunch_calories ?? ''))
      setDinnerDraft(String(sel?.dinner_calories ?? ''))
      setDidWorkoutDraft(Boolean(sel?.did_workout))
      setWorkoutCaloriesDraft(String(sel?.workout_calories_burned ?? ''))
      setWeightKgDraft(sel?.weight_kg != null ? String(sel.weight_kg) : '')
      setNotesDraft(sel?.notes ?? '')

      // Seed settings drafts.
      setSettingsDraft({
        baseline_height_cm: s.baseline_height_cm != null ? String(s.baseline_height_cm) : '',
        baseline_weight_kg: s.baseline_weight_kg != null ? String(s.baseline_weight_kg) : '',
        goal_direction: s.goal_direction,
        goal_rate: s.goal_rate,
        activity_level: s.activity_level,
        log_frequency_days: s.log_frequency_days,
        sync_weight_to_medical_records: s.sync_weight_to_medical_records,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weight tracker')
    } finally {
      setLoading(false)
    }
  }, [user, monthBounds.start, monthBounds.end, selectedDate])

  useEffect(() => {
    void reload()
  }, [reload])

  // If the user switches dates, expand the form when there is no existing log.
  useEffect(() => {
    setDayLogExpanded(selectedLog == null)
  }, [selectedDate, selectedLog])

  const allowedWeightForSelectedDate = useMemo(() => {
    if (!settings) return true
    if (selectedDate > today) return false

    const anchor = settings.log_frequency_anchor_date
    const freq = settings.log_frequency_days
    if (!anchor || !freq || freq <= 0) return true
    if (selectedDate < anchor) return true // allow backfilling before the current enforcement start
    const days = daysBetweenAnchor(anchor, selectedDate)
    return days % freq === 0
  }, [settings, selectedDate, today])

  const dayHasLog = useCallback(
    (date: string) => {
      return weightLogsInMonth.some((l) => {
        if (l.log_date !== date) return false
        return Boolean(
          l.weight_kg != null ||
            l.breakfast_calories != null ||
            l.lunch_calories != null ||
            l.dinner_calories != null ||
            l.did_workout ||
            l.workout_calories_burned != null ||
            (l.notes?.trim() ?? ''),
        )
      })
    },
    [weightLogsInMonth],
  )

  const maintenance = useMemo(() => {
    if (!settingsDraft || !medicalRecord) return null
    const age = medicalRecord.date_of_birth ? (() => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(medicalRecord.date_of_birth ?? '')
      if (!match) return null
      const y = Number(match[1])
      const m = Number(match[2])
      const d = Number(match[3])
      const todayDt = new Date()
      let ageYears = todayDt.getFullYear() - y
      const monthDiff = todayDt.getMonth() + 1 - m
      const dayDiff = todayDt.getDate() - d
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ageYears--
      return ageYears >= 0 ? ageYears : null
    })() : null
    const ageYears = age
    const heightCm = parseMaybeNumber(settingsDraft.baseline_height_cm)
    const weightKg = parseMaybeNumber(settingsDraft.baseline_weight_kg)
    if (ageYears == null || heightCm == null || weightKg == null) return null
    return computeMaintenanceCalories({
      ageYears,
      heightCm,
      weightKg,
      gender: medicalRecord.gender,
      activityLevel: settingsDraft.activity_level,
    })
  }, [medicalRecord, settingsDraft])

  const targets = useMemo(() => {
    if (maintenance == null || !settingsDraft) return null
    return computeDailyTargets({
      maintenanceCalories: maintenance,
      goal_direction: settingsDraft.goal_direction,
      goal_rate: settingsDraft.goal_rate,
    })
  }, [maintenance, settingsDraft])

  const saveSettings = useCallback(async () => {
    if (!user || !settingsDraft) return
    setBusy(true)
    setError(null)
    try {
      const baseline_height_cm = parsePositiveNumber(settingsDraft.baseline_height_cm)
      const baseline_weight_kg = parsePositiveNumber(settingsDraft.baseline_weight_kg)

      const s = await updateWeightSettings(user.id, {
        baseline_height_cm,
        baseline_weight_kg,
        goal_direction: settingsDraft.goal_direction,
        goal_rate: settingsDraft.goal_rate,
        activity_level: settingsDraft.activity_level,
        log_frequency_days: settingsDraft.log_frequency_days,
        sync_weight_to_medical_records: settingsDraft.sync_weight_to_medical_records,
      })
      setSettings(s)
      setWeightPlanSaved(true)
      setWeightPlanExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save weight plan')
    } finally {
      setBusy(false)
    }
  }, [user, settingsDraft])

  const discardDayEdits = useCallback(() => {
    setBreakfastDraft(String(selectedLog?.breakfast_calories ?? ''))
    setLunchDraft(String(selectedLog?.lunch_calories ?? ''))
    setDinnerDraft(String(selectedLog?.dinner_calories ?? ''))
    setDidWorkoutDraft(Boolean(selectedLog?.did_workout))
    setWorkoutCaloriesDraft(String(selectedLog?.workout_calories_burned ?? ''))
    setWeightKgDraft(selectedLog?.weight_kg != null ? String(selectedLog.weight_kg) : '')
    setNotesDraft(selectedLog?.notes ?? '')
  }, [selectedLog])

  const saveDayLog = useCallback(async () => {
    if (!user || !settings) return
    if (isFutureDay) return
    setBusy(true)
    setError(null)
    try {
      const weight_kg =
        allowedWeightForSelectedDate && weightKgDraft.trim() !== ''
          ? parsePositiveNumber(weightKgDraft)
          : selectedLog?.weight_kg ?? null

      await upsertWeightLog(user.id, selectedDate, {
        breakfast_calories: parseMaybeInt(breakfastDraft),
        lunch_calories: parseMaybeInt(lunchDraft),
        dinner_calories: parseMaybeInt(dinnerDraft),
        did_workout: didWorkoutDraft,
        workout_calories_burned: didWorkoutDraft
          ? parseMaybeInt(workoutCaloriesDraft)
          : null,
        weight_kg,
        notes: notesDraft,
      })

      // Optional: keep medical_records.weight_kg in sync.
      if (settings.sync_weight_to_medical_records && weight_kg != null) {
        if (!supabase) throw new Error('Supabase is not configured')
        const sealed = sealRow('medical_records', {
          user_id: user.id,
          weight_kg: String(weight_kg),
        })
        const { error } = await supabase
          .from('medical_records')
          .upsert(sealed, { onConflict: 'user_id' })
        if (error) throw error
      }

      await reload()
      onDataMutated?.()
      setDayLogExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save weight log')
    } finally {
      setBusy(false)
    }
  }, [
    user,
    settings,
    isFutureDay,
    allowedWeightForSelectedDate,
    weightKgDraft,
    breakfastDraft,
    lunchDraft,
    dinnerDraft,
    didWorkoutDraft,
    workoutCaloriesDraft,
    notesDraft,
    selectedLog?.weight_kg,
    selectedDate,
    reload,
    onDataMutated,
  ])

  if (!user) return null

  const caloriesIn =
    (parseMaybeInt(breakfastDraft) ?? 0) +
    (parseMaybeInt(lunchDraft) ?? 0) +
    (parseMaybeInt(dinnerDraft) ?? 0)
  const caloriesBurned = didWorkoutDraft ? parseMaybeInt(workoutCaloriesDraft) ?? 0 : 0
  const weightDisplay =
    weightKgDraft.trim() === ''
      ? null
      : weightUnit === 'metric'
        ? `${weightKgDraft} kg`
        : `${kgToLbString(weightKgDraft)} lb`

  return (
    <div className="tracker-panel weight-tracker-panel">
      <p className="field-hint">
        Weight + nutrition logging with calorie targets based on your baseline (height/weight),
        goal (gain/loss), and activity level.
      </p>

      {error && <p className="banner banner-error">{error}</p>}
      {loading || !settings || !settingsDraft ? (
        <p className="loading">Loading weight tracker…</p>
      ) : (
        <>
          <section className="weight-plan-section">
            <div className="weight-plan-header">
              <h4>Weight plan</h4>
              {!weightPlanExpanded && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setWeightPlanExpanded(true)}
                >
                  Edit weight plan
                </button>
              )}
            </div>

            {weightPlanExpanded ? (
              <div className="weight-plan-grid">
                <HeightWeightFields
                  height_cm={settingsDraft.baseline_height_cm}
                  weight_kg={settingsDraft.baseline_weight_kg}
                  height_unit={heightUnit}
                  weight_unit={weightUnit}
                  onHeightChange={(height_cm) =>
                    setSettingsDraft((d) => (d ? { ...d, baseline_height_cm: height_cm } : d))
                  }
                  onWeightChange={(weight_kg) =>
                    setSettingsDraft((d) => (d ? { ...d, baseline_weight_kg: weight_kg } : d))
                  }
                  onHeightUnitChange={(unit) => {
                    setHeightUnit(unit)
                    void updateBodyMetricUnits(user.id, { height_unit: unit }).then((saved) => {
                      setMedicalRecord(saved)
                    })
                  }}
                  onWeightUnitChange={(unit) => {
                    setWeightUnit(unit)
                    void updateBodyMetricUnits(user.id, { weight_unit: unit }).then((saved) => {
                      setMedicalRecord(saved)
                    })
                  }}
                  fieldClassName="tracking-field"
                  rowClassName="tracking-stats-row"
                />

                <label className="tracking-field">
                  Goal
                  <select
                    value={settingsDraft.goal_direction}
                    onChange={(e) =>
                      setSettingsDraft((d) =>
                        d ? { ...d, goal_direction: e.target.value as WeightGoalDirection } : d,
                      )
                    }
                  >
                    <option value="lose">Lose weight</option>
                    <option value="gain">Gain weight</option>
                  </select>
                </label>

                <label className="tracking-field">
                  Pace
                  <select
                    value={settingsDraft.goal_rate}
                    onChange={(e) =>
                      setSettingsDraft((d) =>
                        d ? { ...d, goal_rate: e.target.value as WeightGoalRate } : d,
                      )
                    }
                  >
                    <option value="mild">Mild (&le; 0.5 lb/week)</option>
                    <option value="regular">Regular (&le; 1 lb/week)</option>
                    <option value="extreme">Extreme (&le; 2 lb/week)</option>
                  </select>
                </label>

                <label className="tracking-field">
                  Activity level
                  <select
                    value={settingsDraft.activity_level}
                    onChange={(e) =>
                      setSettingsDraft((d) =>
                        d
                          ? {
                              ...d,
                              activity_level: e.target.value as WeightActivityLevel,
                            }
                          : d,
                      )
                    }
                  >
                    <option value="sedentary">Sedentary (0–1 days/week)</option>
                    <option value="light">Light (2–3 days/week)</option>
                    <option value="moderate">Moderate (4–5 days/week)</option>
                    <option value="active">Active (7 days/week)</option>
                  </select>
                </label>

                <label className="tracking-field">
                  Weight log frequency
                  <select
                    value={settingsDraft.log_frequency_days}
                    onChange={(e) =>
                      setSettingsDraft((d) =>
                        d ? { ...d, log_frequency_days: Number(e.target.value) } : d,
                      )
                    }
                  >
                    <option value={1}>Every day</option>
                    <option value={3}>Every 3 days</option>
                    <option value={7}>Every 7 days</option>
                  </select>
                </label>

                <label className="tracking-field weight-sync-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsDraft.sync_weight_to_medical_records}
                    onChange={(e) =>
                      setSettingsDraft((d) =>
                        d ? { ...d, sync_weight_to_medical_records: e.target.checked } : d,
                      )
                    }
                  />
                  <span>Auto-update medical records weight when you log your weight</span>
                </label>
              </div>
            ) : weightPlanSaved ? (
              <p className="field-hint" role="status">
                Weight plan saved.
              </p>
            ) : null}

            <div className="weight-targets">
              <h5 className="weight-targets-heading">Calorie targets</h5>
              {targets && maintenance != null ? (
                <div className="weight-targets-cards" role="group" aria-label="Daily calorie targets">
                  <div className="weight-target-card">
                    <span className="weight-target-card-label">Maintenance</span>
                    <span className="weight-target-card-value">{maintenance}</span>
                    <span className="weight-target-card-unit">kcal/day</span>
                  </div>
                  <div className="weight-target-card weight-target-card--goal">
                    <span className="weight-target-card-label">Target ({targets.label})</span>
                    <span className="weight-target-card-value">{targets.targetCalories}</span>
                    <span className="weight-target-card-unit">kcal/day</span>
                  </div>
                </div>
              ) : (
                <p className="weight-targets-empty">
                  Set your date of birth in medical records, then enter baseline height and weight
                  to see your daily calorie targets.
                </p>
              )}
              <div className="weight-targets-actions">
                {!weightPlanSaved ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void saveSettings()}
                  >
                    {busy ? 'Saving…' : 'Save weight plan'}
                  </button>
                ) : (
                  <>
                    <span className="weight-plan-saved-pill" role="status">
                      Saved
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setWeightPlanExpanded(true)
                        setWeightPlanSaved(false)
                      }}
                    >
                      Edit weight plan
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="weight-day-log">
            <div className="weight-day-strip">
              <CycleDayStrip
                selectedDate={selectedDate}
                today={today}
                onSelectDate={onSelectDate}
                dayHasLog={dayHasLog}
              />
            </div>

            {isFutureDay && (
              <p className="field-hint cycle-future-day-hint" role="status">
                This day is in the future — logging unlocks on the date.
              </p>
            )}

            {!dayLogExpanded ? (
              <div className="weight-day-log-saved" role="status">
                <div className="weight-day-log-saved-row">
                  <strong>Saved for {selectedDate}</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDayLogExpanded(true)}
                  >
                    Edit
                  </button>
                </div>
                <div className="weight-day-log-summary">
                  <span>
                    Calories: <strong>{caloriesIn}</strong> in
                    {didWorkoutDraft ? (
                      <>
                        {' '}
                        · <strong>{caloriesBurned}</strong> burned
                      </>
                    ) : null}
                  </span>
                  {weightDisplay ? (
                    <span>
                      Weight: <strong>{weightDisplay}</strong>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <fieldset className="cycle-day-log-fields" disabled={isFutureDay}>
                  <div className="weight-meals-grid">
                    <label className="tracking-field">
                      Breakfast (kcal)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={breakfastDraft}
                        placeholder="e.g. 400"
                        onChange={(e) => setBreakfastDraft(e.target.value)}
                      />
                    </label>
                    <label className="tracking-field">
                      Lunch (kcal)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={lunchDraft}
                        placeholder="e.g. 650"
                        onChange={(e) => setLunchDraft(e.target.value)}
                      />
                    </label>
                    <label className="tracking-field">
                      Dinner (kcal)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={dinnerDraft}
                        placeholder="e.g. 750"
                        onChange={(e) => setDinnerDraft(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="weight-workout-row">
                    <label className="cycle-intercourse-toggle">
                      <input
                        type="checkbox"
                        checked={didWorkoutDraft}
                        onChange={(e) => setDidWorkoutDraft(e.target.checked)}
                      />
                      <span className="cycle-intercourse-label" aria-hidden>
                        ♥
                      </span>
                      Workout / cardio
                    </label>
                    <label className="tracking-field">
                      Calories burned
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={workoutCaloriesDraft}
                        disabled={!didWorkoutDraft}
                        placeholder="e.g. 250"
                        onChange={(e) => setWorkoutCaloriesDraft(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="weight-scale-row">
                    <label className="tracking-field">
                      Weight
                      <input
                        type="number"
                        min={0}
                        step={weightUnit === 'metric' ? 0.1 : 0.1}
                        value={weightUnit === 'metric' ? weightKgDraft : kgToLbString(weightKgDraft)}
                        disabled={!allowedWeightForSelectedDate}
                        placeholder={weightUnit === 'metric' ? 'e.g. 68.4' : 'e.g. 150'}
                        onChange={(e) => {
                          const next = e.target.value
                          if (weightUnit === 'metric') setWeightKgDraft(next)
                          else setWeightKgDraft(lbStringToKg(next))
                        }}
                      />
                      <span className="field-hint">
                        {allowedWeightForSelectedDate
                          ? 'Logged on schedule.'
                          : `Weight logs are ${freqLabel(settings.log_frequency_days)}. This date is locked.`}
                      </span>
                    </label>
                  </div>

                  <label className="cycle-notes-label">
                    Notes
                    <textarea
                      rows={2}
                      value={notesDraft}
                      placeholder="Anything that impacted calories or body changes today?"
                      onChange={(e) => setNotesDraft(e.target.value)}
                    />
                  </label>
                </fieldset>

                <div className="cycle-day-log-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || isFutureDay}
                    onClick={() => void saveDayLog()}
                  >
                    Save day
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={discardDayEdits}
                  >
                    Discard edits
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

