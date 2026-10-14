/**
 * Cycle tracker personalization and the extra day details stored in
 * tracker_day_entries (tracker_id = 'cycle'). Pure data + helpers, no I/O.
 */

export type CycleGoal =
  | 'learning'
  | 'track'
  | 'symptoms'
  | 'conceive'
  | 'avoid'
  | 'condition'
  | 'birth_control'
  | 'perimenopause'
  | 'postpartum'

export type CycleSectionKey =
  | 'flow'
  | 'symptoms'
  | 'pain'
  | 'mood'
  | 'discharge'
  | 'intimacy'
  | 'fertility'
  | 'birthControl'
  | 'menopause'
  | 'postpartum'
  | 'notes'

export type PeriodWord = 'period' | 'bleed'

export type BirthControlMethod =
  | 'none'
  | 'pill'
  | 'minipill'
  | 'iud_hormonal'
  | 'iud_copper'
  | 'implant'
  | 'shot'
  | 'ring'
  | 'patch'
  | 'condoms'
  | 'other'

export type CyclePrefs = {
  goals: CycleGoal[]
  sections: Record<CycleSectionKey, boolean>
  periodWord: PeriodWord
  /** Neutral wording, private sections collapsed, no fertility estimates. */
  discreet: boolean
  /** Friendly "what's this?" explainers on every section. */
  explainers: boolean
  showPredictions: boolean
  showFertileWindow: boolean
  irregular: boolean
  conditions: string[]
  birthControl: BirthControlMethod
  tempUnit: 'C' | 'F'
  /** True once the user has saved the Make it yours sheet. */
  configured: boolean
}

export type CycleExtras = {
  pain?: number
  painAreas?: string[]
  moods?: string[]
  energy?: number
  sleep?: number
  stress?: number
  libido?: string
  discharge?: string
  protection?: string
  products?: string[]
  productChanges?: number
  bbt?: string
  ovulationTest?: string
  pregnancyTest?: string
  birthControlTaken?: boolean
  menopauseSymptoms?: string[]
  postpartum?: string[]
  bodyExtras?: string[]
}

export const CYCLE_GOAL_OPTIONS: { value: CycleGoal; label: string; emoji: string; hint: string }[] = [
  { value: 'learning', label: "I'm new to periods", emoji: '🌱', hint: 'Simple explanations, no fertility stuff' },
  { value: 'track', label: 'Know when my period is coming', emoji: '📅', hint: 'Predictions and reminders' },
  { value: 'symptoms', label: 'Understand my body & moods', emoji: '💭', hint: 'Symptoms, mood, energy and pain' },
  { value: 'conceive', label: 'Trying to conceive', emoji: '🍼', hint: 'Fertile window, BBT and tests' },
  { value: 'avoid', label: 'Avoiding pregnancy', emoji: '🛡️', hint: 'Fertility signs (awareness only)' },
  { value: 'condition', label: 'Managing a condition', emoji: '🩺', hint: 'PCOS, endometriosis, PMDD and more' },
  { value: 'birth_control', label: 'On birth control', emoji: '💊', hint: 'Daily check-off and side effects' },
  { value: 'perimenopause', label: 'Perimenopause / menopause', emoji: '🌙', hint: 'Hot flashes, sleep and irregular cycles' },
  { value: 'postpartum', label: 'Postpartum / after pregnancy', emoji: '🤱', hint: 'Bleeding after birth and recovery' },
]

