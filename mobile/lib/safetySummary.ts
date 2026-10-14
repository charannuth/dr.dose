/**
 * Turns the raw drug-safety results into one ranked list of things to act on
 * and a plain-language verdict. Pure (type-only imports) so it can be tested.
 */

import type { AllergyWarning } from './allergyCheck'
import type { ConditionWarning } from './conditionCheck'
import type { FoundInteraction, InteractionCheckResult } from './drugInteractions'

export type SafetyItem = {
  key: string
  kind: 'interaction' | 'allergy' | 'condition'
  severity: 'major' | 'moderate' | 'minor'
  title: string
  /** Short label for the badge, e.g. "Major interaction". */
  badge: string
  body: string
  management: string
  /** Lower-cased drug names this item is about (to spot the "new medicine" ones). */
  drugs: string[]
}

const RANK = { major: 0, moderate: 1, minor: 2 } as const
const KIND_RANK = { allergy: 0, condition: 1, interaction: 2 } as const

export function buildSafetyItems(
  interactions: FoundInteraction[],
  allergies: AllergyWarning[],
  conditions: ConditionWarning[],
): SafetyItem[] {
  const items: SafetyItem[] = [
    ...allergies.map((a) => ({
      key: `a-${a.drugName}-${a.category}`,
      kind: 'allergy' as const,
      severity: a.severity,
      title: `${a.drugName} and your ${a.userAllergyText} allergy`,
      badge: a.severity === 'major' ? 'Allergy risk' : 'Possible allergy',
      body: `${a.allergyLabel}. ${a.description}`,
      management: a.management,
      drugs: [a.drugName.toLowerCase()],
    })),
    ...conditions.map((c) => ({
      key: `c-${c.drugName}-${c.conditionKey}`,
      kind: 'condition' as const,
      severity: c.severity,
      title: `${c.drugName} with ${c.userConditionText}`,
      badge: c.severity === 'major' ? 'Condition risk' : 'Condition caution',
      body: c.description,
      management: c.management,
      drugs: [c.drugName.toLowerCase()],
    })),
    ...interactions.map((i) => ({
      key: `i-${i.drugA}-${i.drugB}`,
      kind: 'interaction' as const,
      severity: i.severity,
      title: `${i.displayA} + ${i.displayB}`,
      badge: `${i.severity[0].toUpperCase()}${i.severity.slice(1)} interaction`,
      body: i.description,
      management: i.management,
      drugs: [i.displayA, i.displayB, i.drugA, i.drugB].map((d) => d.toLowerCase()),
    })),
  ]
  return items.sort((a, b) => RANK[a.severity] - RANK[b.severity] || KIND_RANK[a.kind] - KIND_RANK[b.kind])
}

export type SafetyVerdict = {
  tone: 'danger' | 'caution' | 'clear' | 'incomplete' | 'empty'
  title: string
  detail: string
}

export function safetyVerdict(
  result: InteractionCheckResult,
  items: SafetyItem[],
  recordCounts: { allergies: number; conditions: number },
): SafetyVerdict {
  const n = result.inputNames.length
  if (n === 0) return { tone: 'empty', title: 'No medications to check yet', detail: 'Add your medications on Today and they are checked here automatically.' }
  const major = items.filter((i) => i.severity === 'major').length
  const checked = [
    `${n} medication${n === 1 ? '' : 's'}`,
    recordCounts.allergies ? `${recordCounts.allergies} allerg${recordCounts.allergies === 1 ? 'y' : 'ies'}` : null,
    recordCounts.conditions ? `${recordCounts.conditions} condition${recordCounts.conditions === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const detail = `Checked ${checked}.`
  if (major) return { tone: 'danger', title: `${major} important warning${major === 1 ? '' : 's'} to review`, detail: `${detail} Talk to your pharmacist or doctor before your next dose.` }
  if (items.length) return { tone: 'caution', title: `${items.length} thing${items.length === 1 ? '' : 's'} to keep in mind`, detail }
  if (result.unmappedCount > 0) return { tone: 'incomplete', title: 'No warnings found, but the check is incomplete', detail: `${detail} Some names couldn't be matched, so they weren't checked.` }
  return { tone: 'clear', title: 'No known problems found', detail }
}

/** Items about the medicine being tried out, then everything else. */
export function splitByCandidate(items: SafetyItem[], candidate: string | null, canonical: string | null): { candidate: SafetyItem[]; rest: SafetyItem[] } {
  if (!candidate) return { candidate: [], rest: items }
  const names = [candidate.toLowerCase(), canonical?.toLowerCase()].filter((x): x is string => Boolean(x))
  const hit = (i: SafetyItem) => i.drugs.some((d) => names.includes(d))
  return { candidate: items.filter(hit), rest: items.filter((i) => !hit(i)) }
}
