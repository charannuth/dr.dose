import {
  diffDays,
  has,
  isIsoDate,
  list,
  num,
  recentEntries,
  shiftDate,
  str,
  type Flag,
  type GenericPrefs,
  type HeroInfo,
  type TrackerCtx,
  type TrackerDef,
} from '../genericTracker'
import { CRISIS_LINE } from './mind'

// ---------------------------------------------------------------------------
// Pregnancy
// ---------------------------------------------------------------------------

/** Pregnancy start (LMP-equivalent) from a due date or LMP. */
export function pregnancyStart(setup: Record<string, unknown>): string | null {
  if (isIsoDate(setup.dueDate)) return shiftDate(setup.dueDate, -280)
  if (isIsoDate(setup.lmp)) return setup.lmp
  if (isIsoDate(setup.transferDate)) {
    // Day-5 embryo transfer ≈ 2 weeks 5 days of gestation.
    return shiftDate(setup.transferDate, -19)
  }
  return null
}

export function gestationalAge(setup: Record<string, unknown>, date: string): { weeks: number; days: number; total: number } | null {
  const start = pregnancyStart(setup)
  if (!start) return null
  const total = diffDays(start, date)
  if (total < 0 || total > 315) return null
  return { weeks: Math.floor(total / 7), days: total % 7, total }
}

const SIZE_BY_WEEK: [number, string][] = [
  [4, 'a poppy seed'], [5, 'a sesame seed'], [6, 'a lentil'], [7, 'a blueberry'], [8, 'a raspberry'],
  [9, 'a cherry'], [10, 'a strawberry'], [11, 'a fig'], [12, 'a lime'], [13, 'a lemon'], [14, 'a peach'],
  [15, 'an apple'], [16, 'an avocado'], [17, 'a pear'], [18, 'a bell pepper'], [19, 'a mango'],
  [20, 'a banana'], [22, 'a papaya'], [24, 'an ear of corn'], [26, 'a lettuce'], [28, 'an aubergine'],
  [30, 'a cabbage'], [32, 'a squash'], [34, 'a cantaloupe'], [36, 'a honeydew melon'], [38, 'a pumpkin'], [40, 'a watermelon'],
]

export function babySize(weeks: number): string | null {
  let out: string | null = null
  for (const [w, s] of SIZE_BY_WEEK) if (weeks >= w) out = s
  return out
}

function pregnancyHero(ctx: TrackerCtx): HeroInfo {
  const ga = gestationalAge(ctx.prefs.setup, ctx.today)
  const due = isIsoDate(ctx.prefs.setup.dueDate) ? ctx.prefs.setup.dueDate : pregnancyStart(ctx.prefs.setup) ? shiftDate(pregnancyStart(ctx.prefs.setup) as string, 280) : null
  if (!ga || !due) {
    return { center: '—', caption: 'weeks', title: 'Add your due date', subtitle: 'Tap ✨ Make it yours to add a due date, last period or transfer date.' }
  }
  const tri = ga.weeks < 14 ? 'First trimester' : ga.weeks < 28 ? 'Second trimester' : 'Third trimester'
  const hideSize = ctx.prefs.goals.includes('after_loss') || ctx.prefs.setup.hideSize === true
  const size = babySize(ga.weeks)
  const toGo = diffDays(ctx.today, due)
  const carrier = ctx.prefs.goals.includes('surrogate') ? ' (carrying)' : ctx.prefs.goals.includes('partner') ? ' (supporting)' : ''
  return {
    center: `${ga.weeks}+${ga.days}`,
    caption: 'weeks',
    title: `${tri}${carrier}`,
    subtitle: [
      toGo >= 0 ? `${toGo} days until your due date (${due}).` : `${-toGo} days past your due date.`,
      !hideSize && size ? `About the size of ${size}.` : null,
      ctx.prefs.goals.includes('after_loss') ? 'One day at a time. 💛' : null,
    ].filter(Boolean).join(' '),
    progress: Math.min(1, ga.total / 280),
    pills: num(ctx.prefs.setup.babies) && (num(ctx.prefs.setup.babies) as number) > 1 ? [`👶 ×${num(ctx.prefs.setup.babies)}`] : [],
  }
}