export const CYCLE_SECTION_OPTIONS: {
  key: CycleSectionKey
  label: string
  emoji: string
  explainer: string
}[] = [
  {
    key: 'flow',
    label: 'Flow & products',
    emoji: '🩸',
    explainer:
      'How much you are bleeding. Spotting is a few drops; heavy means soaking a pad or tampon in 1–2 hours. Soaking through every hour for several hours is worth calling a doctor about.',
  },
  {
    key: 'symptoms',
    label: 'Body symptoms',
    emoji: '🫶',
    explainer:
      'Cramps, bloating, sore breasts and more are common around your period. Logging them helps you spot patterns and gives your doctor real details.',
  },
  {
    key: 'pain',
    label: 'Pain',
    emoji: '🔥',
    explainer:
      'Rate pain from 0 (none) to 10 (worst ever). Period pain that stops you going to school or work, or that painkillers do not help, is not something you have to put up with. Bring it up with a clinician.',
  },
  {
    key: 'mood',
    label: 'Mood, energy & sleep',
    emoji: '🌈',
    explainer:
      'Hormones shift across your cycle and can change how you feel. Every feeling is valid; tracking it helps you plan around tougher days.',
  },
  {
    key: 'discharge',
    label: 'Discharge',
    emoji: '💧',
    explainer:
      'Discharge is normal and changes through your cycle: drier after your period, stretchy and clear (like egg white) around ovulation. A strong smell, itching, or green/grey colour can mean an infection.',
  },
  {
    key: 'intimacy',
    label: 'Sex & intimacy',
    emoji: '💜',
    explainer:
      'Optional and private. Useful if you are trying to conceive, avoiding pregnancy, or noticing pain during sex.',
  },
  {
    key: 'fertility',
    label: 'Fertility signs',
    emoji: '🌡️',
    explainer:
      'Basal body temperature (taken right after waking) rises slightly after ovulation. Ovulation tests detect the LH surge 1–2 days before you ovulate. Estimates only, not contraception.',
  },
  {
    key: 'birthControl',
    label: 'Birth control',
    emoji: '💊',
    explainer: 'Tick it off each day so you can see missed days at a glance.',
  },
  {
    key: 'menopause',
    label: 'Perimenopause',
    emoji: '🌙',
    explainer:
      'In the years before menopause, cycles can get shorter, longer or skip. Hot flashes, night sweats and sleep changes are common and treatable.',
  },
  {
    key: 'postpartum',
    label: 'Postpartum',
    emoji: '🤱',
    explainer:
      'Bleeding after birth (lochia) can last up to 6 weeks and gets lighter over time. Large clots, fever or bleeding that gets heavier need prompt care.',
  },
  {
    key: 'notes',
    label: 'Notes',
    emoji: '📝',
    explainer: 'Anything else: stress, travel, illness, what helped.',
  },
]

export const CONDITION_OPTIONS = [
  'PCOS',
  'Endometriosis',
  'Adenomyosis',
  'PMDD',
  'Fibroids',
  'Thyroid condition',
  'Heavy periods',
  'Irregular periods',
  'Anemia',
  'Bleeding disorder',
] as const

export const BIRTH_CONTROL_OPTIONS: { value: BirthControlMethod; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pill', label: 'Combined pill' },
  { value: 'minipill', label: 'Mini pill' },
  { value: 'iud_hormonal', label: 'Hormonal IUD' },
  { value: 'iud_copper', label: 'Copper IUD' },
  { value: 'implant', label: 'Implant' },
  { value: 'shot', label: 'Shot' },
  { value: 'ring', label: 'Ring' },
  { value: 'patch', label: 'Patch' },
  { value: 'condoms', label: 'Condoms' },
  { value: 'other', label: 'Other' },
]

/** Methods taken or changed on a schedule the user may want to check off. */
export function birthControlIsDaily(method: BirthControlMethod): boolean {
  return method === 'pill' || method === 'minipill'
}

export const PERIOD_PRODUCT_OPTIONS = [
  'Pad',
  'Tampon',
  'Cup',
  'Disc',
  'Period underwear',
  'Liner',
] as const

export const PAIN_AREA_OPTIONS = [
  'Lower belly',
  'Lower back',
  'Pelvis',
  'Legs',
  'Head',
  'Breasts',
  'Joints',
  'During sex',
  'Bowel / peeing',
] as const

