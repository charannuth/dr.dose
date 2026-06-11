import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MedicalRecordsForm } from '../components/MedicalRecordsForm'
import { useAuth } from '../hooks/useAuth'
import type { BodyMetricUnit } from '../lib/bodyMetrics'
import {
  formatHeightForUnit,
  formatWeightForUnit,
  normalizeBodyMetricUnit,
} from '../lib/bodyMetrics'
import {
  emptyMedicalRecordInput,
  fetchMedicalRecord,
  isMedicalRecordFilled,
  recordToInput,
  updateBodyMetricUnits,
  upsertMedicalRecord,
  type MedicalRecordInput,
} from '../lib/medicalRecords'

export function MedicalRecordsPage() {
  const { user } = useAuth()
  const [draft, setDraft] = useState<MedicalRecordInput>(emptyMedicalRecordInput())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const draftDirtyRef = useRef(false)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    let active = true

    fetchMedicalRecord(userId)
      .then((record) => {
        if (!active || draftDirtyRef.current) return
        const next = recordToInput(record)
        setDraft(next)
        setExpanded(!isMedicalRecordFilled(next))
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load medical record')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  function handleDraftChange(next: MedicalRecordInput) {
    draftDirtyRef.current = true
    setDraft(next)
  }

  async function handleHeightUnitChange(unit: BodyMetricUnit) {
    draftDirtyRef.current = true
    setDraft((d) => ({ ...d, height_unit: unit }))
    if (!userId) return
    try {
      const saved = await updateBodyMetricUnits(userId, { height_unit: unit })
      setDraft((d) => ({
        ...d,
        height_unit: normalizeBodyMetricUnit(saved.height_unit),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference')
    }
  }

  async function handleWeightUnitChange(unit: BodyMetricUnit) {
    draftDirtyRef.current = true
    setDraft((d) => ({ ...d, weight_unit: unit }))
    if (!userId) return
    try {
      const saved = await updateBodyMetricUnits(userId, { weight_unit: unit })
      setDraft((d) => ({
        ...d,
        weight_unit: normalizeBodyMetricUnit(saved.weight_unit),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference')
    }
  }

  async function handleSave() {
    if (!userId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await upsertMedicalRecord(userId, draft)
      setDraft(recordToInput(saved))
      draftDirtyRef.current = false
      setMessage('Medical record saved.')
      setExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save medical record')
    } finally {
      setBusy(false)
    }
  }

  const filled = isMedicalRecordFilled(draft)
  const heightSummary = formatHeightForUnit(
    draft.height_cm ? Number(draft.height_cm) : null,
    normalizeBodyMetricUnit(draft.height_unit),
  )
  const weightSummary = formatWeightForUnit(
    draft.weight_kg ? Number(draft.weight_kg) : null,
    normalizeBodyMetricUnit(draft.weight_unit),
  )

  return (
    <main className="page medical-records-page">
      <header className="page-header">
        <h2>Medical records</h2>
        <p className="page-subtitle">
          Self-reported history — allergies, conditions, and optional profile basics
        </p>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {message && <p className="banner banner-success-style">{message}</p>}

      {loading ? (
        <p className="loading">Loading medical record…</p>
      ) : (
        <>
          {!filled && (
            <p className="field-hint medical-records-empty-hint">
              Add your allergies so we can flag possible matches when you add medications
              on <Link to="/">Today</Link> or run a{' '}
              <Link to="/interactions">drug safety check</Link>.
            </p>
          )}

          <section className="medical-records-saved">
            <div className="medical-records-saved-header">
              <h3>Medical record</h3>
              {!expanded && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExpanded(true)}
                >
                  Edit
                </button>
              )}
            </div>

            {!expanded && filled ? (
              <div className="medical-records-saved-body" role="status">
                <div className="medical-records-saved-summary">
                  {draft.date_of_birth ? <span>DOB: <strong>{draft.date_of_birth}</strong></span> : null}
                  {draft.gender ? <span>Gender: <strong>{draft.gender}</strong></span> : null}
                  {heightSummary ? <span>Height: <strong>{heightSummary}</strong></span> : null}
                  {weightSummary ? <span>Weight: <strong>{weightSummary}</strong></span> : null}
                  {draft.blood_type ? <span>Blood type: <strong>{draft.blood_type}</strong></span> : null}
                </div>

                {draft.known_allergies.length > 0 && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Allergies</span>
                    <span className="medical-records-saved-value">{draft.known_allergies.join(', ')}</span>
                  </div>
                )}
                {draft.known_conditions.length > 0 && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Conditions</span>
                    <span className="medical-records-saved-value">{draft.known_conditions.join(', ')}</span>
                  </div>
                )}
                {draft.past_surgeries.trim() && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Surgeries/hospitalizations</span>
                    <span className="medical-records-saved-value">{draft.past_surgeries}</span>
                  </div>
                )}
                {draft.family_history.trim() && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Family history</span>
                    <span className="medical-records-saved-value">{draft.family_history}</span>
                  </div>
                )}
                {draft.emergency_notes.trim() && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Emergency notes</span>
                    <span className="medical-records-saved-value">{draft.emergency_notes}</span>
                  </div>
                )}
                {draft.other_notes.trim() && (
                  <div className="medical-records-saved-row">
                    <span className="medical-records-saved-label">Other notes</span>
                    <span className="medical-records-saved-value">{draft.other_notes}</span>
                  </div>
                )}

                <p className="field-hint">
                  Everything is saved to your account. Click <strong>Edit</strong> to update anything later.
                </p>
              </div>
            ) : (
              <MedicalRecordsForm
                value={draft}
                onChange={handleDraftChange}
                onHeightUnitChange={(unit) => void handleHeightUnitChange(unit)}
                onWeightUnitChange={(unit) => void handleWeightUnitChange(unit)}
                onSubmit={() => void handleSave()}
                busy={busy}
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}
