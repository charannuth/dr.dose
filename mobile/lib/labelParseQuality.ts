/**
 * Decides whether the on-device label parse is good enough to use as-is, or whether
 * the app should offer the optional "Use AI to read this label?" step.
 *
 * Kept dependency-free so it can be unit tested without React Native.
 */

/** Where the parsed drug name came from. */
export type LabelNameSource = 'catalog' | 'pharmacy-line' | 'guess';

export type LabelParseFields = {
  name?: string;
  nameSource?: LabelNameSource;
  doseMg?: string;
  directions?: string;
};

export type LabelParseField = 'name' | 'strength' | 'directions';

export type LabelParseQuality = {
  /** True when local rules found a recognizable drug name, a strength and directions. */
  confident: boolean;
  /** Fields the local parser could not find (or could only guess). */
  missing: LabelParseField[];
};

export function assessLabelParse(parsed: LabelParseFields): LabelParseQuality {
  const missing: LabelParseField[] = [];
  const name = parsed.name?.trim() ?? '';
  const nameTrusted =
    name.length >= 3 && (parsed.nameSource === 'catalog' || parsed.nameSource === 'pharmacy-line');
  if (!nameTrusted) missing.push('name');
  if (!parsed.doseMg?.trim()) missing.push('strength');
  if (!parsed.directions?.trim()) missing.push('directions');
  return { confident: missing.length === 0, missing };
}

const FIELD_LABELS: Record<LabelParseField, string> = {
  name: 'the drug name',
  strength: 'the strength',
  directions: 'the directions',
};

/** "the drug name and the strength" — for the AI consent prompt. */
export function describeMissingFields(missing: LabelParseField[]): string {
  const labels = missing.map((f) => FIELD_LABELS[f]);
  if (labels.length <= 1) return labels[0] ?? 'some details';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Strip personal identifiers from label text before the optional AI step: patient and
 * prescriber lines, addresses, phone numbers, dates (incl. DOB) and Rx/NDC numbers.
 * The drug name, strength, directions and counseling notes are kept.
 */
export function redactLabelTextForAI(rawText: string): string {
  const dropLine =
    /^\s*(patient|pt\b|name\s*:|dob\b|d\.o\.b|date of birth|prscbr|prescriber|presc\b|dr\.?\s|md\b|address|addr\b|ph\b|phone|tel\b|store\s*#?|rx\s*#|rx\s*no|ndc\b|mfr\b|pharmacist)/i;
  const streetAddress =
    /\b\d{1,6}\s+[a-z0-9.\s]{2,40}\b(st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane|way|ct|court|hwy|pkwy|suite|ste)\b\.?/i;
  const cityStateZip = /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/;
  // Never drop dosing lines, even if they happen to look like an address ("…do not drive").
  const dosing =
    /\b(take|tablets?|capsules?|puffs?|apply|inhale|inject|mouth|daily|dose|mg|mcg|ml|hours?|needed)\b/i;
  return rawText
    .split(/\r?\n/)
    .filter((line) => {
      if (dropLine.test(line)) return false;
      if (dosing.test(line)) return true;
      return !streetAddress.test(line) && !cityStateZip.test(line);
    })
    .map((line) =>
      line
        .replace(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone]')
        .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '[date]')
        .replace(/\b(rx|ndc)\s*[:#]?\s*[\d-]{5,}\b/gi, '$1 [number]')
        .replace(/\b\d{7,}\b/g, '[number]'),
    )
    .join('\n')
    .trim();
}