export const MOOD_OPTIONS: { value: string; emoji: string }[] = [
  { value: 'Happy', emoji: '😊' },
  { value: 'Calm', emoji: '😌' },
  { value: 'Confident', emoji: '😎' },
  { value: 'Motivated', emoji: '💪' },
  { value: 'Sensitive', emoji: '🥺' },
  { value: 'Sad', emoji: '😢' },
  { value: 'Anxious', emoji: '😰' },
  { value: 'Irritable', emoji: '😤' },
  { value: 'Angry', emoji: '😠' },
  { value: 'Overwhelmed', emoji: '😵‍💫' },
  { value: 'Numb', emoji: '😶' },
  { value: 'Very low', emoji: '🌧️' },
]

export const LIBIDO_OPTIONS = ['Low', 'Normal', 'High'] as const

export const DISCHARGE_OPTIONS: { value: string; hint: string }[] = [
  { value: 'None', hint: '' },
  { value: 'Dry', hint: 'Common right after a period' },
  { value: 'Sticky', hint: 'Thick, pasty' },
  { value: 'Creamy', hint: 'Lotion-like, white' },
  { value: 'Watery', hint: 'Clear and thin' },
  { value: 'Egg white', hint: 'Clear and stretchy, often near ovulation' },
  { value: 'Unusual', hint: 'Odd colour, smell, or itching' },
]

export const PROTECTION_OPTIONS = ['Protected', 'Unprotected', 'Solo', 'Not sure'] as const

export const OVULATION_TEST_OPTIONS = ['Negative', 'Positive', 'Peak'] as const
export const PREGNANCY_TEST_OPTIONS = ['Negative', 'Faint line', 'Positive'] as const

export const BODY_EXTRA_OPTIONS = [
  'Acne',
  'Oily skin',
  'Dry skin',
  'Hair loss',
  'Constipation',
  'Diarrhea',
  'Gas',
  'Dizziness',
  'Hot / sweaty',
  'Feeling cold',
  'Swelling',
] as const

export const MENOPAUSE_SYMPTOM_OPTIONS = [
  'Hot flashes',
  'Night sweats',
  'Trouble sleeping',
  'Brain fog',
  'Vaginal dryness',
  'Joint aches',
  'Heart racing',
  'Low libido',
  'Mood swings',
  'Skipped period',
] as const

export const POSTPARTUM_OPTIONS = [
  'Lochia bleeding',
  'Breastfeeding',
  'Pumping',
  'Stitches / healing pain',
  'Large clots',
  'Fever',
  'Baby blues',
  'Low mood that will not lift',
] as const

const ALL_SECTIONS = CYCLE_SECTION_OPTIONS.map((s) => s.key)

/** Sections switched on by default for a set of goals. */
export function recommendedSections(
  goals: readonly CycleGoal[],
  birthControl: BirthControlMethod = 'none',
): Record<CycleSectionKey, boolean> {
  const has = (g: CycleGoal) => goals.includes(g)
  const fertility = has('conceive') || has('avoid')
  return {
    flow: true,
    symptoms: true,
    pain: true,
    mood: true,
    discharge: true,
    intimacy: !has('learning'),
    fertility,
    birthControl: has('birth_control') || birthControl !== 'none',
    menopause: has('perimenopause'),
    postpartum: has('postpartum'),
    notes: true,
  }
}

