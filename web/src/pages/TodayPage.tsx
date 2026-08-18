import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import type { LayoutOutletContext } from '../components/AppLayout'
import { useAuth } from '../hooks/useAuth'
import {
  createMedication,
  deleteMedication,
  fetchMedicationsWithStatus,
  migrateMedicationToAsNeeded,
  migrateMedicationToScheduled,
  markDoseTaken,
  markPrnDoseTaken,
  todayDoseTotals,
  undoDose,
  repairMedicationSchedule,
  updateMedication,
} from '../lib/medications'
import type { PrnDoseLogPayload } from '../lib/prnCheckIn'
import type {
  DoseSlotStatus,
  Medication,
  MedicationInput,
  MedicationWithStatus,
} from '../lib/types'
import { InteractionAlert } from '../components/InteractionAlert'
import { MedicationCard } from '../components/MedicationCard'
import {
  SameTimeDoseChooseModal,
  SameTimeDoseGroupBar,
} from '../components/SameTimeDoseActions'
import { MedicationForm } from '../components/MedicationForm'
import { DueNowBanner } from '../components/DueNowBanner'
import { MissedDosesBanner } from '../components/MissedDosesBanner'
import { RefillBanner } from '../components/RefillBanner'
import { StreakCelebration } from '../components/StreakCelebration'
import { StreakSnippet } from '../components/StreakSnippet'
import { useStreakCelebration } from '../hooks/useStreakCelebration'
import { TodayWellnessCheckIn } from '../components/TodayWellnessCheckIn'
import { fetchMissedDoses, type MissedDoseItem } from '../lib/missedDoses'
import {
  dismissMissedDosesBanner,
  getSameTimeDoseMode,
  isMissedDosesBannerDismissed,
  type SameTimeDoseMode,
} from '../lib/settings'
import {
  buildSameTimePendingGroups,
  buildScheduleTimeSections,
  sameTimePendingItemKey,
  type SameTimeDoseGroup,
} from '../lib/sameTimeDoseGroups'
import { todayLocalDate } from '../lib/dates'
import { isAsNeededMed } from '../lib/medicationSchedule'
import type { MedicationScheduleType } from '../lib/medicationSchedule'
import { getRefillAlerts } from '../lib/refills'
import { fetchStreakStats, type StreakStats } from '../lib/streaks'

type TodayTab = 'scheduled' | 'as_needed'

