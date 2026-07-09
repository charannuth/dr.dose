import { recognizeText } from 'expo-mlkit-ocr';
import brandMedications from '../data/brand-medications.json';
import { MEDICATION_SUGGESTIONS, type MedicationSuggestion } from './medicationSuggestions';
import { isMedicationRouteId, type MedicationRouteId } from './medicationForms';
import type { MedicationScheduleType } from './medicationSchedule';
import { isLabelAiAvailable, parseLabelWithAI } from './labelScanAI';
import type { LabelScanPrefill } from './labelScanPrefill';

/**
 * Fields we can suggest from a scanned pharmacy label. Everything is optional —
 * the user must review and confirm on the scan review screen and again in the wizard.
 */
export type PrescriptionPrefill = {
  rawText: string;
  name?: string;
  brandName?: string;
  doseMg?: string;
  route?: MedicationRouteId;
  form?: string;
  directions?: string;
  notes?: string;
  scheduleType?: MedicationScheduleType;
  dosesPerDay?: number;
  scheduleTimes?: string[];
  quantity?: number;
  /** True when Google Gemini helped extract fields (text only, not the photo). */
  aiEnhanced?: boolean;
  /** Field keys that came from AI (for badges in review UI). */
  aiFields?: string[];
};

type NameEntry = { name: string; doseMg?: string };

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

const FORM_KEYWORDS: { match: RegExp; route: MedicationRouteId; form: string }[] = [
  { match: /\binhaler|\bhfa\b|\bpuff|\bmdi\b/i, route: 'other', form: 'inhaler' },
  { match: /\beye drop|\bophthalmic/i, route: 'other', form: 'eye-drops' },
  { match: /\bnasal spray|\bintranasal/i, route: 'other', form: 'nasal-spray' },
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

const ROUTE_FROM_DIRECTIONS: { match: RegExp; route: MedicationRouteId }[] = [
  { match: /\bby mouth\b|\borally\b|\btake\b|\bswallow\b/i, route: 'oral' },
  { match: /\binhale\b|\bpuff\b/i, route: 'other' },
  { match: /\bapply\b|\btopical\b|\bto (the )?skin\b|\baffected area\b/i, route: 'dermal' },
  { match: /\binject\b|\bsubcutaneous\b/i, route: 'injection' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findName(text: string): NameEntry | null {
  const haystack = ` ${text.toLowerCase()} `;
  for (const entry of KNOWN_NAMES) {
    const needle = entry.name.toLowerCase();
    if (haystack.includes(` ${needle} `) || haystack.includes(` ${needle}\n`)) {
      return entry;
    }
    if (new RegExp(`(^|[^a-z])${escapeRegExp(needle)}([^a-z]|$)`, 'i').test(text)) {
      return entry;
    }
  }
  return null;
}

/** Heuristic drug-name line for labels not in our local catalog. */
function findLikelyDrugLine(text: string): string | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4);

  const drugish = lines.filter((line) =>
    /\b(mg|mcg|g|ml|%|hfa|tablet|capsule|ointment|inhaler|solution|suspension|cream|patch|spray)\b/i.test(
      line,
    ),
  );

  const candidates = drugish.length > 0 ? drugish : lines;
  const best = candidates
    .filter((l) => !/^(rx|qty|quantity|refill|patient|prescriber|cvs|walgreens)/i.test(l))
    .sort((a, b) => b.length - a.length)[0];

  if (!best || best.length < 4) return null;
  // Strip trailing strength for the name field when it's on the same line.
  return best.replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%).*/i, '').trim() || best;
}

function findBrandName(text: string): string | null {
  const match = text.match(/\b(?:generic for|brand(?:\s+name)?)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\s\-]+)/i);
  return match?.[1]?.trim() ?? null;
}

function findStrength(text: string): string | null {
  // Combo inhaler strengths common on CVS labels, e.g. "115-21 MCG".
  const combo = text.match(/(\d+)\s*[-/]\s*(\d+)\s*(mcg|mg)\b/i);
  if (combo) return `${combo[1]}-${combo[2]} ${combo[3].toLowerCase()}`;

  const match = text.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|ml|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|g))?/i);
  if (!match) return null;
  const amount = match[1];
  const unit = match[2].toLowerCase();
  const suffix = match[0].includes('/') ? match[0].split(/\s+/).slice(2).join(' ') : '';
  const base = `${amount} ${unit}`;
  return suffix ? `${base}/${suffix.replace(/^\//, '')}` : base;
}

