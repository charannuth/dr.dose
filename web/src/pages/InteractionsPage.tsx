import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMedicalRecordAllergies } from '../hooks/useMedicalRecordAllergies'
import { checkDrugAllergies, type AllergyWarning } from '../lib/allergyCheck'
import { checkDrugConditions, type ConditionWarning } from '../lib/conditionCheck'
import {
  checkMedicationInteractions,
  interactionsInvolvingDrug,
  severityLabel,
  type FoundInteraction,
  type InteractionCheckResult,
} from '../lib/drugInteractions'
import { MedicationNameInput } from '../components/MedicationNameInput'
import { filterMedicationsActiveOn } from '../lib/medicationDates'
import { openRows } from '../lib/crypto/seal'
import { supabase } from '../lib/supabase'
import { todayLocalDate } from '../lib/dates'
import type { Medication } from '../lib/types'

export function InteractionsPage() {
  const { user } = useAuth()
  const { allergies, conditions } = useMedicalRecordAllergies(user?.id)
  const [result, setResult] = useState<InteractionCheckResult | null>(null)
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([])
  const [conditionWarnings, setConditionWarnings] = useState<ConditionWarning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [extraDrug, setExtraDrug] = useState('')
  const [rechecking, setRechecking] = useState(false)
  const [lastCheckedDrug, setLastCheckedDrug] = useState<string | null>(null)

  const runMedicalRecordCheck = useCallback(
    async (names: string[]) => {
      const allergyHits: AllergyWarning[] = []
      const conditionHits: ConditionWarning[] = []
      for (const name of names) {
        if (allergies.length > 0) {
          allergyHits.push(...(await checkDrugAllergies(name, allergies)))
        }
        if (conditions.length > 0) {
          conditionHits.push(...(await checkDrugConditions(name, conditions)))
        }
      }
      setAllergyWarnings(allergyHits)
      setConditionWarnings(conditionHits)
    },
    [allergies, conditions],
  )

  const runCheck = useCallback(
    async (names: string[]) => {
      setError(null)
      const data = await checkMedicationInteractions(names)
      setResult(data)
      await runMedicalRecordCheck(names)
    },
    [runMedicalRecordCheck],
  )

  useEffect(() => {
    if (!user) return

    let active = true

    async function load() {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        if (!supabase) {
          setError('Supabase is not configured')
          return
        }

        const userId = user.id
        const { data, error: fetchError } = await supabase
          .from('medications')
          .select('name, start_date, end_date')
          .eq('user_id', userId)
          .order('name')

        if (fetchError) throw fetchError

        const today = todayLocalDate()
        const activeMeds = filterMedicationsActiveOn(
          openRows(
            'medications',
            (data ?? []) as Record<string, unknown>[],
          ) as Medication[],
          today,
        )
        const names = activeMeds
          .map((m) => m.name)
          .sort((a, b) => a.localeCompare(b))

        if (active) await runCheck(names)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not check interactions')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [user, runCheck])

  async function handleAddExtraDrug(e: React.FormEvent) {
    e.preventDefault()
    if (!result || !extraDrug.trim()) return

    const candidate = extraDrug.trim()
    setRechecking(true)
    try {
      const existing = new Set(result.inputNames.map((n) => n.toLowerCase()))
      const names = existing.has(candidate.toLowerCase())
        ? result.inputNames
        : [...result.inputNames, candidate]
      setLastCheckedDrug(candidate)
      await runCheck(names)
      setExtraDrug('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check interactions')
    } finally {
      setRechecking(false)
    }
  }

  const highlightedInteractions =
    result && lastCheckedDrug
      ? interactionsInvolvingDrug(
          result.interactions,
          lastCheckedDrug,
          result.resolved,
        )
      : []

  const otherInteractions =
    result && lastCheckedDrug
      ? result.interactions.filter(
          (item) =>
            !highlightedInteractions.some(
              (hit) => hit.drugA === item.drugA && hit.drugB === item.drugB,
            ),
        )
      : (result?.interactions ?? [])

  const unresolved = result?.resolved.filter((r) => !r.canonical) ?? []
  const majorCount =
    result?.interactions.filter((i) => i.severity === 'major').length ?? 0

  return (
    <main className="page interactions-page">
      <header className="page-header">
        <h2>Drug interaction check</h2>
        <p className="page-subtitle">
          Cross-reference your active medications for known interaction warnings
        </p>
      </header>

      <div className="interaction-disclaimer" role="note">
        <strong>Not medical advice.</strong> This tool uses a limited reference
        database plus RxNorm name matching. It cannot list every interaction or
        allergy. Always confirm with your doctor or pharmacist before changing
        medications.{' '}
        <Link to="/medical-records">Update medical records</Link> (allergies, conditions).
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      {allergies.length === 0 && conditions.length === 0 && !loading && (
        <p className="banner banner-warning">
          Add allergies and conditions (e.g. asthma) in{' '}
          <Link to="/medical-records">Medical records</Link> to check medications against
          your history.
        </p>
      )}

      {loading ? (
        <p className="loading">Checking your medications…</p>
      ) : result ? (
        <>
          <section className="interaction-summary-card">
            <h3>Your active medications</h3>
            {result.inputNames.length === 0 ? (
              <p>
                No active medications today.{' '}
                <Link to="/account#medications">Add medications</Link> to run a check.
              </p>
            ) : (
              <ul className="interaction-med-list">
                {result.resolved.map((row) => (
                  <li key={row.original}>
                    <span className="interaction-med-name">{row.original}</span>
                    {row.canonical && row.canonical !== normalize(row.original) && (
                      <span className="interaction-med-mapped">
                        → {row.canonical}
                      </span>
                    )}
                    {!row.canonical && (
                      <span className="interaction-med-unknown">
                        — not in reference set
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {result.inputNames.length >= 2 && (
              <p className="interaction-meta">
                Mapped {result.mappedCount} of {result.resolved.length} name
                {result.resolved.length === 1 ? '' : 's'} · checked{' '}
                {result.pairCount} pair{result.pairCount === 1 ? '' : 's'} ·{' '}
                {result.interactions.length} warning
                {result.interactions.length === 1 ? '' : 's'} found
                {majorCount > 0 && (
                  <span className="interaction-major-count">
                    {' '}
                    ({majorCount} major)
                  </span>
                )}
              </p>
            )}

            {result.unmappedCount > 0 && result.inputNames.length >= 2 && (
              <p className="banner banner-warning interaction-map-warning">
                {result.unmappedCount} medication
                {result.unmappedCount === 1 ? ' was' : 's were'} not matched to our
                reference set, so some drug–drug pairs could not be checked. Try the
                generic name (e.g. ibuprofen instead of Advil) or check spelling.
              </p>
            )}
          </section>

          {(allergyWarnings.length > 0 || conditionWarnings.length > 0) && (
            <section className="interaction-allergy-section">
              <h3>Medical record cross-check</h3>
              <p className="field-hint">
                Based on your{' '}
                <Link to="/medical-records">medical record</Link> — not a diagnosis. If you
                have asthma, NSAIDs such as ibuprofen and naproxen (Aleve) may both need
                clinician review.
              </p>
              <ul className="interaction-results">
                {allergyWarnings.map((item) => (
                  <li
                    key={`a-${item.drugName}-${item.category}`}
                    className={`interaction-item interaction-${item.severity}`}
                  >
                    <div className="interaction-item-header">
                      <span className={`badge badge-severity-${item.severity}`}>
                        Allergy ({item.severity})
                      </span>
                      <h4>{item.drugName}</h4>
                    </div>
                    <p>
                      You listed <em>{item.userAllergyText}</em> ({item.allergyLabel}).{' '}
                      {item.description}
                    </p>
                    <p className="interaction-management">
                      <strong>What to do:</strong> {item.management}
                    </p>
                  </li>
                ))}
                {conditionWarnings.map((item) => (
                  <li
                    key={`c-${item.drugName}-${item.conditionKey}`}
                    className={`interaction-item interaction-${item.severity}`}
                  >
                    <div className="interaction-item-header">
                      <span className={`badge badge-severity-${item.severity}`}>
                        Condition ({item.severity})
                      </span>
                      <h4>{item.drugName}</h4>
                    </div>
                    <p>
                      Your record includes <em>{item.userConditionText}</em> (
                      {item.conditionLabel}). {item.description}
                    </p>
                    <p className="interaction-management">
                      <strong>What to do:</strong> {item.management}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.interactions.length > 0 ? (
            <section className="interaction-drug-section">
              <h3>Drug-to-drug interactions</h3>
              {lastCheckedDrug && highlightedInteractions.length > 0 && (
                <>
                  <p className="field-hint">
                    Warnings involving <strong>{lastCheckedDrug}</strong> and your
                    current list:
                  </p>
                  <ul className="interaction-results">
                    {highlightedInteractions.map((item) => (
                      <InteractionResultItem
                        key={`new-${item.drugA}-${item.drugB}`}
                        item={item}
                      />
                    ))}
                  </ul>
                </>
              )}
              {lastCheckedDrug && otherInteractions.length > 0 && (
                <p className="field-hint">Other interactions on your list:</p>
              )}
              <ul className="interaction-results">
                {(lastCheckedDrug ? otherInteractions : result.interactions).map(
                  (item) => (
                    <InteractionResultItem
                      key={`${item.drugA}-${item.drugB}`}
                      item={item}
                    />
                  ),
                )}
              </ul>
            </section>
          ) : result.inputNames.length >= 2 && result.mappedCount >= 2 ? (
            <div className="interaction-clear banner banner-success-style">
              <p>
                <strong>No known interactions</strong> in our reference database
                for your current medication list.
              </p>
              <p className="interaction-clear-note">
                This does not guarantee safety. New drugs, doses, and conditions
                can still matter — ask a pharmacist if unsure.
              </p>
            </div>
          ) : result.inputNames.length >= 2 && result.mappedCount < 2 ? (
            <div className="interaction-clear banner banner-warning">
              <p>
                <strong>Not enough medications mapped</strong> to run a full drug–drug
                check. Add generic names where possible, or update spelling.
              </p>
            </div>
          ) : null}

          {unresolved.length > 0 && (
            <section className="interaction-unresolved">
              <h3>Could not fully map</h3>
              <p>
                These names were not matched to our interaction database. They were
                still included in the check if a synonym matched.
              </p>
              <ul>
                {unresolved.map((r) => (
                  <li key={r.original}>{r.original}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="interaction-extra">
            <h3>Check another drug</h3>
            <p className="field-hint">
              See if a medication you are considering interacts with your current list.
            </p>
            <form className="interaction-extra-form" onSubmit={handleAddExtraDrug}>
              <div className="interaction-extra-input">
                <MedicationNameInput
                  value={extraDrug}
                  onChange={setExtraDrug}
                  placeholder="e.g. ibuprofen, Advil, Lexapro"
                  ariaLabel="Drug name to check"
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={rechecking || !extraDrug.trim()}
              >
                {rechecking ? 'Checking…' : 'Add & recheck'}
              </button>
            </form>
          </section>
        </>
      ) : null}

      <p className="page-footer-hint">
        <Link to="/">Back to Today</Link>
      </p>
    </main>
  )
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function InteractionResultItem({ item }: { item: FoundInteraction }) {
  return (
    <li className={`interaction-item interaction-${item.severity}`}>
      <div className="interaction-item-header">
        <span className={`badge badge-severity-${item.severity}`}>
          {severityLabel(item.severity)}
        </span>
        <h4>
          {item.displayA} + {item.displayB}
        </h4>
      </div>
      <p>{item.description}</p>
      <p className="interaction-management">
        <strong>What to do:</strong> {item.management}
      </p>
    </li>
  )
}
