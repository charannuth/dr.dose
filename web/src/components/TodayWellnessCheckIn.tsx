import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWellnessTodayLog } from '../hooks/useWellnessTodayLog'
import {
  isWellnessLogFilled,
  upsertWellnessLog,
} from '../lib/wellness'
import { todayLocalDate } from '../lib/dates'
import { WellnessDisclaimer } from './WellnessDisclaimer'
import { WellnessDailyForm } from './WellnessDailyForm'
import { formatWellnessLogSummary } from '../lib/wellness'

export function TodayWellnessCheckIn() {
  const { user } = useAuth()
  const today = todayLocalDate()
  const {
    draft,
    setDraft,
    saved,
    setSaved,
    trackedSymptoms,
    loading,
    error,
    setError,
  } = useWellnessTodayLog(user?.id, today)

  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    if (!user) return
    if (!isWellnessLogFilled(draft)) {
      setError('Add at least one field before saving.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await upsertWellnessLog(user.id, draft)
      setSaved({ ...draft })
      setExpanded(false)
      setMessage('Check-in saved. Share these notes with your doctor when you visit.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save check-in')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="wellness-card wellness-checkin">
        <p className="loading">Loading daily check-in…</p>
      </section>
    )
  }

  const complete = saved != null && isWellnessLogFilled(saved)

  return (
    <section
      className="wellness-card wellness-checkin"
      data-tour="wellness-checkin"
      aria-labelledby="checkin-title"
    >
      <div className="wellness-checkin-header">
        <div>
          <h3 id="checkin-title">Daily check-in</h3>
          <p className="field-hint">
            Log sleep, energy, and symptoms to discuss with your clinician — best
            done in the evening.
          </p>
        </div>
        <Link to="/wellness" className="wellness-checkin-link">
          Wellness →
        </Link>
      </div>

      <WellnessDisclaimer compact />

      {error && <p className="banner banner-error">{error}</p>}
      {message && <p className="banner banner-success-style">{message}</p>}

      {complete && !expanded ? (
        <div className="wellness-checkin-done">
          <p className="wellness-checkin-summary">{formatWellnessLogSummary(saved)}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDraft(saved)
              setExpanded(true)
            }}
          >
            Edit today
          </button>
        </div>
      ) : (
        <>
          {!expanded && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setExpanded(true)}
            >
              {complete ? 'Edit check-in' : 'Log how today went'}
            </button>
          )}
          {expanded && (
            <WellnessDailyForm
              compact
              value={draft}
              onChange={setDraft}
              onSubmit={() => void handleSave()}
              busy={busy}
              submitLabel="Save check-in"
              trackedSymptoms={trackedSymptoms}
            />
          )}
        </>
      )}
    </section>
  )
}
