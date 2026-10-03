export type RefillDraft = { trackSupply: boolean; remaining: string; name: string; strength: string; notes: string };
export function parseRefillCount(raw: string): number {
  if (!/^\d+$/.test(raw.trim())) throw new Error('Enter a whole number of units, zero or greater.');
  const count = Number(raw.trim());
  if (!Number.isSafeInteger(count) || count > 2147483647) throw new Error('That supply count is too large.');
  return count;
}
export function refillFields(draft: RefillDraft) {
  if (!draft.name.trim()) throw new Error('Enter a medication name.');
  return { name: draft.name.trim(), dose_mg: draft.strength.trim() || null, notes: draft.notes.trim() || null,
    pills_remaining: draft.trackSupply ? parseRefillCount(draft.remaining) : null };
}
