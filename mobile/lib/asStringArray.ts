/**
 * Normalize Postgres text / text[] / JSON-text values into string[].
 * After E2EE column migrations, array fields may arrive as JSON strings
 * (e.g. '["1 tablet"]') or ciphertext that decrypt forgot to expand.
 * Calling .filter/.map/.join on a string crashes the app.
 */
export function asStringArray(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => (v == null ? '' : String(v).trim()))
      .filter(isDisplayableItem)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '[]') return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (Array.isArray(parsed)) {
          return parsed
            .map((v) => (v == null ? '' : String(v).trim()))
            .filter(isDisplayableItem)
        }
      } catch {
        // fall through
      }
    }
    // Single plaintext hint (not JSON / not ciphertext blob)
    if (!trimmed.startsWith('e1:')) return [trimmed]
    return []
  }
  return []
}

/**
 * Encrypted values start with "e1:". If one is still sealed here (vault locked,
 * or an older double-sealed list), it must never be shown as a label.
 */
function isDisplayableItem(v: string): boolean {
  return v.length > 0 && !v.startsWith('e1:')
}
