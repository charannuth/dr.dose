/** Strip to up to 8 digits for YYYYMMDD-style entry. */
export function extractDateDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8)
}

/** Live mask while typing (e.g. 20050408 → 2005-04-08). */
export function formatIsoDateMaskFromDigits(digits: string): string {
  const d = extractDateDigits(digits)
  if (!d) return ''
  if (d.length <= 4) return d
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const dt = new Date(year, month - 1, day)
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day
}

function formatIsoParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Finalize display on blur / before save. */
export function normalizeIsoDateDisplay(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    if (isValidCalendarDate(year, month, day)) {
      return formatIsoParts(year, month, day)
    }
    throw new Error('Enter a valid date (YYYY-MM-DD).')
  }

  const digits = extractDateDigits(trimmed)
  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4))
    const month = Number(digits.slice(4, 6))
    const day = Number(digits.slice(6, 8))
    if (isValidCalendarDate(year, month, day)) {
      return formatIsoParts(year, month, day)
    }
  }

  throw new Error('Use YYYY-MM-DD (e.g. 2005-04-08).')
}

export function clampIsoDateMax(value: string, maxIso: string): string {
  if (!maxIso) return value
  return value > maxIso ? maxIso : value
}
