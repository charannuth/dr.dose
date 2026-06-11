import {
  clampIsoDateMax,
  extractDateDigits,
  formatIsoDateMaskFromDigits,
  normalizeIsoDateDisplay,
} from '../lib/isoDateInput'

type IsoDateInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  className?: string
  placeholder?: string
  disabled?: boolean
  /** YYYY-MM-DD — dates after this are clamped down (e.g. today for birthdates). */
  maxDate?: string
  'aria-label'?: string
}

export function IsoDateInput({
  value,
  onChange,
  onBlur,
  id,
  className,
  placeholder = 'YYYY-MM-DD',
  disabled = false,
  maxDate,
  'aria-label': ariaLabel,
}: IsoDateInputProps) {
  function handleChange(raw: string) {
    const digits = extractDateDigits(raw)
    onChange(formatIsoDateMaskFromDigits(digits))
  }

  function handleBlur() {
    if (value.trim()) {
      try {
        let normalized = normalizeIsoDateDisplay(value)
        if (maxDate) normalized = clampIsoDateMax(normalized, maxDate)
        if (normalized !== value) onChange(normalized)
      } catch {
        /* keep partial */
      }
    }
    onBlur?.()
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      className={className}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={10}
      aria-label={ariaLabel}
    />
  )
}
