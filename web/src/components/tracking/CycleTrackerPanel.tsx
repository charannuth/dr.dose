import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { todayLocalDate } from '../../lib/dates'
import {
  cancelOpenPeriod,
  clearPeriodLate,
  CYCLE_SYMPTOMS_DURING,
  cycleDayHasAnyData,
  cycleDayHasOptionalData,
  deleteCycleDayLog,
  deleteMostRecentPeriod,
  softClearCycleDayLog,
  CYCLE_SYMPTOMS_PRE,
  endPeriod,
  fetchCycleDayLogs,
  fetchCyclePeriods,
  fetchCycleSettings,
  fetchOpenPeriod,
  cycleDayInPeriod,
  cycleLengthSourceLabel,
  effectiveCycleLengthForPrediction,
  getCyclePrediction,
  markPeriodLate,
  mergeSymptomOptions,
  normalizeCustomSymptoms,
  recentCycleLengths,
  undoLastPeriodEnd,
  updatePeriodStart,
  updatePeriodEnd,
  PHASE_HINTS,
  PHASE_LABELS,
  startPeriod,
  updateCycleSettings,
  upsertCycleDayLog,
  type CycleDayLog,
  type CyclePeriod,
  type CycleSettings,
  type FlowLevel,
} from '../../lib/tracking/cycle'
import { CycleDayStrip } from './CycleDayStrip'

const FLOW_OPTIONS: { value: FlowLevel; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
]

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function monthEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function toggleSymptom(list: string[], symptom: string): string[] {
  return list.includes(symptom)
    ? list.filter((s) => s !== symptom)
    : [...list, symptom]
}

function SymptomChipGroup({
  title,
  options,
  selected,
  onChange,
  disabled = false,
  onAddPress,
}: {
  title: string
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  onAddPress?: () => void
}) {
  return (
    <fieldset className="cycle-symptom-group">
      <legend>{title}</legend>
      <div className="cycle-symptom-chips">
        {options.map((symptom) => (
          <button
            key={symptom}
            type="button"
            className={`wellness-chip${selected.includes(symptom) ? ' active' : ''}`}
            aria-pressed={selected.includes(symptom)}
            disabled={disabled}
            onClick={() => onChange(toggleSymptom(selected, symptom))}
          >
            {symptom}
          </button>
        ))}
        {onAddPress ? (
          <button
            type="button"
            className="wellness-chip cycle-symptom-add-chip"
            aria-label={`Add custom ${title.toLowerCase()}`}
            onClick={onAddPress}
          >
            +
          </button>
        ) : null}
      </div>
    </fieldset>
  )
}

function EditCustomSymptomsDialog({
  open,
  defaults,
  custom,
  onCancel,
  onSave,
}: {
  open: boolean
  defaults: readonly string[]
  custom: string[]
  onCancel: () => void
  onSave: (next: string[]) => void
}) {
  const [draftCustoms, setDraftCustoms] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftCustoms(normalizeCustomSymptoms(custom, defaults))
    setAdding(false)
    setDraft('')
  }, [open, custom, defaults])

  if (!open) return null

  function commitDraft() {
    const next = normalizeCustomSymptoms([...draftCustoms, draft], defaults)
    setDraftCustoms(next)
    setDraft('')
    setAdding(false)
  }

  function handleDone() {
    const merged = adding
      ? normalizeCustomSymptoms([...draftCustoms, draft], defaults)
      : normalizeCustomSymptoms(draftCustoms, defaults)
    onSave(merged)
  }

  return (
    <div className="cycle-symptom-edit-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="cycle-symptom-edit-dialog cycle-symptom-edit-dialog--mini"
        role="dialog"
        aria-modal="true"
        aria-label="Add symptoms"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cycle-symptom-edit-header">
          <h3>Add symptoms</h3>
          <button
            type="button"
            className="cycle-symptom-edit-close"
            aria-label="Close"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className="cycle-symptom-chips">
          {draftCustoms.map((label) => (
            <span key={label} className="wellness-chip cycle-custom-symptom-chip">
              {label}
              <button
                type="button"
                className="cycle-custom-symptom-remove"
                aria-label={`Remove ${label}`}
                onClick={() =>
                  setDraftCustoms((prev) => prev.filter((s) => s !== label))
                }
              >
                ×
              </button>
            </span>
          ))}
          {adding ? (
            <input
              className="wellness-chip wellness-chip-custom cycle-symptom-dashed-input"
              value={draft}
              placeholder="Type symptom…"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitDraft()
                }
              }}
              onBlur={() => {
                if (draft.trim()) commitDraft()
                else setAdding(false)
              }}
            />
          ) : (
            <button
              type="button"
              className="wellness-chip cycle-symptom-add-chip"
              aria-label="Add a symptom"
              onClick={() => setAdding(true)}
            >
              +
            </button>
          )}
        </div>
        <div className="cycle-symptom-edit-actions cycle-symptom-edit-actions--center">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