/** CVS-style ALL CAPS drug line, e.g. "ADVAIR HFA" above a strength line. */
function findPharmacyDrugName(text: string): string | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const skip = /^(CVS|RX|QTY|QUANTITY|PRSCBR|MFR|RETAIL|AMOUNT|DUE|STORE|PROMISED|DOB|REFILL|NDC|DAYS?\s*SUPPLY)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skip.test(line)) continue;
    const isCapsName =
      /^[A-Z][A-Z0-9\s\-]{2,}$/.test(line) &&
      line.length <= 48 &&
      !/\d{3,}/.test(line);
    const next = lines[i + 1] ?? '';
    const looksLikeDrug =
      isCapsName &&
      (/\b(HFA|INHALER|TABLET|CAPSULE|OINTMENT|SOLUTION|SUSPENSION|CREAM|PATCH|SPRAY)\b/i.test(
        line,
      ) ||
        /\b(HFA|INHALER|TABLET|CAPSULE|OINTMENT|MCG|MG)\b/i.test(next));

    if (looksLikeDrug) {
      return line
        .split(/\s+/)
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
    }
  }
  return null;
}

function findUsageNotes(text: string): string | null {
  const match = text.match(
    /\b(?:important information|usage tips?|notes from (?:the )?pharmacy)\s*[:\-]?\s*([\s\S]{20,400}?)(?=\n\s*(?:RX|QTY|CVS|REFILL|NDC|$))/i,
  );
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, ' ').trim();
}

function findForm(text: string): { route: MedicationRouteId; form: string } | null {
  for (const entry of FORM_KEYWORDS) {
    if (entry.match.test(text)) return { route: entry.route, form: entry.form };
  }
  return null;
}

function findRouteFromDirections(text: string): MedicationRouteId | null {
  for (const entry of ROUTE_FROM_DIRECTIONS) {
    if (entry.match.test(text)) return entry.route;
  }
  return null;
}

