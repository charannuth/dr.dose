/**
 * Looks up a drug's official FDA label (openFDA, U.S. Food and Drug Administration).
 * Only the drug name is sent. The user's allergies and medication list are never sent;
 * they are compared against the returned label text on the device.
 * @see https://open.fda.gov/apis/drug/label/
 */

export type FdaLabelSections = {
  /** Generic name(s) from the label, lowercase. */
  genericNames: string[];
  boxedWarning: string;
  contraindications: string;
  drugInteractions: string;
  /** Link to the label on DailyMed when a set id is available. */
  dailyMedUrl: string | null;
};

const OPENFDA_LABEL_URL = 'https://api.fda.gov/drug/label.json';
const TIMEOUT_MS = 8000;
const cache = new Map<string, FdaLabelSections | null>();

type OpenFdaLabel = {
  set_id?: string;
  boxed_warning?: string[];
  contraindications?: string[];
  drug_interactions?: string[];
  openfda?: { generic_name?: string[] };
};

function cleanQueryName(name: string): string {
  return name
    .replace(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%).*$/i, '')
    .replace(/["\\]/g, '')
    .trim();
}

async function queryLabel(field: string, name: string): Promise<OpenFdaLabel | null> {
  const url = `${OPENFDA_LABEL_URL}?search=${encodeURIComponent(`${field}:"${name}"`)}&limit=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) return null; // openFDA returns 404 when nothing matches
    if (!res.ok) throw new Error(`FDA label lookup failed (${res.status})`);
    const data = (await res.json()) as { results?: OpenFdaLabel[] };
    return data.results?.[0] ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch label sections for a drug by generic name, then brand name.
 * Returns null when the FDA has no matching label. Throws on network errors so the
 * caller can tell the user this part of the check was skipped.
 */
export async function fetchFdaLabel(drugName: string): Promise<FdaLabelSections | null> {
  const name = cleanQueryName(drugName);
  if (name.length < 3) return null;
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const label =
    (await queryLabel('openfda.generic_name', name)) ??
    (await queryLabel('openfda.brand_name', name));

  const sections: FdaLabelSections | null = label
    ? {
        genericNames: (label.openfda?.generic_name ?? []).map((n) => n.toLowerCase()),
        boxedWarning: (label.boxed_warning ?? []).join('\n'),
        contraindications: (label.contraindications ?? []).join('\n'),
        drugInteractions: (label.drug_interactions ?? []).join('\n'),
        dailyMedUrl: label.set_id
          ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(label.set_id)}`
          : null,
      }
    : null;
  cache.set(key, sections);
  return sections;
}