export function TodayPage() {
  const { registerAddHandler } = useOutletContext<LayoutOutletContext>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const openAddFromNav = Boolean(
    (location.state as { openAdd?: boolean } | null)?.openAdd,
  )
  const [medications, setMedications] = useState<MedicationWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(openAddFromNav)
  const [todayTab, setTodayTab] = useState<TodayTab>('scheduled')
  const [addScheduleType, setAddScheduleType] = useState<MedicationScheduleType>('scheduled')
  const [editing, setEditing] = useState<Medication | null>(null)
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null)
  const [badgeReplayKey, setBadgeReplayKey] = useState(0)
  const [missedDoses, setMissedDoses] = useState<MissedDoseItem[]>([])
  const [missedBannerDismissed, setMissedBannerDismissed] = useState(() =>
    isMissedDosesBannerDismissed(todayLocalDate()),
  )
  const [sameTimeMode, setSameTimeMode] = useState<SameTimeDoseMode>(() => getSameTimeDoseMode())
  const [chooseGroup, setChooseGroup] = useState<SameTimeDoseGroup | null>(null)
  const [chooseSelected, setChooseSelected] = useState<Set<string>>(() => new Set())
  const BATCH_DOSE_BUSY = 'batch-dose'
  const { celebrationStreak, dismissCelebration } = useStreakCelebration(
    user?.id,
    streakStats,
  )

  const openAddForm = useCallback((scheduleType: MedicationScheduleType = 'scheduled') => {
    setEditing(null)
    setAddScheduleType(scheduleType)
    setFormOpen(true)
  }, [])

  useEffect(() => {
    registerAddHandler(() => openAddForm(todayTab))
    return () => registerAddHandler(null)
  }, [registerAddHandler, openAddForm, todayTab])

  useEffect(() => {
    if (!openAddFromNav) return
    queueMicrotask(() => {
      setEditing(null)
      setFormOpen(true)
      navigate('.', { replace: true, state: {} })
    })
  }, [openAddFromNav, navigate])

  useEffect(() => {
    setSameTimeMode(getSameTimeDoseMode())
  }, [location.pathname])

  const reload = useCallback(async () => {
    if (!user) return
    const data = await fetchMedicationsWithStatus(user.id)
    setMedications(data)
  }, [user])

  const refreshStreakStats = useCallback(async () => {
    if (!user) return
    try {
      const streak = await fetchStreakStats(user.id)
      setStreakStats(streak)
    } catch {
      /* non-blocking */
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    let active = true

    fetchMedicationsWithStatus(user.id)
      .then((data) => {
        if (active) setMedications(data)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Failed to load medications',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user || loading) return

    let active = true

    Promise.all([fetchStreakStats(user.id), fetchMissedDoses(user.id)])
      .then(([streak, missed]) => {
        if (active) {
          setStreakStats(streak)
          setMissedDoses(missed)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [user, loading, medications])

  async function handleSave(input: MedicationInput) {
    if (!user) return
    if (editing) {
      await updateMedication(editing.id, input)
      await repairMedicationSchedule(editing.id)
    } else {
      await createMedication(user.id, input)
    }
    setFormOpen(false)
    setEditing(null)
    setError(null)
    try {
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh list')
    }
  }

  async function handleMarkManyDoses(
    items: { med: MedicationWithStatus; time: string }[],
    options?: { confirm?: boolean; label?: string },
  ) {
    if (!user || items.length === 0) return
    if (options?.confirm) {
      const ok = window.confirm(
        `Take all at ${options.label}?\n\nMark ${items.length} doses as taken.`,
      )
      if (!ok) return
    }

    setBusySlot(BATCH_DOSE_BUSY)
    setError(null)
    try {
      for (const { med, time } of items) {
        await markDoseTaken(user.id, med.id, time)
      }
      await reload()
      await refreshStreakStats()
      setBadgeReplayKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log doses')
      await reload()
    } finally {
      setBusySlot(null)
    }
  }

  async function handleTakeAllAtTime(
    items: { med: MedicationWithStatus; time: string }[],
    label: string,
  ) {
    await handleMarkManyDoses(items, { confirm: true, label })
  }

  function openChooseGroup(group: SameTimeDoseGroup) {
    setChooseGroup(group)
    setChooseSelected(
      new Set(
        group.pending.map((item) => sameTimePendingItemKey(item.med.id, item.time)),
      ),
    )
  }

  async function confirmChooseGroup() {
    if (!chooseGroup) return
    const items = chooseGroup.pending.filter((item) =>
      chooseSelected.has(sameTimePendingItemKey(item.med.id, item.time)),
    )
    await handleMarkManyDoses(items)
    setChooseGroup(null)
  }

  async function handleMarkTaken(med: MedicationWithStatus, scheduleTime: string) {
    if (!user) return
    const key = `${med.id}-${scheduleTime}`
    setBusySlot(key)
    setError(null)
    try {
      await markDoseTaken(user.id, med.id, scheduleTime)
      await reload()
      await refreshStreakStats()
      setBadgeReplayKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log dose')
    } finally {
      setBusySlot(null)
    }
  }

  async function handleUndo(med: MedicationWithStatus, slot: DoseSlotStatus) {
    if (!slot.doseLogId) return
    const key = `${med.id}-${slot.time}`
    setBusySlot(key)
    setError(null)
    try {
      await undoDose(slot.doseLogId, med.id)
      await reload()
      await refreshStreakStats()
      setBadgeReplayKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not undo dose')
    } finally {
      setBusySlot(null)
    }
  }

  async function handleLogPrn(med: MedicationWithStatus, payload: PrnDoseLogPayload) {
    if (!user) return
    const key = `${med.id}-prn`
    setBusySlot(key)
    setError(null)
    try {
      await markPrnDoseTaken(user.id, med.id, payload)
      await reload()
      await refreshStreakStats()
      setBadgeReplayKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log dose')
    } finally {
      setBusySlot(null)
    }
  }

  async function handleMoveToAsNeeded(med: MedicationWithStatus) {
    if (
      !confirm(
        `Move ${med.name} to as needed?\n\nFixed dose times will be removed. Doses you already logged today stay on this medication.`,
      )
    ) {
      return
    }
    setBusySlot(`${med.id}-migrate-prn`)
    setError(null)
    try {
      await migrateMedicationToAsNeeded(med.id)
      await reload()
      setTodayTab('as_needed')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not move medication to as needed',
      )
    } finally {
      setBusySlot(null)
    }
  }

  async function handleMoveToDailySchedule(med: MedicationWithStatus) {
    if (
      !confirm(
        `Move ${med.name} to a daily schedule?\n\nA default morning dose time (8:00 AM) will be added. Edit the medication to change or add times. PRN logs from today stay in your history.`,
      )
    ) {
      return
    }
    setBusySlot(`${med.id}-migrate-daily`)
    setError(null)
    try {
      await migrateMedicationToScheduled(med.id)
      await reload()
      await refreshStreakStats()
      setTodayTab('scheduled')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not move medication to daily schedule',
      )
    } finally {
      setBusySlot(null)
    }
  }

  async function handleDelete(med: MedicationWithStatus) {
    if (!confirm(`Delete ${med.name}? This cannot be undone.`)) return
    setBusySlot(med.id)
    try {
      await deleteMedication(med.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    } finally {
      setBusySlot(null)
    }
  }

  const { taken: dosesTaken, total: dosesTotal } = todayDoseTotals(medications)
  const scheduledMeds = useMemo(
    () => medications.filter((m) => !isAsNeededMed(m)),
    [medications],
  )
  const prnMeds = useMemo(
    () => medications.filter((m) => isAsNeededMed(m)),
    [medications],
  )
  const visibleMeds = todayTab === 'scheduled' ? scheduledMeds : prnMeds
  const prnLoggedToday = prnMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0)
  const refillAlerts = getRefillAlerts(medications)
  const batchDoseBusy = busySlot === BATCH_DOSE_BUSY

  const takeAllGroups = useMemo(
    () => (todayTab === 'scheduled' ? buildSameTimePendingGroups(visibleMeds) : []),
    [todayTab, visibleMeds],
  )

  const scheduleTimeSections = useMemo(
    () => (todayTab === 'scheduled' ? buildScheduleTimeSections(visibleMeds) : []),
    [todayTab, visibleMeds],
  )

  const useTimeSections = todayTab === 'scheduled' && scheduleTimeSections.length > 0

  function renderMedCard(med: MedicationWithStatus, visibleScheduleTime?: string) {
    return (
      <MedicationCard
        medication={med}
        busySlot={busySlot}
        visibleScheduleTime={visibleScheduleTime}
        onMarkTaken={(time) => handleMarkTaken(med, time)}
        onLogPrn={(payload) => handleLogPrn(med, payload)}
        onUndo={(slot) => handleUndo(med, slot)}
        onEdit={() => {
          setEditing(med)
          setFormOpen(true)
        }}
        onMoveToAsNeeded={() => handleMoveToAsNeeded(med)}
        onMoveToDailySchedule={() => handleMoveToDailySchedule(med)}
        onDelete={() => handleDelete(med)}
      />
    )
  }

  function renderSameTimeBar(group: SameTimeDoseGroup) {
    if (sameTimeMode === 'individual' || group.pending.length < 2) return null
    return (
      <SameTimeDoseGroupBar
        group={group}
        mode={sameTimeMode}
        disabled={busySlot != null}
        busy={batchDoseBusy}
        onTakeAll={() => void handleTakeAllAtTime(group.pending, group.label)}
        onChoose={() => openChooseGroup(group)}
      />
    )
  }

  function renderDoseList() {
    if (useTimeSections) {
      return scheduleTimeSections.map((section) => (
        <li key={section.time} className="today-time-section">
          <div className="today-time-section-header">
            <h4 className="today-time-section-title">{section.label}</h4>
            {renderSameTimeBar({
              time: section.time,
              label: section.label,
              pending: section.pending,
            })}
          </div>
          <ul className="med-list med-list-nested">
            {section.meds.map((med) => (
              <li key={`${med.id}-${section.time}`}>{renderMedCard(med, section.time)}</li>
            ))}
          </ul>
        </li>
      ))
    }

    return (
      <>
        {sameTimeMode !== 'individual' && takeAllGroups.length > 0 ? (
          <li className="today-same-time-batch-row">
            {takeAllGroups.map((group) => (
              <div key={group.time} className="today-same-time-batch-card">
                <div>
                  <strong>{group.label}</strong>
                  <p className="field-hint">{group.pending.length} doses ready</p>
                </div>
                {renderSameTimeBar(group)}
              </div>
            ))}
          </li>
        ) : null}
        {visibleMeds.map((med) => (
          <li key={med.id}>{renderMedCard(med)}</li>
        ))}
      </>
    )
  }

  const summaryText =
    todayTab === 'scheduled'
      ? dosesTotal === 0
        ? scheduledMeds.length === 0
          ? 'No daily medications yet'
          : 'No dose times scheduled today'
        : `${dosesTaken} of ${dosesTotal} dose${dosesTotal === 1 ? '' : 's'} taken`
      : prnMeds.length === 0
        ? 'No as-needed medications yet'
        : prnLoggedToday === 0
          ? 'Log a dose when you take one'
          : `${prnLoggedToday} dose${prnLoggedToday === 1 ? '' : 's'} logged today`

  return (
    <>
      <main className="page dashboard">
        <section className="today-summary">
          <h2>Today</h2>
          <p>{summaryText}</p>
          {todayTab === 'scheduled' && (
            <StreakSnippet stats={streakStats} badgeReplayKey={badgeReplayKey} />
          )}
        </section>

        <div
          className="today-tabs"
          role="tablist"
          aria-label="Medication schedule type"
          data-tour="today-tabs"
        >
          <button
            type="button"
            role="tab"
            id="today-tab-scheduled"
            aria-selected={todayTab === 'scheduled'}
            aria-controls="today-panel-scheduled"
            className={`today-tab${todayTab === 'scheduled' ? ' active' : ''}`}
            onClick={() => setTodayTab('scheduled')}
          >
            Daily schedule
            {scheduledMeds.length > 0 && (
              <span className="today-tab-count">{scheduledMeds.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            id="today-tab-prn"
            aria-selected={todayTab === 'as_needed'}
            aria-controls="today-panel-prn"
            className={`today-tab${todayTab === 'as_needed' ? ' active' : ''}`}
            data-tour="today-tab-prn"
            onClick={() => setTodayTab('as_needed')}
          >
            As needed
            {prnMeds.length > 0 && (
              <span className="today-tab-count">{prnMeds.length}</span>
            )}
          </button>
        </div>

        <RefillBanner alerts={refillAlerts} />
        <DueNowBanner items={missedDoses} />
        {!missedBannerDismissed && (
          <MissedDosesBanner
            items={missedDoses}
            onDismiss={() => {
              dismissMissedDosesBanner(todayLocalDate())
              setMissedBannerDismissed(true)
            }}
          />
        )}
        <InteractionAlert medicationNames={medications.map((m) => m.name)} />

        {error && <p className="banner banner-error">{error}</p>}

        {loading ? (
          <p className="loading">Loading medications…</p>
        ) : medications.length === 0 ? (
          <div className="empty-state">
            <p>No medications yet.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openAddForm('scheduled')}
            >
              Add your first medication
            </button>
          </div>
        ) : visibleMeds.length === 0 ? (
          <div
            className="empty-state"
            role="tabpanel"
            id={todayTab === 'scheduled' ? 'today-panel-scheduled' : 'today-panel-prn'}
            aria-labelledby={
              todayTab === 'scheduled' ? 'today-tab-scheduled' : 'today-tab-prn'
            }
          >
            <p>
              {todayTab === 'scheduled'
                ? 'No daily medications yet. Add one with fixed reminder times.'
                : 'No as-needed medications yet. Add PRN meds like pain relievers or rescue inhalers.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openAddForm(todayTab === 'scheduled' ? 'scheduled' : 'as_needed')}
            >
              {todayTab === 'scheduled' ? 'Add daily medication' : 'Add as-needed medication'}
            </button>
          </div>
        ) : (
          <ul
            className="med-list"
            role="tabpanel"
            id={todayTab === 'scheduled' ? 'today-panel-scheduled' : 'today-panel-prn'}
            aria-labelledby={
              todayTab === 'scheduled' ? 'today-tab-scheduled' : 'today-tab-prn'
            }
          >
            {renderDoseList()}
          </ul>
        )}

        <SameTimeDoseChooseModal
          open={chooseGroup != null}
          group={chooseGroup}
          selectedKeys={chooseSelected}
          busy={batchDoseBusy}
          onToggle={(key) => {
            setChooseSelected((prev) => {
              const next = new Set(prev)
              if (next.has(key)) next.delete(key)
              else next.add(key)
              return next
            })
          }}
          onSelectAll={() => {
            if (!chooseGroup) return
            setChooseSelected(
              new Set(
                chooseGroup.pending.map((item) =>
                  sameTimePendingItemKey(item.med.id, item.time),
                ),
              ),
            )
          }}
          onClearAll={() => setChooseSelected(new Set())}
          onConfirm={() => void confirmChooseGroup()}
          onClose={() => setChooseGroup(null)}
        />

        <TodayWellnessCheckIn />
      </main>

      {celebrationStreak !== null && (
        <StreakCelebration
          streakDays={celebrationStreak}
          onDismiss={dismissCelebration}
        />
      )}

      {formOpen && (
        <MedicationForm
          key={
            editing
              ? `${editing.id}-${editing.updated_at}`
              : 'new'
          }
          initial={editing}
          defaultScheduleType={addScheduleType}
          existingMedicationNames={medications.map((m) => m.name)}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      )}
    </>
  )
}
