import {
  BLOOD_TYPE_OPTIONS,
  COMMON_ALLERGY_SUGGESTIONS,
  COMMON_CONDITION_SUGGESTIONS,
} from '../lib/allergyCheck'
import type { BodyMetricUnit } from '../lib/bodyMetrics'
import type { MedicalRecordInput } from '../lib/medicalRecords'
import { ageFromDateOfBirth, GENDER_OPTIONS } from '../lib/profileStats'
import { Link } from 'react-router-dom'
import { HeightWeightFields } from './HeightWeightFields'
import { IsoDateInput } from './IsoDateInput'
import { TagListField } from './TagListField'
import { todayLocalDate } from '../lib/dates'

type MedicalRecordsFormProps = {
  value: MedicalRecordInput
  onChange: (next: MedicalRecordInput) => void
  onHeightUnitChange: (unit: BodyMetricUnit) => void
  onWeightUnitChange: (unit: BodyMetricUnit) => void
  onSubmit: () => void
  busy?: boolean
}

export function MedicalRecordsForm({
  value,
  onChange,
  onHeightUnitChange,
  onWeightUnitChange,
  onSubmit,
  busy = false,
}: MedicalRecordsFormProps) {
  function patch(partial: Partial<MedicalRecordInput>) {
    onChange({ ...value, ...partial })
  }

  return (
    <form
      className="medical-records-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="medical-records-disclaimer" role="note">
        <strong>Not certified medical records.</strong> This is self-reported information
        stored in your account to help flag possible allergy matches when you add
        medications. Always consult your physician or pharmacist for diagnosis and
        treatment decisions.
      </div>

      <section className="medical-records-section">
        <h3>About you</h3>
        <p className="field-hint">
          Optional basics — also editable on <Link to="/tracking">Tracking</Link>. Update
          weight and height anytime as things change.
        </p>

        <label className="medical-records-field">
          Date of birth
          <IsoDateInput
            value={value.date_of_birth}
            maxDate={todayLocalDate()}
            onChange={(date_of_birth) => patch({ date_of_birth })}
            aria-label="Date of birth"
          />
          {value.date_of_birth && ageFromDateOfBirth(value.date_of_birth) != null && (
            <span className="field-hint">
              Age {ageFromDateOfBirth(value.date_of_birth)} years
            </span>
          )}
        </label>

        <label className="medical-records-field">
          Gender
          <select
            value={value.gender}
            onChange={(e) => patch({ gender: e.target.value })}
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <HeightWeightFields
          height_cm={value.height_cm}
          weight_kg={value.weight_kg}
          height_unit={value.height_unit}
          weight_unit={value.weight_unit}
          onHeightChange={(height_cm) => patch({ height_cm })}
          onWeightChange={(weight_kg) => patch({ weight_kg })}
          onHeightUnitChange={onHeightUnitChange}
          onWeightUnitChange={onWeightUnitChange}
          fieldClassName="medical-records-field"
          rowClassName="medical-records-stats-row body-metrics-row"
        />
        <p className="field-hint">
          Unit preference is saved to your account. Values are stored as cm and kg.
        </p>
      </section>

      <section className="medical-records-section">
        <h3>Clinical history</h3>

      <label className="medical-records-field">
        Blood type
        <select
          value={value.blood_type}
          onChange={(e) =>
            patch({
              blood_type: e.target.value as MedicalRecordInput['blood_type'],
            })
          }
        >
          {BLOOD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <p className="field-hint medical-records-asthma-hint">
        <strong>Asthma &amp; pain relievers:</strong> If ibuprofen (Advil/Motrin) bothers
        your breathing, also list <strong>Ibuprofen / NSAIDs</strong> under allergies. Note
        that Aleve (naproxen) is in the same drug class—your doctor can say which option is
        safe; acetaminophen (Tylenol) is often used when NSAIDs are avoided.
      </p>

      <TagListField
        id="known-allergies"
        label="Known allergies"
        hint="Used to check new medications against your allergy list."
        value={value.known_allergies}
        onChange={(known_allergies) => patch({ known_allergies })}
        suggestions={COMMON_ALLERGY_SUGGESTIONS}
        placeholder="e.g. Penicillin"
      />

      <TagListField
        id="known-conditions"
        label="Known conditions / diagnoses"
        hint="e.g. Asthma — we will flag NSAIDs (ibuprofen, naproxen/Aleve, aspirin) for review."
        value={value.known_conditions}
        onChange={(known_conditions) => patch({ known_conditions })}
        suggestions={COMMON_CONDITION_SUGGESTIONS}
        placeholder="e.g. Type 2 diabetes"
      />

      <label className="medical-records-field">
        Past surgeries or hospitalizations
        <textarea
          rows={3}
          value={value.past_surgeries}
          onChange={(e) => patch({ past_surgeries: e.target.value })}
          placeholder="Optional — year and procedure if you remember"
        />
      </label>

      <label className="medical-records-field">
        Family history
        <textarea
          rows={3}
          value={value.family_history}
          onChange={(e) => patch({ family_history: e.target.value })}
          placeholder="Optional — e.g. heart disease in parents"
        />
      </label>

      <label className="medical-records-field">
        Emergency notes
        <textarea
          rows={2}
          value={value.emergency_notes}
          onChange={(e) => patch({ emergency_notes: e.target.value })}
          placeholder="Optional — e.g. carries EpiPen, pacemaker"
        />
      </label>

      <label className="medical-records-field">
        Other notes
        <textarea
          rows={3}
          value={value.other_notes}
          onChange={(e) => patch({ other_notes: e.target.value })}
          placeholder="Anything else your care team should know"
        />
      </label>

      </section>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save medical record'}
      </button>
    </form>
  )
}
