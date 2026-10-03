/** Use only saved medications plus the current comparison; never accumulate trial drugs. */
export function safetyCheckNames(saved: string[], candidate?: string): string[] {
  const names = new Map<string, string>();
  for (const value of [...saved, ...(candidate ? [candidate] : [])]) {
    const name = value.trim();
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()];
}

/** Limit name checks while preserving medication order and rejecting incomplete results. */
export async function checkRecordWarnings<A, C>(
  names: string[],
  checkAllergies: (name: string) => Promise<A[]>,
  checkConditions: (name: string) => Promise<C[]>,
): Promise<{ allergyHits: A[]; conditionHits: C[] }> {
  const allergyHits: A[] = [];
  const conditionHits: C[] = [];
  for (let i = 0; i < names.length; i += 2) {
    const batch = await Promise.all(names.slice(i, i + 2).map(async (name) => {
      const [a, c] = await Promise.all([checkAllergies(name), checkConditions(name)]);
      return { a, c };
    }));
    batch.forEach(({ a, c }) => { allergyHits.push(...a); conditionHits.push(...c); });
  }
  return { allergyHits, conditionHits };
}
