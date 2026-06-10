import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatDisplayDate, formatTakenTime, todayLocalDate } from '../lib/dates'
import {
  groupDaySlotsByMedication,
  type DayDetail,
} from '../lib/dayDetail'
import { formatWellnessLogSummary } from '../lib/wellness'
import type { StreakDayStatus } from '../lib/streaks'

const STATUS_LABEL: Record<StreakDayStatus, string> = {
  perfect: 'Perfect day',
  partial: 'Partial adherence',
  missed: 'Missed doses',
  none: 'No doses scheduled',
}

type DayAdherenceDetailProps = {
  detail: DayDetail | null
  loading: boolean
  error: string | null
  streakStatus?: StreakDayStatus
  showHistoryLink?: boolean
  onClear?: () => void
}

export function DayAdherenceDetail({
  detail,
  loading,
  error,
  streakStatus,
  showHistoryLink = true,
  onClear,
}: DayAdherenceDetailProps) {
  const panelRef = useRef<HTMLElement>(null)
  const isToday = detail?.date === todayLocalDate()

  useEffect(() => {
    if (detail && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [detail])

  if (!detail && !loading && !error) return null

  const groups = detail ? groupDaySlotsByMedication(detail.slots) : []
  const takenCount = detail?.slots.filter((s) => s.taken).length ?? 0
  const totalCount = detail?.slots.length ?? 0

  return (
    <section
      ref={panelRef}
      className="day-adherence-detail"
      aria-labelledby="day-adherence-heading"
    >
      {loading && <p className="loading">Loading day…</p>}
      {error && <p className="banner banner-error">{error}</p>}

      {detail && !loading && (
        <>
          <header className="day-adherence-header">
            <div>
              <h3 id="day-adherence-heading">{formatDisplayDate(detail.date)}</h3>
              {streakStatus && (
                <p className={`day-adherence-status day-adherence-status-${streakStatus}`}>
                  {STATUS_LABEL[streakStatus]}
                  {detail.hasScheduledMeds && (
                    <>
                      {' '}
                      · {takenCount} of {totalCount} dose{totalCount === 1 ? '' : 's'} logged
                    </>
                  )}
                </p>
              )}
            </div>
            {onClear && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
                Close
              </button>
            )}
          </header>

          {detail.hasScheduledMeds ? (
            <ul className="day-adherence-meds">
              {groups.map((group) => (
                <li key={group.medicationId} className="day-adherence-med">
                  <div className="day-adherence-med-head">
                    <span className="day-adherence-med-name">{group.medicationName}</span>
                    {group.doseLabel && (
                      <span className="day-adherence-med-dose">{group.doseLabel}</span>
                    )}
                  </div>
                  {group.medicationNotes && (
                    <p className="day-adherence-med-notes">{group.medicationNotes}</p>
                  )}
                  <ul className="day-adherence-slots">
                    {group.slots.map((slot) => (
                      <li
                        key={`${slot.medicationId}-${slot.scheduleTime}`}
                        className={`day-adherence-slot${slot.taken ? ' day-adherence-slot-taken' : ' day-adherence-slot-missed'}`}
                      >
                        <span className="day-adherence-slot-time">{slot.scheduleLabel}</span>
                        <span className="day-adherence-slot-status">
                          {slot.taken ? (
                            <>
                              <span className="day-adherence-badge day-adherence-badge-taken">
                                Taken
                              </span>
                              {slot.takenAt && (
                                <span className="day-adherence-taken-at">
                                  {formatTakenTime(slot.takenAt)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="day-adherence-badge day-adherence-badge-missed">
                              Not logged
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="day-adherence-empty">
              No medications were scheduled for this day.
            </p>
          )}

          <div className="day-adherence-wellness">
            <h4 className="day-adherence-section-title">Daily check-in</h4>
            {detail.wellnessFilled && detail.wellnessLog ? (
              <>
                <p className="day-adherence-wellness-summary">
                  {formatWellnessLogSummary(detail.wellnessLog)}
                </p>
                {detail.wellnessLog.notes.trim() && (
                  <blockquote className="day-adherence-wellness-notes">
                    {detail.wellnessLog.notes.trim()}
                  </blockquote>
                )}
                {detail.wellnessLog.symptoms.length > 0 && (
                  <p className="day-adherence-wellness-symptoms">
                    <strong>Symptoms:</strong> {detail.wellnessLog.symptoms.join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="day-adherence-wellness-empty">No wellness check-in for this day.</p>
            )}
            <Link
              to="/wellness"
              state={{ wellnessDate: detail.date }}
              className="day-adherence-link"
            >
              {detail.wellnessFilled ? 'View or edit on Wellness' : 'Add check-in on Wellness'}
            </Link>
          </div>

          <div className="day-adherence-actions">
            {isToday && detail.hasScheduledMeds && takenCount < totalCount && (
              <Link to="/" className="btn btn-primary btn-sm">
                Log doses on Today
              </Link>
            )}
            {showHistoryLink && (
              <Link
                to="/history"
                state={{ historyDate: detail.date }}
                className="btn btn-ghost btn-sm"
              >
                Open in History
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  )
}