function findDirections(text: string): string | null {
  const patterns = [
    /\b(take|inhale|apply|use|instill|inject)\b[^.\n]{8,200}/i,
    /\b(sig|directions?)\s*[:\-]\s*([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const line = (match?.[2] ?? match?.[0])?.replace(/\s+/g, ' ').trim();
    if (line && line.length >= 10) return line;
  }
  return null;
}

function findQuantity(text: string): number | null {
  const match =
    text.match(/\b(?:qty|quantity)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i) ??
    text.match(/#\s*(\d+)\b/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseScheduleFromDirections(
  directions: string,
): Pick<PrescriptionPrefill, 'scheduleType' | 'dosesPerDay' | 'scheduleTimes'> {
  const d = directions.toLowerCase();
  if (/\b(as needed|prn|when needed|if needed)\b/.test(d)) {
    return { scheduleType: 'as_needed' };
  }

  let dosesPerDay: number | undefined;
  if (/\b(once|one time)\s+(daily|a day|per day)\b|\bevery day\b|\bqd\b/.test(d)) {
    dosesPerDay = 1;
  } else if (/\b(twice|two times)\s+(daily|a day|per day)\b|\bbid\b/.test(d)) {
    dosesPerDay = 2;
  } else if (/\b(three times|thrice)\s+(daily|a day|per day)\b|\btid\b/.test(d)) {
    dosesPerDay = 3;
  } else if (/\b(four times)\s+(daily|a day|per day)\b|\bqid\b/.test(d)) {
    dosesPerDay = 4;
  } else if (/\bevery\s*12\s*hours?\b/.test(d)) {
    dosesPerDay = 2;
  } else if (/\bevery\s*8\s*hours?\b/.test(d)) {
    dosesPerDay = 3;
  } else if (/\bevery\s*6\s*hours?\b/.test(d)) {
    dosesPerDay = 4;
  }

  if (!dosesPerDay) return { scheduleType: 'scheduled' };

  const scheduleTimes =
    dosesPerDay === 1
      ? ['08:00']
      : dosesPerDay === 2
        ? ['08:00', '20:00']
        : dosesPerDay === 3
          ? ['08:00', '14:00', '20:00']
          : ['08:00', '12:00', '18:00', '22:00'];

  return { scheduleType: 'scheduled', dosesPerDay, scheduleTimes: scheduleTimes.slice(0, dosesPerDay) };
}

/** Parse raw OCR text from a pharmacy label into confirmable suggestions. */
export function parsePrescriptionText(rawText: string): PrescriptionPrefill {
  const text = rawText.replace(/\r/g, '\n');
  const flat = text.replace(/\s+/g, ' ').trim();
  const result: PrescriptionPrefill = { rawText: text };
  if (!flat) return result;

  const nameMatch = findName(flat) ?? findName(text);
  if (nameMatch) {
    result.name = nameMatch.name;
  } else {
    const pharmacyName = findPharmacyDrugName(text);
    const likely = pharmacyName ?? findLikelyDrugLine(text);
    if (likely) result.name = likely;
  }

  const brand = findBrandName(flat);
  if (brand) result.brandName = brand;

  const strength = findStrength(flat) ?? findStrength(text);
  if (strength) result.doseMg = strength;
  else if (nameMatch?.doseMg) result.doseMg = nameMatch.doseMg;

  const formMatch = findForm(flat) ?? findForm(text);
  if (formMatch) {
    result.route = formMatch.route;
    result.form = formMatch.form;
  }

  const directions = findDirections(text) ?? findDirections(flat);
  if (directions) {
    result.directions = directions;
    const schedule = parseScheduleFromDirections(directions);
    Object.assign(result, schedule);
    if (!result.route) {
      const routeFromSig = findRouteFromDirections(directions);
      if (routeFromSig) result.route = routeFromSig;
    }
  }

  const qty =
    findQuantity(flat) ??
    (() => {
      const gm = flat.match(/\b(?:qty|quantity)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*gm\b/i);
      return gm ? Number(gm[1]) : null;
    })();
  if (qty) result.quantity = qty;

  const usageNotes = findUsageNotes(text);
  if (usageNotes) result.notes = usageNotes;

  return result;
}

function mergePrefills(local: PrescriptionPrefill, ai: PrescriptionPrefill): PrescriptionPrefill {
  const aiFields = [...(ai.aiFields ?? [])];
  const pick = <K extends keyof PrescriptionPrefill>(key: K): PrescriptionPrefill[K] =>
    (ai[key] ?? local[key]) as PrescriptionPrefill[K];

  return {
    rawText: local.rawText,
    name: pick('name'),
    brandName: pick('brandName'),
    doseMg: pick('doseMg'),
    route: pick('route'),
    form: pick('form'),
    directions: pick('directions'),
    notes: pick('notes'),
    scheduleType: pick('scheduleType'),
    dosesPerDay: pick('dosesPerDay'),
    scheduleTimes: pick('scheduleTimes'),
    quantity: pick('quantity'),
    aiEnhanced: true,
    aiFields,
  };
}

/** Run on-device OCR, optional AI text analysis, and return confirmable suggestions. */
export async function recognizePrescription(uri: string): Promise<PrescriptionPrefill> {
  const recognition = await recognizeText(uri);
  const rawText = recognition?.text ?? '';
  const local = parsePrescriptionText(rawText);

  if (!isLabelAiAvailable()) return local;

  try {
    const ai = await parseLabelWithAI(rawText);
    if (ai) return mergePrefills(local, ai);
  } catch {
    // AI is optional; local parsing still works offline.
  }

  return local;
}

export function hasUsefulPrefill(prefill: PrescriptionPrefill | null | undefined): boolean {
  return Boolean(
    prefill &&
      (prefill.name ||
        prefill.doseMg ||
        prefill.route ||
        prefill.directions ||
        prefill.form),
  );
}

export function prefillToWizard(prefill: PrescriptionPrefill): LabelScanPrefill {
  const notes = [prefill.directions, prefill.notes].filter(Boolean).join('\n\n') || undefined;
  return {
    name: prefill.name,
    doseMg: prefill.doseMg,
    route: prefill.route ?? null,
    form: prefill.form,
    directions: prefill.directions,
    notes,
    scheduleType: prefill.scheduleType,
    scheduleTimes: prefill.scheduleTimes,
    quantity: prefill.quantity,
    rawText: prefill.rawText,
    brandName: prefill.brandName,
    aiEnhanced: prefill.aiEnhanced,
  };
}

export function normalizePrefillRoute(value: string | undefined): MedicationRouteId | null {
  return value && isMedicationRouteId(value) ? value : null;
}

export { isLabelAiAvailable };