const PREG_URGENT = [
  'Vaginal bleeding',
  'Fluid leaking',
  'Baby moving less',
  'Severe headache',
  'Vision changes',
  'Sudden swelling (face / hands)',
  'Severe belly pain',
  'Fever',
  'Constant itching (hands / feet)',
  'Thoughts of harming myself or baby',
]

export const pregnancyTracker: TrackerDef = {
  id: 'pregnancy',
  label: 'Pregnancy',
  emoji: '🤰',
  accent: 'amber',
  category: 'family',
  description: 'Weeks and trimesters, symptoms, blood pressure, glucose, kicks, contractions, appointments and warning signs',
  intro: 'Week by week, at your pace. Your clinician knows your pregnancy best; this helps you share the details.',
  disclaimer: 'Not medical advice. Always contact your midwife, doctor or maternity unit if you are worried, even if this app shows nothing.',
  goals: [
    { value: 'first', label: 'First pregnancy', emoji: '🌱' },
    { value: 'after_loss', label: 'Pregnancy after loss', emoji: '🌈', hint: 'Gentler wording, no size comparisons' },
    { value: 'ivf', label: 'IVF / assisted pregnancy', emoji: '🧪' },
    { value: 'multiples', label: 'Twins or more', emoji: '👯' },
    { value: 'high_risk', label: 'High-risk pregnancy', emoji: '🩺' },
    { value: 'hg', label: 'Hyperemesis / severe sickness', emoji: '🤢' },
    { value: 'gd', label: 'Gestational diabetes', emoji: '🩸' },
    { value: 'hypertension', label: 'High blood pressure / pre-eclampsia risk', emoji: '❤️' },
    { value: 'surrogate', label: "I'm a surrogate / gestational carrier", emoji: '🤝' },
    { value: 'partner', label: "Tracking for my partner", emoji: '🫶' },
  ],
  setup: [
    { id: 'dueDate', type: 'date', label: 'Due date', hint: 'If you know it. Otherwise add your last period or transfer date.' },
    { id: 'lmp', type: 'date', label: 'First day of last period' },
    { id: 'transferDate', type: 'date', label: 'Embryo transfer date (day 5)' },
    { id: 'babies', type: 'choice', label: 'Babies', options: ['1', '2', '3+'] },
    { id: 'hideSize', type: 'toggle', label: 'Hide baby size comparisons' },
  ],
  sections: [
    {
      key: 'symptoms',
      label: 'How you feel',
      emoji: '🤰',
      accent: 'amber',
      fields: [
        { id: 'nausea', type: 'scale', label: 'Nausea', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'vomits', type: 'stepper', label: 'Times sick', max: 40 },
        { id: 'keepFluids', type: 'toggle', label: "Can't keep fluids down" },
        { id: 'symptoms', type: 'chips', label: 'Symptoms', allowCustom: true, options: ['Tired', 'Sore breasts', 'Heartburn', 'Constipation', 'Back pain', 'Pelvic girdle pain (SPD)', 'Round ligament pain', 'Leg cramps', 'Swollen feet', 'Headache', 'Dizzy', 'Braxton Hicks', 'Insomnia', 'Restless legs', 'Nosebleeds', 'Food aversions', 'Cravings'] },
        { id: 'energy', type: 'scale', label: 'Energy', min: 1, max: 5, low: 'Wiped out', high: 'Great' },
      ],
    },
    {
      key: 'baby',
      label: 'Baby movements',
      emoji: '👣',
      accent: 'purple',
      explainer: 'From around 24–28 weeks, get to know your baby\'s usual pattern. If movements slow down or change, contact your maternity unit straight away; do not wait until the next day.',
      fields: [
        { id: 'kicks', type: 'stepper', label: 'Kicks counted', max: 100 },
        { id: 'minutesTo10', type: 'number', label: 'Minutes to 10 movements', unit: 'min' },
        { id: 'movementNormal', type: 'choice', label: 'Movements compared to usual', options: ['Usual', 'More', 'Less', 'Not sure yet'] },
      ],
    },
    {
      key: 'health',
      label: 'Blood pressure, weight & glucose',
      emoji: '🩺',
      accent: 'red',
      defaultOn: (g) => g.some((x) => ['high_risk', 'gd', 'hypertension', 'multiples', 'ivf'].includes(x)),
      fields: [
        { id: 'systolic', type: 'number', label: 'Systolic', unit: 'mmHg' },
        { id: 'diastolic', type: 'number', label: 'Diastolic', unit: 'mmHg' },
        { id: 'weight', type: 'number', label: 'Weight', unit: (p: GenericPrefs) => String(p.setup.weightUnit ?? 'kg'), decimal: true },
        { id: 'glucose', type: 'number', label: 'Glucose', unit: (p: GenericPrefs) => String(p.setup.glucoseUnit ?? 'mg/dL'), decimal: true },
        { id: 'glucoseContext', type: 'choice', label: 'When', options: ['Fasting', '1 h after meal', '2 h after meal'] },
      ],
    },
    {
      key: 'labor',
      label: 'Contractions',
      emoji: '⏱️',
      accent: 'red',
      explainer: 'Count contractions for an hour and note how far apart they are. Your unit will tell you when to come in; before 37 weeks, regular contractions need a call.',
      collapsed: true,
      fields: [
        { id: 'contractions', type: 'stepper', label: 'Contractions in the last hour', max: 30 },
        { id: 'apartMin', type: 'number', label: 'Minutes apart', unit: 'min', decimal: true },
        { id: 'lastingSec', type: 'number', label: 'Each lasting', unit: 'sec' },
        { id: 'waters', type: 'toggle', label: 'Waters broke' },
      ],
    },
    {
      key: 'mind',
      label: 'Mood & support',
      emoji: '💛',
      accent: 'blue',
      explainer: 'Around 1 in 5 people have anxiety or depression in pregnancy. It is common, not your fault, and treatable.',
      fields: [
        { id: 'mood', type: 'scale', label: 'Mood', min: 1, max: 5, low: 'Low', high: 'Good', emojis: ['😞', '😕', '😐', '🙂', '😄'] },
        { id: 'feelings', type: 'chips', label: 'Feelings', allowCustom: true, options: ['Excited', 'Anxious', 'Overwhelmed', 'Teary', 'Calm', 'Disconnected', 'Scared', 'Supported', 'Lonely'] },
      ],
    },
    {
      key: 'care',
      label: 'Appointments & meds',
      emoji: '📅',
      accent: 'green',
      fields: [
        { id: 'appointment', type: 'chips', label: 'Today', options: ['Midwife / OB check', 'Scan / ultrasound', 'Blood test', 'Glucose test', 'NIPT / screening', 'Antenatal class', 'Specialist'] },
        { id: 'supplements', type: 'chips', label: 'Took', allowCustom: true, options: ['Prenatal vitamin', 'Folic acid', 'Iron', 'Vitamin D', 'Aspirin', 'Progesterone', 'Insulin / metformin', 'Anti-sickness meds'] },
        { id: 'questions', type: 'text', multiline: true, label: 'Questions for next appointment' },
      ],
    },
    {
      key: 'warning',
      label: 'Warning signs',
      emoji: '🚩',
      accent: 'red',
      explainer: 'If you notice any of these, call your maternity unit or emergency services now.',
      collapsed: true,
      fields: [{ id: 'warning', type: 'chips', label: 'Any of these?', options: PREG_URGENT }],
    },
    { key: 'notes', label: 'Journal', emoji: '📝', accent: 'blue', fields: [{ id: 'notes', type: 'text', multiline: true, label: 'Notes / memories' }] },
  ],
  insightFields: ['nausea', 'symptoms', 'systolic', 'kicks', 'mood'],
  hero: pregnancyHero,
  flags: (ctx) => {
    const out: Flag[] = []
    const d = ctx.day
    const warn = list(d.warning)
    if (warn.includes('Thoughts of harming myself or baby')) out.push({ id: 'crisis', tone: 'urgent', title: 'Please reach out now', body: `Tell your midwife, doctor or a crisis line today. ${CRISIS_LINE}` })
    if (warn.some((w) => w !== 'Thoughts of harming myself or baby') || d.movementNormal === 'Less') {
      out.push({ id: 'urgent', tone: 'urgent', title: 'Call your maternity unit now', body: 'Bleeding, leaking fluid, reduced movements, severe headache, vision changes, sudden swelling, severe pain, fever or constant itching all need same-day checks. Do not wait.' })
    }
    const s = num(d.systolic) ?? 0
    const di = num(d.diastolic) ?? 0
    if (s >= 140 || di >= 90) out.push({ id: 'bp', tone: 'urgent', title: 'High blood pressure', body: 'In pregnancy, 140/90 or higher needs checking today for pre-eclampsia. Call your maternity unit.' })
    const ga = gestationalAge(ctx.prefs.setup, ctx.date)
    if ((num(d.contractions) ?? 0) >= 4 && ga && ga.weeks < 37) out.push({ id: 'preterm', tone: 'urgent', body: 'Regular contractions before 37 weeks can be preterm labour. Call your maternity unit now.' })
    if (d.waters === true) out.push({ id: 'waters', tone: 'urgent', body: 'If your waters have broken, call your maternity unit (note the time and the colour of the fluid).' })
    if (d.keepFluids === true || (num(d.vomits) ?? 0) >= 5) out.push({ id: 'hg', tone: 'warn', body: "Being sick this often, or not keeping fluids down, can be hyperemesis gravidarum. It's treatable; contact your doctor or midwife today." })
    const g = num(d.glucose)
    if (g != null && d.glucoseContext === 'Fasting') {
      const mmol = ctx.prefs.setup.glucoseUnit === 'mmol/L'
      if (mmol ? g >= 5.3 : g >= 95) out.push({ id: 'gd', tone: 'info', body: 'This fasting glucose is above the usual pregnancy target. Share it with your diabetes or maternity team.' })
    }
    return out
  },
  dayLabel: (d) => (list(d.warning).length ? '⚠️ Warning sign' : num(d.kicks) ? `Kicks ${num(d.kicks)}` : 'Pregnancy log'),
}

