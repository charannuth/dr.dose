import {
  SUPPLEMENT_CATALOG,
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_GENERAL_DISCLAIMER,
  supplementCategoryMeta,
  type SupplementCategory,
  type SupplementCategoryMeta,
  type SupplementEntry,
  type SupplementSafetyTier,
} from './catalog'

export * from './catalog'

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Fuzzy-ish name search across names and aliases, ranked by match quality. */
export function searchSupplements(
  query: string,
  limit = 12,
): SupplementEntry[] {
  const q = normalize(query)
  if (!q) return []

  const scored: { entry: SupplementEntry; score: number }[] = []
  for (const entry of SUPPLEMENT_CATALOG) {
    const haystacks = [entry.name, ...(entry.aliases ?? [])].map(normalize)
    let best = Infinity
    for (const h of haystacks) {
      if (h === q) best = Math.min(best, 0)
      else if (h.startsWith(q)) best = Math.min(best, 1)
      else if (h.includes(q)) best = Math.min(best, 2)
    }
    if (best !== Infinity) scored.push({ entry, score: best })
  }

  return scored
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map((s) => s.entry)
}

export function findSupplementByName(name: string): SupplementEntry | undefined {
  const q = normalize(name)
  return SUPPLEMENT_CATALOG.find(
    (entry) =>
      normalize(entry.name) === q ||
      (entry.aliases ?? []).some((alias) => normalize(alias) === q),
  )
}

export type SupplementGroup = {
  category: SupplementCategoryMeta
  items: SupplementEntry[]
}

/** All supplements grouped by category, in catalog display order. */
export function groupedSupplements(): SupplementGroup[] {
  return SUPPLEMENT_CATEGORIES.map((category) => ({
    category,
    items: SUPPLEMENT_CATALOG.filter((s) => s.category === category.id),
  })).filter((group) => group.items.length > 0)
}

export function supplementsInCategory(
  id: SupplementCategory,
): SupplementEntry[] {
  return SUPPLEMENT_CATALOG.filter((s) => s.category === id)
}

export type ResolvedSupplementDisclaimer = {
  /** Whether the UI should show a disclaimer for this entry. */
  show: boolean
  tier: SupplementSafetyTier
  /** Short label for a badge, e.g. "Caution" / "Advanced". */
  badge: string | null
  /** The specific warning text, if any. */
  warning: string | null
  /** Optional practical guidance. */
  usageNotes: string | null
  /** Always-applicable educational footer. */
  general: string
}

const TIER_BADGE: Record<SupplementSafetyTier, string | null> = {
  general: null,
  caution: 'Caution',
  advanced: 'Advanced — medical supervision',
}

/**
 * Resolves what safety copy to show for a supplement. For free-text entries not
 * in the catalog, pass just a name and we treat it as the general tier.
 */
export function resolveSupplementDisclaimer(
  entry: SupplementEntry | undefined,
): ResolvedSupplementDisclaimer {
  const tier: SupplementSafetyTier = entry?.safetyTier ?? 'general'
  return {
    show: tier !== 'general' || Boolean(entry?.warning),
    tier,
    badge: TIER_BADGE[tier],
    warning: entry?.warning ?? null,
    usageNotes: entry?.usageNotes ?? null,
    general: SUPPLEMENT_GENERAL_DISCLAIMER,
  }
}

export function requiresDisclaimer(entry: SupplementEntry | undefined): boolean {
  if (!entry) return false
  return entry.safetyTier !== 'general' || Boolean(entry.warning)
}

export type SupplementFrequencyId =
  | 'once_daily'
  | 'twice_daily'
  | 'three_daily'
  | 'as_needed'

export type SupplementFrequencyOption = {
  id: SupplementFrequencyId
  label: string
  /** 24h HH:MM default dose times; empty for as-needed. */
  times: string[]
  scheduleType: 'scheduled' | 'as_needed'
}

// Sensible default times so the user doesn't have to pick them (keeps the add
// flow short). They can fine-tune times later from the edit screen.
export const SUPPLEMENT_FREQUENCIES: SupplementFrequencyOption[] = [
  { id: 'once_daily', label: 'Once daily', times: ['09:00'], scheduleType: 'scheduled' },
  { id: 'twice_daily', label: 'Twice daily', times: ['09:00', '21:00'], scheduleType: 'scheduled' },
  { id: 'three_daily', label: '3× daily', times: ['08:00', '14:00', '20:00'], scheduleType: 'scheduled' },
  { id: 'as_needed', label: 'As needed', times: [], scheduleType: 'as_needed' },
]

export function supplementFrequency(
  id: SupplementFrequencyId,
): SupplementFrequencyOption {
  return (
    SUPPLEMENT_FREQUENCIES.find((f) => f.id === id) ?? SUPPLEMENT_FREQUENCIES[0]
  )
}

/** Pulls the leading number out of a "common dose" hint like "5 g" or "1–2 gummies". */
export function parseCommonDoseAmount(commonDose?: string): string {
  if (!commonDose) return ''
  const match = commonDose.match(/\d+(?:\.\d+)?/)
  return match ? match[0] : ''
}

export { supplementCategoryMeta }
