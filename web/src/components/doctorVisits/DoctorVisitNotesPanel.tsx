import type { DoctorVisitInput } from '../../lib/doctorVisits'
import { IsoDateInput } from '../IsoDateInput'

type DoctorVisitNotesPanelProps = {
  value: DoctorVisitInput
  onChange: (next: DoctorVisitInput) => void
  onSave: () => void
  onDiscard: () => void
  busy?: boolean
  canSave?: boolean
}

export function DoctorVisitNotesPanel({
  value,
  onChange,
  onSave,
  onDiscard,
  busy = false,
  canSave = true,
}: DoctorVisitNotesPanelProps) {
  function setField<K extends keyof DoctorVisitInput>(key: K, fieldValue: DoctorVisitInput[K]) {
    onChange({ ...value, [key]: fieldValue })
  }

  return (
    <div className="doctor-visit-subpanel doctor-visit-notes-panel">
      <h4 className="doctor-visit-subpanel-title">Visit notes</h4>
      <p className="field-hint doctor-visit-section-hint">
        What your doctor said, next steps, and anything to remember — saved separately from
        appointment details.
      </p>

      {!canSave && (
        <p className="field-hint doctor-visit-notes-locked-hint" role="status">
          Save appointment details first, then add notes here.
        </p>
      )}

      <form
        className="doctor-visit-form doctor-visit-form-panel"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}
      >
        <fieldset className="cycle-day-log-fields doctor-visit-notes-fields" disabled={!canSave}>
          <label className="cycle-notes-label">
            Notes
            <textarea
              rows={6}
              value={value.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="What your doctor said, next steps, medication changes, questions to follow up on…"
            />
          </label>

          <label className="cycle-notes-label">
            Follow-up date (optional)
            <IsoDateInput
              value={value.follow_up_date}
              onChange={(follow_up_date) => setField('follow_up_date', follow_up_date)}
              aria-label="Follow-up date"
            />
          </label>
        </fieldset>

        <div className="cycle-day-log-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !canSave}>
            {busy ? 'Saving…' : 'Save notes'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy || !canSave}
            onClick={onDiscard}
          >
            Discard edits
          </button>
        </div>
      </form>
    </div>
  )
}
