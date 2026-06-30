import { recognizeText } from 'expo-mlkit-ocr';
import brandMedications from '../data/brand-medications.json';
import { MEDICATION_SUGGESTIONS, type MedicationSuggestion } from './medicationSuggestions';
import { isMedicationRouteId, type MedicationRouteId } from './medicationForms';

/**
 * Fields we can suggest from a scanned label. Everything is optional — the user
 * confirms (and fills the rest) in the add-medication wizard. We never auto-save.
 */
export type PrescriptionPrefill = {
  name?: string;
  doseMg?: string;
  route?: MedicationRouteId;
  form?: string;
  rawText: string;
};

type NameEntry = { name: string; doseMg?: string };

// Known medication names (brands + generics), longest first so we match the most
// specific name when several appear in the label text.
const KNOWN_NAMES: NameEntry[] = (() => {
  const seen = new Set<string>();
  const entries: NameEntry[] = [];
  const push = (s: MedicationSuggestion | { name?: string; doseMg?: string }) => {
    const name = s.name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ name, doseMg: s.doseMg });
  };
  (brandMedications as { name?: string; doseMg?: string }[]).forEach(push);
  MEDICATION_SUGGESTIONS.forEach(push);
  return entries.sort((a, b) => b.name.length - a.name.length);
})();

// Keyword → { route, form } mapping. First match wins, so order longer/more
// specific phrases before generic ones.
const FORM_KEYWORDS: { match: RegExp; route: MedicationRouteId; form: string }[] = [
  { match: /\bcaplet/i, route: 'oral', form: 'tablet' },
  { match: /\bchewable/i, route: 'oral', form: 'chewable' },
  { match: /\bsublingual|\bSL\b/i, route: 'oral', form: 'sublingual' },
  { match: /\bcapsule|\bcaps?\b/i, route: 'oral', form: 'capsule' },
  { match: /\btablet|\btabs?\b/i, route: 'oral', form: 'tablet' },
  { match: /\bsuspension/i, route: 'oral', form: 'suspension' },
  { match: /\bsyrup/i, route: 'oral', form: 'syrup' },
  { match: /\bsolution|\bliquid|\boral soln/i, route: 'oral', form: 'liquid' },
  { match: /\blozenge|\btroche/i, route: 'oral', form: 'lozenge' },
  { match: /\bointment/i, route: 'dermal', form: 'ointment' },
  { match: /\bcream/i, route: 'dermal', form: 'cream' },
  { match: /\blotion/i, route: 'dermal', form: 'lotion' },
  { match: /\bpatch|transdermal/i, route: 'dermal', form: 'patch' },
  { match: /\bfoam/i, route: 'dermal', form: 'foam' },
  { match: /\bgel\b/i, route: 'dermal', form: 'gel' },
  { match: /\bprefilled pen|\bpen\b/i, route: 'injection', form: 'prefilled-pen' },
  { match: /\bauto-?injector/i, route: 'injection', form: 'auto-injector' },
  { match: /\bsubcutaneous|\bsub-?q\b|\bsubq\b/i, route: 'injection', form: 'subcutaneous' },
  { match: /\bintramuscular|\bIM\b/i, route: 'injection', form: 'intramuscular' },
  { match: /\binjection|\binject|\bsyringe|\bvial\b/i, route: 'injection', form: 'subcutaneous' },
];

function findName(text: string): NameEntry | null {
  const haystack = ` ${text.toLowerCase()} `;
  for (const entry of KNOWN_NAMES) {
    const needle = entry.name.toLowerCase();
    // Require a word-ish boundary so "ace" doesn't match inside another word.
    if (haystack.includes(` ${needle} `) || haystack.includes(` ${needle}\n`)) {
      return entry;
    }
    if (new RegExp(`(^|[^a-z])${escapeRegExp(needle)}([^a-z]|$)`, 'i').test(text)) {
      return entry;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findStrength(text: string): string | null {
  // Matches "500 mg", "0.5mg", "10 MCG", "250 mg/5 mL" (captures the leading amount + unit).
  const match = text.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|ml)\b/i);
  if (!match) return null;
  const amount = match[1];
  const unit = match[2].toLowerCase();
  return `${amount} ${unit === 'g' ? 'g' : unit}`;
}

function findForm(text: string): { route: MedicationRouteId; form: string } | null {
  for (const entry of FORM_KEYWORDS) {
    if (entry.match.test(text)) return { route: entry.route, form: entry.form };
  }
  return null;
}

/** Parse raw OCR text from a prescription/medication label into confirmable suggestions. */
export function parsePrescriptionText(rawText: string): PrescriptionPrefill {
  const text = rawText.replace(/\s+/g, ' ').trim();
  const result: PrescriptionPrefill = { rawText };
  if (!text) return result;

  const nameMatch = findName(text);
  if (nameMatch) result.name = nameMatch.name;

  const strength = findStrength(text);
  if (strength) result.doseMg = strength;
  else if (nameMatch?.doseMg) result.doseMg = nameMatch.doseMg;

  const formMatch = findForm(text);
  if (formMatch) {
    result.route = formMatch.route;
    result.form = formMatch.form;
  }

  return result;
}

/** Run on-device OCR over an image URI and return confirmable suggestions. */
export async function recognizePrescription(uri: string): Promise<PrescriptionPrefill> {
  const recognition = await recognizeText(uri);
  return parsePrescriptionText(recognition?.text ?? '');
}

export function hasUsefulPrefill(prefill: PrescriptionPrefill | null | undefined): boolean {
  return Boolean(prefill && (prefill.name || prefill.doseMg || prefill.route));
}

export function normalizePrefillRoute(value: string | undefined): MedicationRouteId | null {
  return value && isMedicationRouteId(value) ? value : null;
}
