import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTrackingCalendarData } from '../hooks/useTrackingCalendarData'
import { PhysicalProfileForm } from '../components/PhysicalProfileForm'
import { CycleTrackerPanel } from '../components/tracking/CycleTrackerPanel'
import { HrtTrackerPanel } from '../components/tracking/HrtTrackerPanel'
import { MedProgressPanel } from '../components/tracking/MedProgressPanel'
import { WeightTrackerPanel } from '../components/tracking/WeightTrackerPanel'
import { TrackingCalendar } from '../components/tracking/TrackingCalendar'
import {
  calendarSourceOptions,
  calendarSupportFor,
  defaultCalendarSource,
  type CalendarSourceId,
} from '../lib/tracking/calendarSources'
import type { CalendarViewRange } from '../lib/tracking/calendarRange'
import { normalizeBodyMetricUnit, type BodyMetricUnit } from '../lib/bodyMetrics'
import { todayLocalDate } from '../lib/dates'
import { updateBodyMetricUnits } from '../lib/medicalRecords'
import {
  TRACKER_CATALOG,
  trackerCatalogEntry,
  type TrackerId,
} from '../lib/tracking/catalog'
import {
  disableTracker,
  enableTracker,
  fetchEnabledTrackers,
} from '../lib/tracking/trackers'
import {
  emptyPhysicalProfileInput,
  fetchMedicalRecord,
  isPhysicalProfileFilled,
  physicalProfileFromRecord,
  physicalProfileSummary,
  upsertPhysicalProfile,
  type PhysicalProfileInput,
} from '../lib/physicalProfile'
import type { MedicalRecord } from '../lib/medicalRecords'