// ---------------------------------------------------------------------------
// Fertility treatment
// ---------------------------------------------------------------------------

export const fertilityTracker: TrackerDef = {
  id: 'fertility',
  label: 'Fertility treatment',
  emoji: '🧪',
  accent: 'green',
  category: 'family',
  description: 'IVF, IUI, FET, egg freezing and donor journeys: meds, injection sites, monitoring, embryo updates, two-week wait',
  intro: 'Every path to a family is valid. Keep meds, scans and results in one place, and be kind to yourself.',
  goals: [
    { value: 'ivf', label: 'IVF', emoji: '🧪' },
    { value: 'fet', label: 'Frozen embryo transfer', emoji: '❄️' },
    { value: 'iui', label: 'IUI', emoji: '💧' },
    { value: 'oi', label: 'Ovulation induction (letrozole, clomid)', emoji: '💊' },
    { value: 'freezing', label: 'Egg / embryo freezing', emoji: '🧊' },
    { value: 'donor', label: 'Donor eggs or sperm', emoji: '🎁' },
    { value: 'reciprocal', label: 'Reciprocal IVF (two moms)', emoji: '👩‍❤️‍👩' },
    { value: 'carrier', label: 'Working with a gestational carrier', emoji: '🤝' },
    { value: 'solo', label: 'Solo parent by choice', emoji: '🌟' },
    { value: 'trans', label: 'Trans / non-binary family building', emoji: '🏳️‍⚧️' },
    { value: 'after_loss', label: 'After loss', emoji: '🌈' },
  ],
  setup: [
    { id: 'cycleStart', type: 'date', label: 'Stims / cycle day 1' },
    { id: 'triggerDate', type: 'date', label: 'Trigger shot' },
    { id: 'retrievalDate', type: 'date', label: 'Retrieval / IUI date' },
    { id: 'transferDate', type: 'date', label: 'Transfer date' },
    { id: 'embryoDay', type: 'choice', label: 'Embryo age at transfer', options: ['Day 3', 'Day 5', 'Day 6'] },
    { id: 'betaDate', type: 'date', label: 'Beta / blood test date' },
  ],
  sections: [
    {
      key: 'meds',
      label: 'Meds & injections',
      emoji: '💉',
      accent: 'green',
      fields: [
        { id: 'meds', type: 'chips', label: 'Taken today', allowCustom: true, options: ['Gonal-F / follitropin', 'Menopur', 'Cetrotide', 'Ganirelix', 'Lupron', 'Trigger shot', 'Progesterone in oil', 'Progesterone pessary / gel', 'Estradiol', 'Letrozole', 'Clomid', 'Baby aspirin', 'Prenatal', 'Heparin', 'Steroids'] },
        { id: 'site', type: 'choice', label: 'Injection site', options: ['Left belly', 'Right belly', 'Left thigh', 'Right thigh', 'Left glute', 'Right glute'] },
        { id: 'missedDose', type: 'toggle', label: 'Missed or late dose' },
      ],
    },
    {
      key: 'monitoring',
      label: 'Monitoring',
      emoji: '🔬',
      accent: 'blue',
      explainer: 'Copy numbers from your clinic portal so you can see the trend.',
      defaultOn: (g) => !g.includes('oi') || g.length > 1,
      fields: [
        { id: 'follicles', type: 'stepper', label: 'Follicles', max: 60 },
        { id: 'leadFollicle', type: 'number', label: 'Lead follicle', unit: 'mm', decimal: true },
        { id: 'lining', type: 'number', label: 'Lining', unit: 'mm', decimal: true },
        { id: 'e2', type: 'number', label: 'Estradiol (E2)', unit: 'pg/mL' },
        { id: 'lh', type: 'number', label: 'LH', unit: 'IU/L', decimal: true },
        { id: 'p4', type: 'number', label: 'Progesterone', unit: 'ng/mL', decimal: true },
      ],
    },
    {
      key: 'embryos',
      label: 'Retrieval & embryos',
      emoji: '🥚',
      accent: 'purple',
      defaultOn: (g) => g.some((x) => ['ivf', 'freezing', 'reciprocal', 'donor'].includes(x)),
      fields: [
        { id: 'milestone', type: 'choice', label: 'Milestone today', options: ['Baseline scan', 'Stims start', 'Trigger', 'Retrieval', 'Fertilization report', 'Day 3 update', 'Day 5 / 6 update', 'PGT results', 'Transfer', 'Beta', 'Scan'] },
        { id: 'eggs', type: 'number', label: 'Eggs retrieved' },
        { id: 'mature', type: 'number', label: 'Mature' },
        { id: 'fertilized', type: 'number', label: 'Fertilized' },
        { id: 'blasts', type: 'number', label: 'Blastocysts' },
        { id: 'frozen', type: 'number', label: 'Frozen' },
      ],
    },
    {
      key: 'body',
      label: 'Symptoms',
      emoji: '🎈',
      accent: 'amber',
      fields: [
        { id: 'bloating', type: 'scale', label: 'Bloating', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'symptoms', type: 'chips', label: 'Symptoms', allowCustom: true, options: ['Cramping', 'Spotting', 'Sore breasts', 'Headache', 'Mood swings', 'Tired', 'Injection bruising', 'Nausea', 'Hot flashes'] },
        { id: 'ohss', type: 'chips', label: 'OHSS warning signs', options: ['Severe bloating', 'Gained 1 kg+ in a day', 'Short of breath', 'Peeing very little', 'Vomiting'] },
      ],
    },
    {
      key: 'tww',
      label: 'Two-week wait & tests',
      emoji: '⏳',
      accent: 'purple',
      fields: [
        { id: 'test', type: 'choice', label: 'Home test', options: ['Not testing', 'Negative', 'Faint line', 'Positive'] },
        { id: 'beta', type: 'number', label: 'Beta hCG', unit: 'mIU/mL' },
      ],
    },
    {
      key: 'heart',
      label: 'How you are holding up',
      emoji: '💛',
      accent: 'blue',
      fields: [
        { id: 'mood', type: 'scale', label: 'Mood', min: 1, max: 5, low: 'Struggling', high: 'Hopeful', emojis: ['😞', '😕', '😐', '🙂', '😊'] },
        { id: 'feelings', type: 'chips', label: 'Feelings', allowCustom: true, options: ['Hopeful', 'Anxious', 'Exhausted', 'Grieving', 'Isolated', 'Supported', 'Numb', 'Angry', 'Excited'] },
        { id: 'notes', type: 'text', multiline: true, label: 'Notes' },
      ],
    },
  ],
  insightFields: ['follicles', 'e2', 'bloating', 'symptoms', 'mood'],
  hero: (ctx) => {
    const s = ctx.prefs.setup
    if (isIsoDate(s.transferDate) && ctx.today >= s.transferDate) {
      const dpt = diffDays(s.transferDate, ctx.today)
      const beta = isIsoDate(s.betaDate) ? diffDays(ctx.today, s.betaDate) : null
      return {
        center: `${dpt}`,
        caption: 'days past transfer',
        title: beta != null && beta >= 0 ? `Beta ${beta === 0 ? 'today' : `in ${beta} day${beta === 1 ? '' : 's'}`}` : `${dpt} days past transfer`,
        subtitle: 'The two-week wait is hard. Be gentle with yourself.',
        progress: Math.min(1, dpt / 14),
      }
    }
    if (isIsoDate(s.cycleStart) && ctx.today >= s.cycleStart) {
      const day = diffDays(s.cycleStart, ctx.today) + 1
      return {
        center: String(day),
        caption: 'stim / cycle day',
        title: isIsoDate(s.retrievalDate) ? `Retrieval / IUI ${s.retrievalDate}` : `Cycle day ${day}`,
        subtitle: 'Log meds and monitoring as you go.',
        progress: Math.min(1, day / 14),
      }
    }
    const medsDays = recentEntries(ctx, 30).filter((e) => list(e.data.meds).length).length
    return { center: String(medsDays), caption: 'med days', title: 'Your treatment log', subtitle: 'Add your cycle dates in ✨ Make it yours to see stim day and days past transfer.' }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const ohss = list(ctx.day.ohss)
    if (ohss.length >= 2 || ohss.includes('Short of breath') || ohss.includes('Peeing very little')) {
      out.push({ id: 'ohss', tone: 'urgent', title: 'Call your clinic now', body: 'These can be signs of ovarian hyperstimulation syndrome (OHSS). Your clinic has a 24-hour line for exactly this.' })
    } else if (ohss.length) {
      out.push({ id: 'ohss-mild', tone: 'warn', body: 'Mention this to your clinic today and keep up fluids.' })
    }
    if (ctx.day.missedDose === true) out.push({ id: 'missed', tone: 'info', body: 'Missed or late doses happen. Call your clinic nurse line for what to do; timing can matter.' })
    return out
  },
  dayLabel: (d) => str(d.milestone) ?? (list(d.meds).length ? `${list(d.meds).length} meds` : 'Treatment log'),
}