export function defaultCyclePrefs(): CyclePrefs {
  return {
    goals: [],
    sections: recommendedSections([]),
    periodWord: 'period',
    discreet: false,
    explainers: false,
    showPredictions: true,
    showFertileWindow: false,
    irregular: false,
    conditions: [],
    birthControl: 'none',
    tempUnit: 'C',
    configured: false,
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeCyclePrefs(raw: Record<string, unknown>): CyclePrefs {
  const base = defaultCyclePrefs()
  const goals = stringList(raw.goals).filter((g): g is CycleGoal =>
    CYCLE_GOAL_OPTIONS.some((o) => o.value === g),
  )
  const birthControl = BIRTH_CONTROL_OPTIONS.some((o) => o.value === raw.birthControl)
    ? (raw.birthControl as BirthControlMethod)
    : base.birthControl
  const recommended = recommendedSections(goals, birthControl)
  const rawSections =
    raw.sections && typeof raw.sections === 'object' ? (raw.sections as Record<string, unknown>) : {}
  const sections = {} as Record<CycleSectionKey, boolean>
  for (const key of ALL_SECTIONS) sections[key] = bool(rawSections[key], recommended[key])
  return {
    goals,
    sections,
    periodWord: raw.periodWord === 'bleed' ? 'bleed' : 'period',
    discreet: bool(raw.discreet, base.discreet),
    explainers: bool(raw.explainers, goals.includes('learning')),
    showPredictions: bool(raw.showPredictions, base.showPredictions),
    showFertileWindow: bool(
      raw.showFertileWindow,
      goals.includes('conceive') || goals.includes('avoid'),
    ),
    irregular: bool(raw.irregular, base.irregular),
    conditions: stringList(raw.conditions),
    birthControl,
    tempUnit: raw.tempUnit === 'F' ? 'F' : 'C',
    configured: bool(raw.configured, false),
  }
}

function num(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(min, Math.round(n)))
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function list(value: unknown): string[] | undefined {
  const l = stringList(value)
  return l.length ? l : undefined
}

export function normalizeCycleExtras(raw: Record<string, unknown>): CycleExtras {
  const out: CycleExtras = {
    pain: num(raw.pain, 0, 10),
    painAreas: list(raw.painAreas),
    moods: list(raw.moods),
    energy: num(raw.energy, 1, 5),
    sleep: num(raw.sleep, 1, 5),
    stress: num(raw.stress, 1, 5),
    libido: str(raw.libido),
    discharge: str(raw.discharge),
    protection: str(raw.protection),
    products: list(raw.products),
    productChanges: num(raw.productChanges, 0, 30),
    bbt: str(raw.bbt),
    ovulationTest: str(raw.ovulationTest),
    pregnancyTest: str(raw.pregnancyTest),
    birthControlTaken: typeof raw.birthControlTaken === 'boolean' ? raw.birthControlTaken : undefined,
    menopauseSymptoms: list(raw.menopauseSymptoms),
    postpartum: list(raw.postpartum),
    bodyExtras: list(raw.bodyExtras),
  }
  for (const key of Object.keys(out) as (keyof CycleExtras)[]) {
    if (out[key] === undefined) delete out[key]
  }
  return out
}

export function cycleExtrasHasData(extras: CycleExtras | undefined): boolean {
  return Boolean(extras && Object.keys(extras).length > 0)
}

/** "period" / "bleed", optionally capitalized. */
export function periodWord(prefs: Pick<CyclePrefs, 'periodWord'>, capital = false): string {
  const w = prefs.periodWord
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w
}

/** A gentle, non-diagnostic nudge when a log suggests checking in with someone. */
export function extrasSupportNote(extras: CycleExtras): string | null {
  if (extras.moods?.includes('Very low') || extras.postpartum?.includes('Low mood that will not lift')) {
    return "You're not alone. If low moods stick around or you ever feel unsafe, please reach out to someone you trust or a doctor. In the US you can call or text 988 any time."
  }
  if (extras.postpartum?.includes('Fever') || extras.postpartum?.includes('Large clots')) {
    return 'Fever or large clots after giving birth should be checked by a clinician soon.'
  }
  if ((extras.productChanges ?? 0) >= 12) {
    return 'Changing products every hour or two all day can mean very heavy bleeding. It is worth mentioning to a clinician.'
  }
  if ((extras.pain ?? 0) >= 8) {
    return 'Pain this strong is not something you have to just live with. Consider talking to a clinician about it.'
  }
  return null
}