export function TrackingPage() {
  const { user } = useAuth()
  const today = todayLocalDate()
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null)
  const [profileDraft, setProfileDraft] = useState<PhysicalProfileInput>(
    emptyPhysicalProfileInput(),
  )
  const [enabled, setEnabled] = useState<TrackerId[]>([])
  const [activeTracker, setActiveTracker] = useState<TrackerId | null>(null)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [addTrackerId, setAddTrackerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [profileBusy, setProfileBusy] = useState(false)
  const [trackerBusy, setTrackerBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [calendarAnchor, setCalendarAnchor] = useState(today)
  const [calendarRange, setCalendarRange] = useState<CalendarViewRange>('month')
  const [calendarSource, setCalendarSource] = useState<CalendarSourceId | null>(null)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const profileDirtyRef = useRef(false)
  const userId = user?.id

  const reload = useCallback(async () => {
    if (!userId) return
    const [record, trackers] = await Promise.all([
      fetchMedicalRecord(userId),
      fetchEnabledTrackers(userId),
    ])
    setMedicalRecord(record)
    if (!profileDirtyRef.current) {
      const filled = isPhysicalProfileFilled(physicalProfileFromRecord(record))
      setProfileDraft(physicalProfileFromRecord(record))
      setProfileExpanded(!filled)
    }
    setEnabled(trackers)
    setActiveTracker((prev) =>
      prev && trackers.includes(prev) ? prev : trackers[0] ?? null,
    )
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    reload()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load tracking')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, reload])

  function handleProfileDraftChange(next: PhysicalProfileInput) {
    profileDirtyRef.current = true
    setProfileDraft(next)
  }

  useEffect(() => {
    setCalendarSource((prev) =>
      defaultCalendarSource(enabled, activeTracker ?? prev),
    )
  }, [enabled, activeTracker])

  useEffect(() => {
    if (activeTracker && calendarSupportFor(activeTracker) !== 'none') {
      setCalendarSource(activeTracker)
    }
  }, [activeTracker])

  function handleCalendarSourceChange(next: CalendarSourceId) {
    setCalendarSource(next)
    if (next !== 'all' && enabled.includes(next)) {
      setActiveTracker(next)
    }
  }

  const calendarOptions = calendarSourceOptions(enabled)
  const showCalendar = calendarOptions.length > 0

  const {
    data: calendarData,
    loading: calendarLoading,
    error: calendarError,
  } = useTrackingCalendarData(
    user?.id,
    calendarSource,
    enabled,
    calendarRange,
    calendarAnchor,
    calendarRefreshKey,
  )

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setCalendarAnchor(date)
  }

  function bumpCalendarRefresh() {
    setCalendarRefreshKey((k) => k + 1)
  }

  async function handleHeightUnitChange(unit: BodyMetricUnit) {
    profileDirtyRef.current = true
    setProfileDraft((d) => ({ ...d, height_unit: unit }))
    if (!userId) return
    try {
      const saved = await updateBodyMetricUnits(userId, { height_unit: unit })
      setMedicalRecord(saved)
      setProfileDraft((d) => ({
        ...d,
        height_unit: normalizeBodyMetricUnit(saved.height_unit),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference')
    }
  }

  async function handleWeightUnitChange(unit: BodyMetricUnit) {
    profileDirtyRef.current = true
    setProfileDraft((d) => ({ ...d, weight_unit: unit }))
    if (!userId) return
    try {
      const saved = await updateBodyMetricUnits(userId, { weight_unit: unit })
      setMedicalRecord(saved)
      setProfileDraft((d) => ({
        ...d,
        weight_unit: normalizeBodyMetricUnit(saved.weight_unit),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference')
    }
  }

  async function handleSaveProfile() {
    if (!userId) return
    setProfileBusy(true)
    setMessage(null)
    setError(null)
    try {
      const saved = await upsertPhysicalProfile(userId, profileDraft, medicalRecord)
      setMedicalRecord(saved)
      setProfileDraft(physicalProfileFromRecord(saved))
      profileDirtyRef.current = false
      setMessage('Physical profile saved.')
      setProfileExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setProfileBusy(false)
    }
  }

  async function handleAddTracker() {
    if (!user || !addTrackerId) return
    const entry = trackerCatalogEntry(addTrackerId as TrackerId)
    if (!entry?.available) return
    if (enabled.includes(addTrackerId as TrackerId)) return
    setTrackerBusy(true)
    setError(null)
    try {
      await enableTracker(user.id, addTrackerId as TrackerId)
      setAddTrackerId('')
      await reload()
      setActiveTracker(addTrackerId as TrackerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable tracker')
    } finally {
      setTrackerBusy(false)
    }
  }

  async function handleRemoveTracker(trackerId: TrackerId) {
    if (!user) return
    if (!confirm(`Remove ${trackerCatalogEntry(trackerId)?.label ?? trackerId} from your trackers?`)) {
      return
    }
    setTrackerBusy(true)
    setError(null)
    try {
      await disableTracker(user.id, trackerId)
      if (activeTracker === trackerId) {
        setActiveTracker(null)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove tracker')
    } finally {
      setTrackerBusy(false)
    }
  }

  const enableableTrackers = TRACKER_CATALOG.filter((t) => t.available)
  const enableableNotEnabled = enableableTrackers.filter((t) => !enabled.includes(t.id))

  const profileSummary = physicalProfileSummary(medicalRecord)

  function renderTrackerPanel(id: TrackerId) {
    switch (id) {
      case 'cycle':
        return (
          <CycleTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        )
      case 'hrt':
        return (
          <HrtTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        )
      case 'weight':
        return (
          <WeightTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        )
      case 'med_progress':
        return <MedProgressPanel />
      default:
        return null
    }
  }

  return (
    <main className="page tracking-page">
      <header className="page-header">
        <h2>Tracking</h2>
        <p className="page-subtitle">
          Optional health modules — enable what you need, skip the rest
        </p>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {calendarError && <p className="banner banner-error">{calendarError}</p>}
      {message && <p className="banner banner-success-style">{message}</p>}

      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <section className="tracking-section tracking-profile-section">
            <div className="tracking-section-toggle" aria-expanded={profileExpanded}>
              <button
                type="button"
                className="tracking-section-toggle-btn"
                onClick={() => setProfileExpanded((v) => !v)}
              >
                <h3>Physical profile</h3>
                {!profileExpanded && profileSummary && (
                  <span className="tracking-section-summary">{profileSummary}</span>
                )}
              </button>
              {!profileExpanded && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setProfileExpanded(true)}
                >
                  Edit
                </button>
              )}
            </div>
            {profileExpanded && (
              <PhysicalProfileForm
                value={profileDraft}
                onChange={handleProfileDraftChange}
                onHeightUnitChange={(unit) => void handleHeightUnitChange(unit)}
                onWeightUnitChange={(unit) => void handleWeightUnitChange(unit)}
                onSubmit={() => void handleSaveProfile()}
                busy={profileBusy}
              />
            )}
          </section>

          <section className="tracking-section">
            <h3>My trackers</h3>
            <p className="field-hint">
              Enabled trackers are saved to your account and will still be here when you log back in.
              Remove a tracker to stop tracking it.
            </p>
            {enabled.length === 0 ? (
              <p className="field-hint">
                Choose a tracker below to get started. Wellness stays on its own page for now.
              </p>
            ) : (
              <div className="tracker-tabs" role="tablist" aria-label="Enabled trackers">
                {enabled.map((id) => {
                  const entry = trackerCatalogEntry(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeTracker === id}
                      className={`tracker-tab${activeTracker === id ? ' active' : ''}`}
                      onClick={() => setActiveTracker(id)}
                    >
                      {entry?.label ?? id}
                    </button>
                  )
                })}
              </div>
            )}

            {showCalendar && calendarSource && (
              <TrackingCalendar
                today={today}
                anchor={calendarAnchor}
                range={calendarRange}
                source={calendarSource}
                selectedDate={selectedDate}
                enabledTrackers={enabled}
                data={calendarData}
                loading={calendarLoading}
                onAnchorChange={setCalendarAnchor}
                onRangeChange={setCalendarRange}
                onSourceChange={handleCalendarSourceChange}
                onSelectDate={handleSelectDate}
              />
            )}

            <div className="tracking-add-row">
              <label className="tracking-add-label">
                Add tracker
                <select
                  value={addTrackerId}
                  onChange={(e) => setAddTrackerId(e.target.value)}
                  disabled={enableableTrackers.length === 0 || trackerBusy}
                >
                  <option value="">
                    {enableableNotEnabled.length === 0
                      ? 'All trackers enabled'
                      : 'Choose…'}
                  </option>
                  {enableableTrackers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {enabled.includes(t.id) ? ' (Currently tracking)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !addTrackerId ||
                  trackerBusy ||
                  enabled.includes(addTrackerId as TrackerId)
                }
                onClick={() => void handleAddTracker()}
              >
                Enable
              </button>
            </div>

            {activeTracker && enabled.includes(activeTracker) && (
              <div
                className="tracking-module-panel"
                role="tabpanel"
                id={`tracker-panel-${activeTracker}`}
              >
                <div className="tracking-module-header">
                  <h4>{trackerCatalogEntry(activeTracker)?.label}</h4>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm danger"
                    disabled={trackerBusy}
                    onClick={() => void handleRemoveTracker(activeTracker)}
                  >
                    Remove
                  </button>
                </div>
                <p className="field-hint">
                  {trackerCatalogEntry(activeTracker)?.description}
                </p>
                {renderTrackerPanel(activeTracker)}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