// ---------------------------------------------------------------------------
// Feeding
// ---------------------------------------------------------------------------

function feedWord(p: GenericPrefs): string {
  const w = str(p.setup.term)
  return w === 'Chestfeeding' ? 'chestfeeding' : w === 'Bodyfeeding' ? 'bodyfeeding' : 'breastfeeding'
}

export const feedingTracker: TrackerDef = {
  id: 'feeding',
  label: 'Feeding & pumping',
  emoji: '🍼',
  accent: 'blue',
  category: 'family',
  description: 'Breast, chest or bottle feeds, pumping output, diapers, latch pain, mastitis watch and parent recovery',
  intro: 'Fed is best, however you feed. Track feeds, pumping and diapers without the 3am maths.',
  goals: [
    { value: 'direct', label: 'Breast / chestfeeding', emoji: '🤱' },
    { value: 'combo', label: 'Combination feeding', emoji: '🔀' },
    { value: 'pumping', label: 'Exclusive pumping', emoji: '🧴' },
    { value: 'formula', label: 'Formula feeding', emoji: '🍼' },
    { value: 'induced', label: 'Inducing lactation (adoptive / trans parent)', emoji: '🌱' },
    { value: 'relactation', label: 'Relactation', emoji: '🔁' },
    { value: 'twins', label: 'Twins or more', emoji: '👯' },
    { value: 'nicu', label: 'NICU / premature baby', emoji: '🏥' },
    { value: 'weaning', label: 'Weaning', emoji: '👋' },
  ],
  setup: [
    { id: 'term', type: 'choice', label: 'What do you call it?', options: ['Breastfeeding', 'Chestfeeding', 'Bodyfeeding'] },
    { id: 'babyBirth', type: 'date', label: "Baby's birthday" },
    { id: 'volumeUnit', type: 'choice', label: 'Volume unit', options: ['ml', 'oz'] },
  ],
  sections: [
    {
      key: 'direct',
      label: 'Feeds at the breast / chest',
      emoji: '🤱',
      accent: 'blue',
      defaultOn: (g) => g.length === 0 || g.some((x) => ['direct', 'combo', 'induced', 'relactation', 'twins', 'weaning'].includes(x)),
      fields: [
        { id: 'feeds', type: 'stepper', label: 'Feeds today', max: 40 },
        { id: 'leftMin', type: 'number', label: 'Left total', unit: 'min' },
        { id: 'rightMin', type: 'number', label: 'Right total', unit: 'min' },
        { id: 'lastSide', type: 'choice', label: 'Last side', options: ['Left', 'Right', 'Both'] },
        { id: 'nippleShield', type: 'toggle', label: 'Used nipple shield / supplementer' },
      ],
    },
    {
      key: 'bottle',
      label: 'Bottles',
      emoji: '🍼',
      accent: 'purple',
      defaultOn: (g) => g.some((x) => ['combo', 'formula', 'pumping', 'nicu', 'twins'].includes(x)),
      fields: [
        { id: 'bottles', type: 'stepper', label: 'Bottles', max: 30 },
        { id: 'bottleTotal', type: 'number', label: 'Total amount', unit: (p) => String(p.setup.volumeUnit ?? 'ml'), decimal: true },
        { id: 'bottleType', type: 'choice', label: 'Mostly', options: ['Expressed milk', 'Formula', 'Mixed', 'Donor milk'] },
      ],
    },
    {
      key: 'pump',
      label: 'Pumping',
      emoji: '🧴',
      accent: 'green',
      defaultOn: (g) => g.some((x) => ['pumping', 'combo', 'induced', 'relactation', 'nicu'].includes(x)),
      fields: [
        { id: 'pumpSessions', type: 'stepper', label: 'Sessions', max: 20 },
        { id: 'pumpTotal', type: 'number', label: 'Total pumped', unit: (p) => String(p.setup.volumeUnit ?? 'ml'), decimal: true },
        { id: 'powerPump', type: 'toggle', label: 'Power pumped' },
        { id: 'galactagogues', type: 'chips', label: 'Supply support', allowCustom: true, options: ['Domperidone', 'Metoclopramide', 'Fenugreek', 'Moringa', 'Oats / lactation snacks', 'Hormone protocol (induced lactation)'] },
      ],
    },
    {
      key: 'diapers',
      label: 'Diapers',
      emoji: '🧷',
      accent: 'amber',
      explainer: 'After day 5, most babies have 6+ wet diapers a day. Fewer can mean they need more milk; check with your midwife or pediatrician.',
      fields: [
        { id: 'wet', type: 'stepper', label: 'Wet', max: 30 },
        { id: 'dirty', type: 'stepper', label: 'Dirty', max: 30 },
        { id: 'babyNotes', type: 'chips', label: 'Baby', options: ['Sleepy at feeds', 'Jaundice / yellow', 'Fussy', 'Spit up a lot', 'Weight check', 'Tongue tie concerns'] },
      ],
    },
    {
      key: 'parent',
      label: 'Your body',
      emoji: '💛',
      accent: 'red',
      fields: [
        { id: 'nipplePain', type: 'scale', label: 'Nipple / latch pain', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'issues', type: 'chips', label: 'Going on', allowCustom: true, options: ['Cracked / bleeding', 'Engorged', 'Blocked duct', 'Red, hot area', 'Fever / flu-like', 'Thrush', 'Low supply worry', 'Oversupply', 'Leaking', 'D-MER (sad at let-down)', 'Vasospasm'] },
        { id: 'mood', type: 'scale', label: 'Mood', min: 1, max: 5, low: 'Low', high: 'Good', emojis: ['😞', '😕', '😐', '🙂', '😄'] },
        { id: 'sleepHours', type: 'number', label: 'Your sleep', unit: 'hours', decimal: true },
        { id: 'notes', type: 'text', multiline: true, label: 'Notes' },
      ],
    },
  ],
  insightFields: ['feeds', 'pumpTotal', 'wet', 'nipplePain', 'issues'],
  hero: (ctx) => {
    const birth = isIsoDate(ctx.prefs.setup.babyBirth) ? ctx.prefs.setup.babyBirth : null
    const age = birth ? diffDays(birth, ctx.today) : null
    const feeds = (num(ctx.day.feeds) ?? 0) + (num(ctx.day.bottles) ?? 0)
    const ageLabel = age == null ? null : age < 14 ? `${age} days old` : age < 120 ? `${Math.floor(age / 7)} weeks old` : `${Math.floor(age / 30.44)} months old`
    return {
      center: String(feeds),
      caption: 'feeds today',
      title: ageLabel ? `Baby is ${ageLabel}` : `Your ${feedWord(ctx.prefs)} log`,
      subtitle: str(ctx.day.lastSide) ? `Last side: ${str(ctx.day.lastSide)}. Start on the other one next.` : 'Every feed counts, including the ones at 3am.',
      progress: Math.min(1, feeds / 10),
      pills: num(ctx.day.wet) != null ? [`💧 ${num(ctx.day.wet)} wet`] : [],
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const issues = list(ctx.day.issues)
    if (issues.includes('Red, hot area') && issues.includes('Fever / flu-like')) {
      out.push({ id: 'mastitis', tone: 'warn', title: 'Possible mastitis', body: 'A red, hot area with fever or flu-like feelings can be mastitis. Contact your doctor or midwife today; keep milk moving and rest.' })
    }
    const birth = isIsoDate(ctx.prefs.setup.babyBirth) ? ctx.prefs.setup.babyBirth : null
    const wet = num(ctx.day.wet)
    if (birth && diffDays(birth, ctx.date) >= 5 && wet != null && wet < 6 && ctx.date < ctx.today) {
      out.push({ id: 'wet', tone: 'warn', body: 'Fewer than 6 wet diapers after day 5 can mean baby needs more milk. Check in with your midwife, lactation consultant or pediatrician.' })
    }
    if (has(ctx.day.babyNotes, 'Jaundice / yellow') && has(ctx.day.babyNotes, 'Sleepy at feeds')) {
      out.push({ id: 'jaundice', tone: 'urgent', body: 'A yellow, very sleepy baby who is not feeding well needs to be seen today. Call your midwife or pediatrician.' })
    }
    if ((num(ctx.day.mood) ?? 5) <= 1) out.push({ id: 'mood', tone: 'warn', body: `Low days are common after birth, but if they last more than two weeks or feel heavy, please talk to someone. ${CRISIS_LINE}` })
    return out
  },
  dayLabel: (d) => {
    const feeds = (num(d.feeds) ?? 0) + (num(d.bottles) ?? 0)
    return feeds ? `${feeds} feeds` : num(d.pumpTotal) ? `Pumped ${num(d.pumpTotal)}` : 'Feeding log'
  },
}
