import { isMedicationRouteId, type MedicationRouteId } from './medicationForms';
import type { MedicationScheduleType } from './medicationSchedule';
import type { PrescriptionPrefill } from './prescriptionScan';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
/** Prefer a current Flash model; 2.0-flash remains a fallback if needed. */
const GEMINI_MODEL = 'gemini-2.0-flash';

type AiLabelPayload = {
  name?: string;
  brandName?: string;
  strength?: string;
  route?: string;
  form?: string;
  directions?: string;
  scheduleType?: string;
  dosesPerDay?: number;
  scheduleTimes?: string[];
  quantity?: number;
  usageNotes?: string;
  warnings?: string;
};

const AI_PROMPT = `You parse OCR text from a U.S. pharmacy medication label (CVS, Walgreens, etc.).
Return ONLY valid JSON with these keys (omit unknown keys):
{
  "name": "generic drug name, title case",
  "brandName": "brand if mentioned",
  "strength": "e.g. 90 mcg, 0.1%, 250 mg/5 mL",
  "route": "oral | dermal | injection | other",
  "form": "tablet | capsule | inhaler | ointment | cream | patch | liquid | pen | etc",
  "directions": "full patient directions / SIG as one sentence",
  "scheduleType": "scheduled | as_needed",
  "dosesPerDay": number or null,
  "scheduleTimes": ["HH:mm", ...] 24h suggested reminder times if inferable,
  "quantity": number or null,
  "usageNotes": "how to use, storage, priming, rinsing — patient counseling only; NOT flu shots or vaccine ads",
  "warnings": "clinical warnings on label if any (interactions, do not combine)"
}
Rules:
- Prefer the generic drug name over brand.
- route "other" for inhalers (HFA, puff), eye drops, nasal sprays unless clearly injection/dermal.
- scheduleType "as_needed" only when directions say PRN/as needed/for pain/etc.
- scheduleTimes: guess sensible defaults (e.g. twice daily → 08:00 and 20:00).
- Never invent a drug name not present in the text.
- usageNotes: practical how-to-use counseling only — never flu shot / vaccine / immunization promos.
- CVS labels often show ALL CAPS drug name on one line (e.g. ADVAIR HFA) and strength on the next (115-21 MCG INHALER).`;

function normalizeRoute(value: string | undefined): MedicationRouteId | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (isMedicationRouteId(v)) return v;
  if (v.includes('mouth') || v.includes('oral')) return 'oral';
  if (v.includes('topical') || v.includes('skin') || v.includes('dermal')) return 'dermal';
  if (v.includes('inject') || v.includes('subcut')) return 'injection';
  return 'other';
}

function normalizeScheduleType(value: string | undefined): MedicationScheduleType | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v.includes('as_needed') || v.includes('as needed') || v === 'prn') return 'as_needed';
  if (v.includes('scheduled') || v.includes('daily')) return 'scheduled';
  return undefined;
}

function normalizeTimes(times: unknown): string[] | undefined {
  if (!Array.isArray(times)) return undefined;
  const out = times
    .map((t) => String(t).trim())
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    })
    .filter((t): t is string => t != null);
  return out.length > 0 ? out : undefined;
}

function parseAiJson(text: string): AiLabelPayload | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(candidate) as AiLabelPayload;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as AiLabelPayload;
    } catch {
      return null;
    }
  }
}

/** True when a Gemini API key is baked into this build. */
export function isLabelAiAvailable(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export type LabelAiError = {
  status?: number;
  message: string;
};

let lastLabelAiError: LabelAiError | null = null;

export function getLastLabelAiError(): LabelAiError | null {
  return lastLabelAiError;
}

/**
 * Optional: send OCR text to Google Gemini for structured extraction.
 * Only the text is sent — not the photo. Returns null when AI is unavailable or fails.
 * Callers should ask the user before invoking (label text is health-related).
 */
export async function parseLabelWithAI(rawText: string): Promise<PrescriptionPrefill | null> {
  lastLabelAiError = null;
  if (!GEMINI_API_KEY || rawText.trim().length < 12) {
    if (!GEMINI_API_KEY) {
      lastLabelAiError = { message: 'AI key not configured in this build.' };
    }
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${AI_PROMPT}\n\n--- OCR TEXT ---\n${rawText.slice(0, 8000)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (e) {
    lastLabelAiError = {
      message: e instanceof Error ? e.message : 'Network error talking to AI.',
    };
    return null;
  }

  if (!response.ok) {
    let detail = `AI request failed (${response.status}).`;
    try {
      const errJson = (await response.json()) as { error?: { message?: string } };
      if (errJson.error?.message) detail = errJson.error.message;
    } catch {
      // ignore body parse
    }
    lastLabelAiError = { status: response.status, message: detail };
    return null;
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    lastLabelAiError = { message: 'AI returned an empty response.' };
    return null;
  }

  const parsed = parseAiJson(text);
  if (!parsed) {
    lastLabelAiError = { message: 'AI returned text that was not valid JSON.' };
    return null;
  }

  const route = normalizeRoute(parsed.route);
  const scheduleType = normalizeScheduleType(parsed.scheduleType);
  const scheduleTimes = normalizeTimes(parsed.scheduleTimes);
  const aiFields: string[] = [];

  const result: PrescriptionPrefill = {
    rawText,
    aiEnhanced: true,
    aiFields,
  };

  if (parsed.name?.trim()) {
    result.name = parsed.name.trim();
    aiFields.push('name');
  }
  if (parsed.brandName?.trim()) {
    result.brandName = parsed.brandName.trim();
    aiFields.push('brandName');
  }
  if (parsed.strength?.trim()) {
    result.doseMg = parsed.strength.trim();
    aiFields.push('doseMg');
  }
  if (route) {
    result.route = route;
    aiFields.push('route');
  }
  if (parsed.form?.trim()) {
    result.form = parsed.form.trim().toLowerCase().replace(/\s+/g, '-');
    aiFields.push('form');
  }
  if (parsed.directions?.trim()) {
    result.directions = parsed.directions.trim();
    aiFields.push('directions');
  }
  const usageNotes = [parsed.usageNotes, parsed.warnings]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join('\n\n');
  if (usageNotes && !/\b(flu shot|covid|vaccine|immunization)\b/i.test(usageNotes)) {
    result.notes = usageNotes;
    aiFields.push('notes');
  }
  if (scheduleType) {
    result.scheduleType = scheduleType;
    aiFields.push('scheduleType');
  }
  if (typeof parsed.dosesPerDay === 'number' && parsed.dosesPerDay > 0) {
    result.dosesPerDay = parsed.dosesPerDay;
    aiFields.push('dosesPerDay');
  }
  if (scheduleTimes) {
    result.scheduleTimes = scheduleTimes;
    aiFields.push('scheduleTimes');
  }
  if (typeof parsed.quantity === 'number' && parsed.quantity > 0) {
    result.quantity = parsed.quantity;
    aiFields.push('quantity');
  }

  return aiFields.length > 0 ? result : null;
}
