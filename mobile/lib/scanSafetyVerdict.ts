/**
 * Pure helpers for the automatic safety check that runs after a label scan.
 * No React Native or network imports, so they can be unit tested in Node.
 */

export type ScanFindingKind =
  | 'allergy'
  | 'interaction'
  | 'duplicate'
  | 'condition'
  | 'label-contraindication'
  | 'label-interaction';

/** danger = stop and ask a pharmacist; caution = worth asking about; info = FYI only. */
export type ScanFindingSeverity = 'danger' | 'caution' | 'info';

export type ScanFinding = {
  kind: ScanFindingKind;
  severity: ScanFindingSeverity;
  title: string;
  detail: string;
  /** Where the warning came from, shown in small print. */
  source: string;
};

export type ScanVerdictLevel = 'danger' | 'caution' | 'clear' | 'unknown';

export type ScanVerdict = {
  level: ScanVerdictLevel;
  headline: string;
  summary: string;
};

export type ScanCheckContext = {
  drugName: string;
  /** True when the drug matched our reference data, RxNorm or an FDA label. */
  drugIdentified: boolean;
  allergyCount: number;
  medicationCount: number;
};

const SEVERITY_ORDER: Record<ScanFindingSeverity, number> = { danger: 0, caution: 1, info: 2 };

export function sortFindings(findings: ScanFinding[]): ScanFinding[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function checkedAgainst(ctx: ScanCheckContext): string {
  const parts: string[] = [];
  parts.push(
    ctx.allergyCount > 0 ? plural(ctx.allergyCount, 'allergy', 'allergies') : 'no allergies on file',
  );
  parts.push(
    ctx.medicationCount > 0
      ? plural(ctx.medicationCount, 'current medication', 'current medications')
      : 'no other medications on file',
  );
  return `Checked against ${parts.join(' and ')}.`;
}

export function verdictFromFindings(findings: ScanFinding[], ctx: ScanCheckContext): ScanVerdict {
  const name = ctx.drugName.trim() || 'this medication';
  const dangers = findings.filter((f) => f.severity === 'danger').length;
  const cautions = findings.filter((f) => f.severity === 'caution').length;

  if (dangers > 0) {
    return {
      level: 'danger',
      headline: 'Potential danger found',
      summary: `${name} may not be safe with your allergies or medications (${plural(
        dangers + cautions,
        'warning',
        'warnings',
      )}). Talk to your pharmacist or doctor before taking it.`,
    };
  }
  if (cautions > 0) {
    return {
      level: 'caution',
      headline: 'Check with your pharmacist',
      summary: `We found ${plural(cautions, 'possible issue', 'possible issues')} with ${name}. Ask your pharmacist or doctor whether it's right for you.`,
    };
  }
  if (!ctx.drugIdentified) {
    return {
      level: 'unknown',
      headline: "Couldn't check this medication",
      summary: `We couldn't match "${name}" to our drug references, so we couldn't check it against your allergies and medications. Fix the name below or ask your pharmacist.`,
    };
  }
  return {
    level: 'clear',
    headline: 'No potential dangers found',
    summary: `${checkedAgainst(ctx)} Nothing in our references flagged ${name}. This doesn't guarantee it's safe for you, so confirm with your pharmacist if you're unsure.`,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize a free-text name for matching: lowercase, drop strengths and dosage forms. */
export function matchableTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|units?|iu)\b.*$/i, '')
    .replace(
      /\b(tablets?|capsules?|tabs?|caps?|oral|solution|suspension|er|xr|sr|dr|hfa|inhaler|cream|ointment|injection|pen|patch)\b/g,
      '',
    )
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very common words that appear in allergy lists and would false-match label prose. */
const STOP_TERMS = new Set(['none', 'nkda', 'no known', 'other', 'drug', 'drugs', 'food', 'latex', 'dust', 'pollen', 'seasonal']);

/**
 * Which of `terms` appear as whole words in `text` (an FDA label section).
 * Returns the original term strings, de-duplicated, in input order.
 */
export function findTermMentions(text: string, terms: string[]): string[] {
  if (!text) return [];
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const original of terms) {
    const term = matchableTerm(original);
    if (term.length < 4 || STOP_TERMS.has(term) || seen.has(term)) continue;
    const re = new RegExp(`(^|[^a-z])${escapeRegExp(term)}(s|es)?([^a-z]|$)`, 'i');
    if (re.test(text)) {
      seen.add(term);
      hits.push(original.trim());
    }
  }
  return hits;
}

/**
 * Allergies written as a drug name ("amoxicillin", "Bactrim") that match the scanned drug
 * directly. Category matching (penicillins, sulfa…) is handled by allergyCheck.ts.
 */
export function directAllergyMatches(drugNames: (string | null | undefined)[], allergies: string[]): string[] {
  const names = drugNames
    .map((n) => (n ? matchableTerm(n) : ''))
    .filter((n) => n.length >= 4);
  if (names.length === 0) return [];
  const hits: string[] = [];
  for (const raw of allergies) {
    const allergy = matchableTerm(raw);
    if (allergy.length < 4 || STOP_TERMS.has(allergy)) continue;
    const match = names.some((name) => {
      const nameWords = name.split(/[\s/-]+/);
      const allergyWords = allergy.split(/[\s/-]+/);
      return (
        name === allergy ||
        allergyWords.some((w) => w.length >= 4 && nameWords.includes(w))
      );
    });
    if (match) hits.push(raw.trim());
  }
  return hits;
}

/** Same active ingredient already on the medication list (e.g. two acetaminophen products). */
export function duplicateTherapyMatches(
  scannedCanonical: string | null,
  scannedName: string,
  current: { original: string; canonical: string | null }[],
): string[] {
  const scannedTerm = matchableTerm(scannedName);
  return current
    .filter((row) => {
      if (scannedCanonical && row.canonical && row.canonical === scannedCanonical) return true;
      return scannedTerm.length >= 4 && matchableTerm(row.original) === scannedTerm;
    })
    .map((row) => row.original.trim());
}
