import { Link } from 'react-router-dom'
import { HeightWeightFields } from './HeightWeightFields'
import { IsoDateInput } from './IsoDateInput'
import { todayLocalDate } from '../lib/dates'
import { GENDER_OPTIONS, ageFromDateOfBirth } from '../lib/profileStats'
import type { BodyMetricUnit } from '../lib/bodyMetrics'
import type { PhysicalProfileInput } from '../lib/physicalProfile'

type PhysicalProfileFormProps = {
  value: PhysicalProfileInput
  onChange: (next: PhysicalProfileInput) => void
  onHeightUnitChange: (unit: BodyMetricUnit) => void
  onWeightUnitChange: (unit: BodyMetricUnit) => void
  onSubmit: () => void
  busy?: boolean
}

export function PhysicalProfileForm({
  value,
  onChange,
  onHeightUnitChange,
  onWeightUnitChange,
  onSubmit,
  busy = false,
}: PhysicalProfileFormProps) {
  function patch(partial: Partial<PhysicalProfileInput>) {
    onChange({ ...value, ...partial })
  }

  return (
    <form
      className="physical-profile-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <p className="field-hint">
        Update anytime — helpful for growing teens, weight changes, and tracking context.
        Also editable under{' '}
        <Link to="/medical-records">Medical records</Link>.
      </p>

      <label className="tracking-field">
        Date of birth
        <IsoDateInput
          value={value.date_of_birth}
          maxDate={todayLocalDate()}
          onChange={(date_of_birth) => patch({ date_of_birth })}
          aria-label="Date of birth"
        />
        {value.date_of_birth && ageFromDateOfBirth(value.date_of_birth) != null && (
          <span className="field-hint">Age {ageFromDateOfBirth(value.date_of_birth)} years</span>
        )}
      </label>

      <label className="tracking-field">
        Gender
        <select value={value.gender} onChange={(e) => patch({ gender: e.target.value })}>
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
      />
      <p className="field-hint">
        Unit preference is saved to your account. Height and weight values are stored as
        cm and kg.
      </p>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