type CycleTrackerPanelProps = {
  selectedDate: string
  onSelectDate: (date: string) => void
  onDataMutated?: () => void
}

export function CycleTrackerPanel({
  selectedDate,
  onSelectDate,
  onDataMutated,
}: CycleTrackerPanelProps) {
  const { user } = useAuth()
  const today = todayLocalDate()
  const [settings, setSettings] = useState<CycleSettings | null>(null)
  const [periods, setPeriods] = useState<CyclePeriod[]>([])
  const [openPeriod, setOpenPeriod] = useState<CyclePeriod | null>(null)
  const [dayLogs, setDayLogs] = useState<CycleDayLog[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periodEndDraft, setPeriodEndDraft] = useState(today)
  const [editSymptomsKind, setEditSymptomsKind] = useState<'pre' | 'during' | null>(null)
  const [flow, setFlow] = useState<FlowLevel | ''>('')
  const [symptomsPre, setSymptomsPre] = useState<string[]>([])
  const [symptomsDuring, setSymptomsDuring] = useState<string[]>([])
  const [intercourse, setIntercourse] = useState(false)
  const [notes, setNotes] = useState('')

  const preOptions = useMemo(
    () =>
      mergeSymptomOptions(CYCLE_SYMPTOMS_PRE, [
        ...(settings?.custom_symptoms_pre ?? []),
        ...symptomsPre,
      ]),
    [settings?.custom_symptoms_pre, symptomsPre],
  )
  const duringOptions = useMemo(
    () =>
      mergeSymptomOptions(CYCLE_SYMPTOMS_DURING, [
        ...(settings?.custom_symptoms_during ?? []),
        ...symptomsDuring,
      ]),
    [settings?.custom_symptoms_during, symptomsDuring],
  )

  const logMonth = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }, [selectedDate])

  const reload = useCallback(async () => {
    if (!user) return
    const from = monthStart(logMonth.year, logMonth.month)
    const to = monthEnd(logMonth.year, logMonth.month)

    const [s, p, open, logs] = await Promise.all([
      fetchCycleSettings(user.id),
      fetchCyclePeriods(user.id),
      fetchOpenPeriod(user.id),
      fetchCycleDayLogs(user.id, from, to),
    ])
    setSettings(s)
    setPeriods(p)
    setOpenPeriod(open)
    setDayLogs(logs)
  }, [user, logMonth])

  useEffect(() => {
    if (openPeriod) setPeriodEndDraft(today)
  }, [openPeriod?.id, today])

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    reload()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load cycle data')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user, reload])

  const prediction = useMemo(
    () =>
      settings ? getCyclePrediction(periods, settings, today) : null,
    [settings, periods, today],
  )

  const effectiveCycle = useMemo(
    () =>
      settings ? effectiveCycleLengthForPrediction(settings, periods) : null,
    [settings, periods],
  )

  const recentLengths = useMemo(() => recentCycleLengths(periods), [periods])
  const lastRecordedLength = recentLengths[0] ?? null

  const dayHasLog = useCallback(
    (date: string) => {
      const log = dayLogs.find((l) => l.log_date === date)
      if (!log) return false
      return Boolean(
        log.flow_level ||
          log.intercourse ||
          log.notes?.trim() ||
          log.symptoms.length > 0 ||
          log.symptoms_pre.length > 0,
      )
    },
    [dayLogs],
  )

  const isFutureDay = selectedDate > today

  const selectedLog = dayLogs.find((l) => l.log_date === selectedDate)

  useEffect(() => {
    setFlow(selectedLog?.flow_level ?? '')
    setSymptomsPre(selectedLog?.symptoms_pre ?? [])
    setSymptomsDuring(selectedLog?.symptoms ?? [])
    setIntercourse(selectedLog?.intercourse ?? false)
    setNotes(selectedLog?.notes ?? '')
  }, [selectedLog, selectedDate])

  const selectedInPeriod = useMemo(
    () => cycleDayInPeriod(selectedDate, periods) != null,
    [selectedDate, periods],
  )
  const flowEnabled = selectedInPeriod && !isFutureDay

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
      onDataMutated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function saveDayLog() {
    if (!user || isFutureDay) return
    await runAction(async () => {
      await upsertCycleDayLog(user.id, selectedDate, {
        flow_level: flowEnabled ? flow || null : null,
        symptoms: selectedInPeriod ? symptomsDuring : [],
        symptoms_pre: symptomsPre,
        symptoms_post: [],
        intercourse,
        notes,
      })
    })
  }

  function resetDayForm() {
    setFlow('')
    setSymptomsPre([])
    setSymptomsDuring([])
    setIntercourse(false)
    setNotes('')
  }

  function discardUnsavedEdits() {
    if (selectedLog) {
      setFlow(selectedLog.flow_level ?? '')
      setSymptomsPre(selectedLog.symptoms_pre ?? [])
      setSymptomsDuring(selectedLog.symptoms ?? [])
      setIntercourse(selectedLog.intercourse ?? false)
      setNotes(selectedLog.notes ?? '')
      return
    }
    resetDayForm()
  }

  async function softClearSelectedDay() {
    if (!user) return
    const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'long', day: 'numeric' },
    )
    if (
      !confirm(
        `Soft clear ${dateLabel}?\n\nRemoves symptoms, intercourse, and notes. Flow for this day is kept.`,
      )
    ) {
      return
    }
    const keepFlow = flowEnabled
      ? flow || selectedLog?.flow_level || null
      : null
    await runAction(async () => {
      if (selectedLog || keepFlow) {
        await softClearCycleDayLog(user.id, selectedDate, keepFlow)
      }
      setSymptomsPre([])
      setSymptomsDuring([])
      setIntercourse(false)
      setNotes('')
    })
  }

  async function hardClearSelectedDay() {
    if (!user) return
    const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'long', day: 'numeric' },
    )
    if (
      !confirm(
        `Hard clear ${dateLabel}?\n\nPermanently deletes all saved data for this day, including flow. This cannot be undone.`,
      )
    ) {
      return
    }
    await runAction(async () => {
      await deleteCycleDayLog(user.id, selectedDate)
      resetDayForm()
    })
  }

  const lastClosedPeriod = periods.find((p) => p.ended_on)
  const selectedDayHasOptional =
    cycleDayHasOptionalData(selectedLog) ||
    symptomsPre.length > 0 ||
    symptomsDuring.length > 0 ||
    intercourse ||
    Boolean(notes.trim())
  const selectedDayHasSaved = cycleDayHasAnyData(selectedLog)

  const canMarkLate =
    Boolean(prediction?.nextStart) &&
    !openPeriod &&
    periods.length > 0 &&
    (prediction!.isLate || today >= prediction!.nextStart!)

  if (loading && !settings) {
    return <p className="loading">Loading cycle tracker…</p>
  }

  return (
    <div className="tracker-panel cycle-tracker-panel">
      <p className="tracker-disclaimer" role="note">
        For personal tracking only — not contraception or diagnosis. Predictions use your
        average cycle length; stress, diet, and other factors can shift timing. Share logs
        with your clinician.
      </p>

      {error && <p className="banner banner-error">{error}</p>}

      {prediction?.currentPhase && (
        <div className="cycle-phase-banner">
          <p className="cycle-phase-label">
            Today: <strong>{PHASE_LABELS[prediction.currentPhase]}</strong> phase
            {prediction.cycleDay != null && (
              <span className="cycle-phase-day"> · Day {prediction.cycleDay}</span>
            )}
          </p>
          <p className="field-hint">{PHASE_HINTS[prediction.currentPhase]}</p>
        </div>
      )}

      <div className="cycle-period-actions">
        {openPeriod ? (
          <>
            <label className="cycle-period-start-edit">
              Period started
              <input
                type="date"
                value={openPeriod.started_on}
                disabled={busy}
                max={today}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next || next === openPeriod.started_on) return
                  void runAction(() =>
                    updatePeriodStart(user!.id, openPeriod.id, next),
                  )
                }}
              />
            </label>
            <label className="cycle-period-start-edit">
              Period end date
              <input
                type="date"
                value={periodEndDraft}
                disabled={busy}
                min={openPeriod.started_on}
                max={today}
                onChange={(e) => setPeriodEndDraft(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !periodEndDraft}
              onClick={() =>
                void runAction(() => endPeriod(user!.id, periodEndDraft))
              }
            >
              Period ended
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || isFutureDay}
            onClick={() =>
              void runAction(() =>
                startPeriod(
                  user!.id,
                  selectedDate <= today ? selectedDate : today,
                ),
              )
            }
          >
            Period started
          </button>
        )}

        {canMarkLate && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                await markPeriodLate(user!.id)
              })
            }
          >
            {prediction?.isLate ? 'Update late prediction' : 'Mark period late'}
          </button>
        )}

        {settings?.period_late && !openPeriod && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => void runAction(() => clearPeriodLate(user!.id))}
          >
            Clear late flag
          </button>
        )}
      </div>

      {!openPeriod && lastClosedPeriod?.ended_on && (
        <label className="cycle-period-start-edit cycle-period-end-edit">
          Last period ended
          <input
            type="date"
            value={lastClosedPeriod.ended_on}
            disabled={busy}
            min={lastClosedPeriod.started_on}
            max={today}
            onChange={(e) => {
              const next = e.target.value
              if (!next || next === lastClosedPeriod.ended_on) return
              void runAction(() =>
                updatePeriodEnd(user!.id, lastClosedPeriod.id, next),
              )
            }}
          />
        </label>
      )}

      {(openPeriod || lastClosedPeriod || periods.length > 0) && (
        <details className="cycle-fix-mistakes">
          <summary>Fix a mistake</summary>
          <p className="field-hint cycle-clear-explainer">
            <strong>Soft</strong> = adjust or remove extras; period structure stays.{' '}
            <strong>Hard</strong> = permanent delete from your history.
          </p>

          <div className="cycle-fix-group">
            <h5 className="cycle-fix-group-title">Soft fixes</h5>
            <ul className="cycle-fix-actions">
              {!openPeriod && lastClosedPeriod && (
                <li>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          'Soft fix: reopen your last period?\n\nRemoves only the “ended” date so tracking continues.',
                        )
                      ) {
                        return
                      }
                      void runAction(() => undoLastPeriodEnd(user!.id))
                    }}
                  >
                    Reopen last period
                  </button>
                  <span className="field-hint">Undo a mistaken “Period ended”.</span>
                </li>
              )}
              {openPeriod && (
                <li>
                  <span className="field-hint">
                    Change the start date with the date field above (soft fix).
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="cycle-fix-group cycle-fix-group-hard">
            <h5 className="cycle-fix-group-title">Hard reset</h5>
            <ul className="cycle-fix-actions">
              {openPeriod && (
                <li>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm cycle-btn-hard"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          'Hard reset: delete this in-progress period?\n\nRemoves the period and its calendar bleeding. Cannot be undone.',
                        )
                      ) {
                        return
                      }
                      void runAction(() => cancelOpenPeriod(user!.id))
                    }}
                  >
                    Delete current period
                  </button>
                  <span className="field-hint">
                    Use if “Period started” was wrong entirely.
                  </span>
                </li>
              )}
              {periods.length > 0 && !openPeriod && (
                <li>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm cycle-btn-hard"
                    disabled={busy}
                    onClick={() => {
                      const label = new Date(
                        `${periods[0].started_on}T12:00:00`,
                      ).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      if (
                        !confirm(
                          `Hard reset: delete the period that started ${label}?\n\nRemoves that cycle from your history. Cannot be undone.`,
                        )
                      ) {
                        return
                      }
                      void runAction(() => deleteMostRecentPeriod(user!.id))
                    }}
                  >
                    Delete latest period
                  </button>
                  <span className="field-hint">
                    For a completed period logged by mistake.
                  </span>
                </li>
              )}
            </ul>
          </div>
        </details>
      )}

      {prediction?.nextStart && effectiveCycle && (
        <div className="cycle-prediction-block">
          <p className="field-hint cycle-prediction">
            {prediction.isLate ? (
              <>
                Period is <strong>{prediction.daysLate} day(s) late</strong>
                {settings?.prediction_push_days
                  ? ` · shifted +${settings.prediction_push_days} days`
                  : ''}
                . Next estimated start{' '}
              </>
            ) : (
              <>Next period estimated </>
            )}
            <strong>
              {new Date(`${prediction.nextStart}T12:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year:
                  prediction.nextStart.slice(0, 4) !== today.slice(0, 4)
                    ? 'numeric'
                    : undefined,
              })}
            </strong>
            {prediction.nextEnd && (
              <>
                {' '}
                –{' '}
                {new Date(`${prediction.nextEnd}T12:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </>
            )}
          </p>
          <p className="field-hint cycle-prediction-source">
            Based on {cycleLengthSourceLabel(effectiveCycle.source)} (
            <strong>{effectiveCycle.days} days</strong>
            {effectiveCycle.source === 'recent' && recentLengths.length > 0 && (
              <>
                {' '}
                — last recorded:{' '}
                {recentLengths.slice(0, 4).join(', ')}
                {recentLengths.length > 4 ? '…' : ''} days
              </>
            )}
            ).
          </p>
        </div>
      )}

      {settings && (
        <section className="cycle-settings-section">
          <h4 className="cycle-settings-heading">Cycle length & predictions</h4>
          <p className="field-hint">
            Cycles often vary month to month (stress, diet, travel, etc.). Your{' '}
            <strong>average</strong> is the default; we use <strong>recent</strong>{' '}
            lengths when you have two or more logged; you can override just the{' '}
            <strong>upcoming</strong> cycle below.
          </p>
          {lastRecordedLength != null && (
            <p className="cycle-last-length field-hint">
              Last completed cycle: <strong>{lastRecordedLength} days</strong>
              {Math.abs(lastRecordedLength - settings.avg_cycle_length) >= 2 && (
                <span>
                  {' '}
                  (your average is {settings.avg_cycle_length} — update either field if
                  this month feels different)
                </span>
              )}
            </p>
          )}
          <div className="cycle-settings-row">
            <label>
              Average cycle length (days)
              <input
                type="number"
                min={15}
                max={60}
                value={settings.avg_cycle_length}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    avg_cycle_length: Number(e.target.value) || 28,
                  })
                }
                onBlur={() =>
                  void runAction(() =>
                    updateCycleSettings(user!.id, {
                      avg_cycle_length: settings.avg_cycle_length,
                      avg_period_length: settings.avg_period_length,
                    }),
                  )
                }
              />
            </label>
            <label>
              Average period length (days)
              <input
                type="number"
                min={1}
                max={14}
                value={settings.avg_period_length}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    avg_period_length: Number(e.target.value) || 5,
                  })
                }
                onBlur={() =>
                  void runAction(() =>
                    updateCycleSettings(user!.id, {
                      avg_cycle_length: settings.avg_cycle_length,
                      avg_period_length: settings.avg_period_length,
                    }),
                  )
                }
              />
            </label>
            <label>
              Expected days until next period (this cycle only)
              <input
                type="number"
                min={15}
                max={60}
                placeholder={`e.g. ${settings.avg_cycle_length} — blank uses average/recent`}
                value={settings.expected_next_cycle_days ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  setSettings({
                    ...settings,
                    expected_next_cycle_days: raw ? Number(raw) : null,
                  })
                }}
                onBlur={() =>
                  void runAction(() =>
                    updateCycleSettings(user!.id, {
                      expected_next_cycle_days: settings.expected_next_cycle_days,
                    }),
                  )
                }
              />
            </label>
          </div>
          {settings.expected_next_cycle_days != null && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  updateCycleSettings(user!.id, { expected_next_cycle_days: null }),
                )
              }
            >
              Clear upcoming-cycle override
            </button>
          )}
        </section>
      )}

      <section className="cycle-day-log">
        <CycleDayStrip
          selectedDate={selectedDate}
          today={today}
          onSelectDate={onSelectDate}
          dayHasLog={dayHasLog}
        />

        {isFutureDay && (
          <p className="field-hint cycle-future-day-hint" role="status">
            This day is in the future — you can preview predictions on the calendar, but
            logging (symptoms, flow, intercourse, notes) unlocks on that date.
          </p>
        )}

        <fieldset className="cycle-day-log-fields" disabled={isFutureDay}>
        <label className="cycle-intercourse-toggle">
          <input
            type="checkbox"
            checked={intercourse}
            disabled={isFutureDay}
            onChange={(e) => setIntercourse(e.target.checked)}
          />
          <span className="cycle-intercourse-label" aria-hidden>
            ♥
          </span>
          Sexual intercourse
        </label>

        {flowEnabled ? (
          <fieldset className="cycle-flow-fieldset">
            <legend>Flow (menstruation)</legend>
            <div className="cycle-flow-options">
              {FLOW_OPTIONS.map((opt) => (
                <label key={opt.value} className="cycle-flow-chip">
                  <input
                    type="radio"
                    name="flow"
                    checked={flow === opt.value}
                    disabled={isFutureDay}
                    onChange={() => setFlow(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
              <label className="cycle-flow-chip">
                <input
                  type="radio"
                  name="flow"
                  checked={flow === ''}
                  disabled={isFutureDay}
                  onChange={() => setFlow('')}
                />
                None
              </label>
            </div>
          </fieldset>
        ) : !isFutureDay ? (
          <p className="field-hint">
            Flow tracking unlocks after you mark Period started for this day (or a
            day that covers it).
          </p>
        ) : null}

        <SymptomChipGroup
          title="Pre-menstrual symptoms"
          options={preOptions}
          selected={symptomsPre}
          onChange={setSymptomsPre}
          disabled={isFutureDay}
          onAddPress={() => setEditSymptomsKind('pre')}
        />
        <SymptomChipGroup
          title="During period symptoms"
          options={duringOptions}
          selected={symptomsDuring}
          onChange={setSymptomsDuring}
          disabled={isFutureDay || !selectedInPeriod}
          onAddPress={() => setEditSymptomsKind('during')}
        />
        {!selectedInPeriod && !isFutureDay ? (
          <p className="field-hint">
            During-period toggles unlock once this day is covered by a period.
          </p>
        ) : null}

        <EditCustomSymptomsDialog
          open={editSymptomsKind != null}
          defaults={
            editSymptomsKind === 'during' ? CYCLE_SYMPTOMS_DURING : CYCLE_SYMPTOMS_PRE
          }
          custom={
            editSymptomsKind === 'during'
              ? (settings?.custom_symptoms_during ?? [])
              : (settings?.custom_symptoms_pre ?? [])
          }
          onCancel={() => setEditSymptomsKind(null)}
          onSave={(next) => {
            if (!user || !editSymptomsKind) return
            const kind = editSymptomsKind
            setEditSymptomsKind(null)
            void runAction(() =>
              updateCycleSettings(
                user.id,
                kind === 'during'
                  ? { custom_symptoms_during: next }
                  : { custom_symptoms_pre: next },
              ),
            )
          }}
        />

        <label className="cycle-notes-label">
          Notes (stress, diet, sleep…)
          <textarea
            rows={2}
            value={notes}
            disabled={isFutureDay}
            placeholder="What might have affected your cycle today?"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        </fieldset>

        {!isFutureDay && (
          <div className="cycle-day-clear-section">
            <h5 className="cycle-day-clear-title">Clear this day</h5>
            <p className="field-hint">
              <strong>Soft</strong> keeps flow; <strong>Hard</strong> deletes everything
              saved for this date.
            </p>
            <div className="cycle-day-log-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void saveDayLog()}
              >
                Save day
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={discardUnsavedEdits}
              >
                Discard edits
              </button>
              {(selectedDayHasOptional || selectedDayHasSaved) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => void softClearSelectedDay()}
                >
                  Soft clear
                </button>
              )}
              {selectedDayHasSaved && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm cycle-btn-hard"
                  disabled={busy}
                  onClick={() => void hardClearSelectedDay()}
                >
                  Hard clear
                </button>
              )}
            </div>
          </div>
        )}

        {isFutureDay && (
          <div className="cycle-day-log-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSelectDate(today)}>
              Go to today to log
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
