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
      .filter(Boolean)
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
            .filter(Boolean)
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
