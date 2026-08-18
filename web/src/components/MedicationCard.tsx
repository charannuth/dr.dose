import { formatDoseDisplay } from '../lib/dose'
import { formatInventoryRemaining } from '../lib/inventory'
import { formatMedicationType } from '../lib/medicationForms'
import { formatMedicationDateRange } from '../lib/medicationDates'
import { isAsNeededMed } from '../lib/medicationSchedule'
import type { DoseSlotStatus, MedicationWithStatus } from '../lib/types'
import type { PrnDoseLogPayload } from '../lib/prnCheckIn'
import { PrnDoseLogPanel } from './PrnDoseLogPanel'

type MedicationCardProps = {
  medication: MedicationWithStatus
  onMarkTaken: (scheduleTime: string) => void
  onLogPrn?: (payload: PrnDoseLogPayload) => void
  onUndo: (slot: DoseSlotStatus) => void
  onEdit: () => void
  onMoveToAsNeeded?: () => void
  onMoveToDailySchedule?: () => void
  onDelete: () => void
  busySlot: string | null
  /** When set, only show the dose slot at this schedule time (HH:mm). */
  visibleScheduleTime?: string
}

export function MedicationCard({
  medication,
  onMarkTaken,
  onLogPrn,
  onUndo,
  onEdit,
  onMoveToAsNeeded,
  onMoveToDailySchedule,
  onDelete,
  busySlot,
  visibleScheduleTime,
}: MedicationCardProps) {
  const asNeeded = isAsNeededMed(medication)
  const slotSource = visibleScheduleTime
    ? medication.slots.filter((s) => s.time === visibleScheduleTime)
    : medication.slots
  if (visibleScheduleTime && slotSource.length === 0) {
    return null
  }
  const migrateToPrnBusy = busySlot === `${medication.id}-migrate-prn`
  const migrateToDailyBusy = busySlot === `${medication.id}-migrate-daily`
  const lowSupply =
    medication.pills_remaining != null && medication.pills_remaining <= 7

  const { dosesTakenToday, dosesTotalToday, allDosesTakenToday } = medication
  const showDateRange = Boolean(medication.end_date)
  const typeLabel = formatMedicationType(
    medication.medication_route,
    medication.medication_form,
  )
  const prnBusy = busySlot === `${medication.id}-prn`
  const maxPrn = medication.max_doses_per_day

  return (
    <article
      className={`med-card ${!asNeeded && allDosesTakenToday ? 'taken' : ''}${asNeeded ? ' med-card-prn' : ''}`}
    >
      <div className="med-card-header">
        <div>
          <h3>{medication.name}</h3>
          {typeLabel && <p className="med-type-label">{typeLabel}</p>}
          <p className="med-dosage">
            {formatDoseDisplay(medication)}
            {asNeeded
              ? ' · as needed (PRN)'
              : dosesTotalToday > 1
                ? ` · ${dosesTotalToday} doses per day`
                : dosesTotalToday === 1
                  ? ' · once daily'
                  : ''}
          </p>
        </div>
        {asNeeded ? (
          dosesTakenToday > 0 ? (
            <span className="badge badge-partial">
              {maxPrn != null && maxPrn > 0
                ? `${dosesTakenToday}/${maxPrn} today`
                : `${dosesTakenToday} logged today`}
            </span>
          ) : (
            <span className="badge badge-pending">As needed</span>
          )
        ) : dosesTotalToday > 0 ? (
          allDosesTakenToday ? (
            <span className="badge badge-success">All doses taken</span>
          ) : dosesTakenToday > 0 ? (
            <span className="badge badge-partial">
              {dosesTakenToday}/{dosesTotalToday} doses
            </span>
          ) : (
            <span className="badge badge-pending">Due today</span>
          )
        ) : (
          <span className="badge badge-pending">No times set</span>
        )}
      </div>

      {showDateRange && (
        <p className="med-date-range">{formatMedicationDateRange(medication)}</p>
      )}

      {medication.notes && <p className="med-notes">{medication.notes}</p>}

      {medication.pills_remaining != null && (
        <p className={`med-pills ${lowSupply ? 'low' : ''}`}>
          {formatInventoryRemaining(medication.pills_remaining, medication)}
          {lowSupply && ' — refill soon'}
        </p>
      )}

      {asNeeded ? (
        <>
          <PrnDoseLogPanel
            medication={medication}
            disabled={prnBusy}
            onLog={(payload) => onLogPrn?.(payload)}
          />
          {medication.slots.length > 0 ? (
            <ul className="dose-slots dose-slots-prn">
              {medication.slots.map((slot, index) => {
                const slotKey = `${medication.id}-${slot.time}`
                const busy = busySlot === slotKey
                return (
                  <li
                    key={`${slot.time}-${index}`}
                    className="dose-slot dose-slot-taken"
                  >
                    <span className="dose-slot-time">Taken {slot.label}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => onUndo(slot)}
                    >
                      {busy ? '…' : 'Undo'}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="med-times med-times-empty">No doses logged today yet.</p>
          )}
        </>
      ) : slotSource.length > 0 ? (
        <ul className="dose-slots">
          {slotSource.map((slot, index) => {
            const slotKey = `${medication.id}-${slot.time}`
            const busy = busySlot === slotKey
            return (
              <li
                key={`${slot.time}-${index}`}
                className={`dose-slot ${slot.taken ? 'dose-slot-taken' : ''}`}
              >
                <span className="dose-slot-time">{slot.label}</span>
                {slot.taken ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => onUndo(slot)}
                  >
                    {busy ? '…' : 'Undo'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => onMarkTaken(slot.time)}
                  >
                    {busy ? '…' : 'Mark taken'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="med-times med-times-empty">
          Add dose times when editing this medication.
        </p>
      )}

      <div className="med-card-actions">
        {!asNeeded && onMoveToAsNeeded && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={migrateToPrnBusy}
            onClick={onMoveToAsNeeded}
          >
            {migrateToPrnBusy ? '…' : 'Move to as needed'}
          </button>
        )}
        {asNeeded && onMoveToDailySchedule && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={migrateToDailyBusy}
            onClick={onMoveToDailySchedule}
          >
            {migrateToDailyBusy ? '…' : 'Move to daily schedule'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn-ghost danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  )
}
