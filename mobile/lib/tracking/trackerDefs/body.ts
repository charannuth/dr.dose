import {
  has,
  list,
  num,
  recentEntries,
  type Flag,
  type TrackerDef,
} from '../genericTracker'

const BODY_AREAS = [
  'Head',
  'Jaw',
  'Neck',
  'Shoulders',
  'Upper back',
  'Lower back',
  'Chest',
  'Belly',
  'Pelvis',
  'Hips',
  'Arms',
  'Hands / wrists',
  'Legs',
  'Knees',
  'Feet / ankles',
  'Joints (many)',
  'All over',
]

export const painTracker: TrackerDef = {
  id: 'pain',
  label: 'Pain & flares',
  emoji: '🔥',
  accent: 'amber',
  category: 'body',
  description: 'Pain level, where and what kind, flares, triggers, relief, and how it affected your day',
  intro: 'Your pain is real. Logging it gives you words and patterns to bring to appointments.',
  goals: [
    { value: 'endo', label: 'Endometriosis / adenomyosis', emoji: '🌸' },
    { value: 'fibro', label: 'Fibromyalgia', emoji: '🕸️' },
    { value: 'arthritis', label: 'Arthritis / autoimmune', emoji: '🦴' },
    { value: 'eds', label: 'EDS / hypermobility', emoji: '🤸', hint: 'Adds dislocations and subluxations' },
    { value: 'sickle', label: 'Sickle cell', emoji: '🩸' },
    { value: 'back', label: 'Back or nerve pain', emoji: '⚡' },
    { value: 'pelvic', label: 'Pelvic pain / vulvodynia', emoji: '🫶' },
    { value: 'crps', label: 'CRPS / neuropathy', emoji: '🔥' },
    { value: 'injury', label: 'Injury or after surgery', emoji: '🩹' },
    { value: 'other', label: 'Something else', emoji: '❓' },
  ],
  sections: [
    {
      key: 'level',
      label: 'Pain today',
      emoji: '🔥',
      accent: 'amber',
      explainer: '0 is no pain and 10 is the worst you can imagine. Rate how it is right now or the worst it got today, whichever you prefer, just be consistent.',
      fields: [
        { id: 'pain', type: 'scale', label: 'Pain', min: 0, max: 10, low: 'None', high: 'Worst' },
        { id: 'areas', type: 'chips', label: 'Where', options: BODY_AREAS, allowCustom: true },
        { id: 'kind', type: 'chips', label: 'What it feels like', allowCustom: true, options: ['Aching', 'Burning', 'Stabbing', 'Throbbing', 'Cramping', 'Shooting', 'Pins & needles', 'Numb', 'Stiff', 'Pressure', 'Electric'] },
        { id: 'flare', type: 'toggle', label: "I'm in a flare" },
      ],
    },
    {
      key: 'eds',
      label: 'Joints',
      emoji: '🤸',
      accent: 'purple',
      defaultOn: (g) => g.includes('eds') || g.includes('arthritis'),
      fields: [
        { id: 'subluxations', type: 'stepper', label: 'Subluxations / dislocations', max: 50 },
        { id: 'stiffMinutes', type: 'number', label: 'Morning stiffness', unit: 'min' },
        { id: 'swollen', type: 'chips', label: 'Swollen joints', options: ['Fingers', 'Wrists', 'Elbows', 'Shoulders', 'Knees', 'Ankles', 'Toes'] },
      ],
    },
    {
      key: 'context',
      label: 'Triggers & relief',
      emoji: '🧩',
      accent: 'green',
      fields: [
        { id: 'triggers', type: 'chips', label: 'Possible triggers', allowCustom: true, options: ['Overdoing it', 'Poor sleep', 'Stress', 'Weather', 'Period / cycle', 'Sitting too long', 'Standing too long', 'Food', 'Illness', 'Sex', 'Travel', 'Cold'] },
        { id: 'relief', type: 'chips', label: 'What helped', allowCustom: true, options: ['Pain meds', 'Heat', 'Ice', 'Rest', 'Stretching', 'TENS', 'Bath', 'Massage', 'Physio exercises', 'Pacing', 'Compression', 'Mobility aid', 'Distraction'] },
        { id: 'reliefWorked', type: 'scale', label: 'Relief', min: 0, max: 4, low: 'None', high: 'A lot' },
      ],
    },
    {
      key: 'impact',
      label: 'Impact on your day',
      emoji: '🗓️',
      accent: 'blue',
      explainer: 'Doctors often care more about what pain stops you doing than the number.',
      fields: [
        { id: 'function', type: 'chips', label: 'Pain stopped me from', options: ['Work / school', 'Sleeping', 'Exercise', 'Chores', 'Socializing', 'Sex', 'Driving', 'Self-care', 'Leaving bed'] },
        { id: 'spoons', type: 'scale', label: 'Energy / spoons', min: 0, max: 10, low: 'Empty', high: 'Full' },
      ],
    },
    {
      key: 'red',
      label: 'Warning signs',
      emoji: '🚩',
      accent: 'red',
      collapsed: true,
      fields: [
        { id: 'redFlags', type: 'chips', label: 'Any of these?', options: ['Fever with pain', 'New numbness / weakness', 'Loss of bladder or bowel control', 'Chest pain', 'Pain after a fall or injury', 'Sudden severe pain'] },
      ],
    },
    { key: 'notes', label: 'Notes', emoji: '📝', accent: 'blue', fields: [{ id: 'notes', type: 'text', multiline: true, label: 'Notes' }] },
  ],
  insightFields: ['pain', 'spoons', 'areas', 'triggers', 'relief', 'flare'],
  hero: (ctx) => {
    const month = recentEntries(ctx, 30)
    const flares = month.filter((e) => e.data.flare === true).length
    const vals = recentEntries(ctx, 7).map((e) => num(e.data.pain)).filter((n): n is number => n != null)
    const avg = vals.length ? Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10 : null
    const p = num(ctx.day.pain)
    return {
      center: p != null ? String(p) : '—',
      caption: 'pain today',
      title: avg != null ? `Average pain ${avg}/10 this week` : 'How is your body today?',
      subtitle: `${flares} flare day${flares === 1 ? '' : 's'} in the last 30 days.`,
      progress: p != null ? p / 10 : null,
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const red = list(ctx.day.redFlags)
    if (red.length) {
      out.push({ id: 'red', tone: 'urgent', title: 'Please get checked promptly', body: `${red.join(', ')} can need urgent care. Contact a doctor today, or emergency services if it is severe or sudden.` })
    }
    const severe = recentEntries(ctx, 30).filter((e) => (num(e.data.pain) ?? 0) >= 7).length
    if (severe >= 8) out.push({ id: 'severe', tone: 'warn', body: 'Severe pain on many days this month. You deserve a plan that works; consider asking for a pain specialist referral.' })
    return out
  },
  dayLabel: (d) => (num(d.pain) != null ? `Pain ${num(d.pain)}/10${d.flare ? ' · flare' : ''}` : 'Pain logged'),
}

export const migraineTracker: TrackerDef = {
  id: 'migraine',
  label: 'Migraine & headache',
  emoji: '🤕',
  accent: 'purple',
  category: 'body',
  description: 'Attacks, aura, phases, triggers, relief meds, medication-overuse watch and menstrual migraine',
  intro: 'Log attacks and headache-free days. Medication days are tracked to help avoid rebound headaches.',
  goals: [
    { value: 'migraine', label: 'Migraine', emoji: '🤕' },
    { value: 'aura', label: 'Migraine with aura', emoji: '✨' },
    { value: 'menstrual', label: 'Menstrual migraine', emoji: '🌸' },
    { value: 'chronic', label: 'Chronic (15+ days a month)', emoji: '📅' },
    { value: 'tension', label: 'Tension headaches', emoji: '🧠' },
    { value: 'cluster', label: 'Cluster headaches', emoji: '⏱️' },
    { value: 'vestibular', label: 'Vestibular migraine / dizziness', emoji: '💫' },
  ],
  sections: [
    {
      key: 'attack',
      label: 'Attack',
      emoji: '🤕',
      accent: 'purple',
      fields: [
        { id: 'headache', type: 'choice', label: 'Today', options: [{ value: 'none', label: 'Headache-free', emoji: '✅' }, { value: 'headache', label: 'Headache', emoji: '😣' }, { value: 'migraine', label: 'Migraine', emoji: '🤕' }] },
        { id: 'severity', type: 'scale', label: 'Worst severity', min: 0, max: 10, low: 'Mild', high: 'Worst', showIf: ({ data }) => data.headache !== 'none' },
        { id: 'hours', type: 'number', label: 'Duration', unit: 'hours', decimal: true, showIf: ({ data }) => data.headache !== 'none' },
        { id: 'where', type: 'chips', label: 'Where', options: ['Left side', 'Right side', 'Both sides', 'Behind eye', 'Forehead', 'Back of head', 'Neck'], showIf: ({ data }) => data.headache !== 'none' },
      ],
    },
    {
      key: 'symptoms',
      label: 'Symptoms & phases',
      emoji: '✨',
      accent: 'blue',
      explainer: 'Prodrome (hours before: yawning, cravings, stiff neck), aura (visual or sensory changes), headache, then postdrome ("migraine hangover").',
      fields: [
        { id: 'aura', type: 'chips', label: 'Aura', options: ['Zigzags / flashing', 'Blind spot', 'Tingling', 'Speech trouble', 'Weakness one side'] },
        { id: 'symptoms', type: 'chips', label: 'Symptoms', allowCustom: true, options: ['Nausea', 'Vomiting', 'Light sensitive', 'Sound sensitive', 'Smell sensitive', 'Dizziness / vertigo', 'Neck pain', 'Brain fog', 'Fatigue', 'Yawning', 'Food cravings', 'Postdrome hangover'] },
      ],
    },
    {
      key: 'meds',
      label: 'Relief',
      emoji: '💊',
      accent: 'green',
      explainer: 'Taking pain relievers or triptans on 10 or more days a month can cause medication-overuse (rebound) headaches.',
      fields: [
        { id: 'acuteMeds', type: 'chips', label: 'Acute meds', allowCustom: true, options: ['Ibuprofen / NSAID', 'Paracetamol', 'Triptan', 'Gepant', 'Anti-nausea', 'Combination / caffeine', 'Opioid'] },
        { id: 'medHelped', type: 'scale', label: 'Did it help?', min: 0, max: 4, low: 'No', high: 'Fully' },
        { id: 'otherRelief', type: 'chips', label: 'Other relief', allowCustom: true, options: ['Dark room', 'Sleep', 'Ice / cold pack', 'Heat', 'Caffeine', 'Hydration', 'Device (nerve stim)', 'Pressure points'] },
        { id: 'preventive', type: 'toggle', label: 'Took preventive med' },
      ],
    },
    {
      key: 'triggers',
      label: 'Possible triggers',
      emoji: '🧩',
      accent: 'amber',
      fields: [
        { id: 'triggers', type: 'chips', label: 'Triggers', allowCustom: true, options: ['Period / cycle', 'Poor sleep', 'Oversleeping', 'Stress', 'Let-down after stress', 'Skipped meal', 'Dehydration', 'Alcohol', 'Caffeine change', 'Bright light', 'Screens', 'Weather / pressure', 'Strong smells', 'Chocolate / cheese', 'Exercise', 'Travel'] },
      ],
    },
    {
      key: 'impact',
      label: 'Impact',
      emoji: '🗓️',
      accent: 'blue',
      fields: [
        { id: 'missed', type: 'chips', label: 'Missed', options: ['Work / school', 'Plans', 'Childcare', 'Exercise'] },
        { id: 'notes', type: 'text', multiline: true, label: 'Notes' },
      ],
    },
  ],
  insightFields: ['severity', 'hours', 'triggers', 'acuteMeds', 'symptoms'],
  hero: (ctx) => {
    const month = recentEntries(ctx, 30)
    const days = month.filter((e) => e.data.headache === 'headache' || e.data.headache === 'migraine').length
    const medDays = month.filter((e) => list(e.data.acuteMeds).length > 0).length
    return {
      center: String(days),
      caption: 'days / 30',
      title: days ? `${days} headache day${days === 1 ? '' : 's'} this month` : 'Headache-free so far',
      subtitle: `Acute meds on ${medDays} day${medDays === 1 ? '' : 's'} (keep under 10 a month).`,
      progress: Math.min(1, days / 15),
      pills: medDays >= 8 ? ['⚠️ Watch medication days'] : [],
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const d = ctx.day
    if (has(d.aura, 'Weakness one side') || has(d.aura, 'Speech trouble') || (num(d.severity) ?? 0) >= 10) {
      out.push({ id: 'stroke', tone: 'urgent', title: 'Get urgent care if this is new', body: 'A sudden "worst ever" headache, new weakness on one side, or trouble speaking can be an emergency. If this is new or different from your usual attacks, call emergency services.' })
    }
    const medDays = recentEntries(ctx, 30).filter((e) => list(e.data.acuteMeds).length > 0).length
    if (medDays >= 10) out.push({ id: 'moh', tone: 'warn', body: `Acute headache meds on ${medDays} of the last 30 days. Talk to a clinician about medication-overuse headache and preventive options.` })
    const days = recentEntries(ctx, 30).filter((e) => e.data.headache === 'headache' || e.data.headache === 'migraine').length
    if (days >= 15) out.push({ id: 'chronic', tone: 'warn', body: '15 or more headache days a month is considered chronic. Preventive treatment can make a real difference.' })
    return out
  },
  dayLabel: (d) => (d.headache === 'none' ? 'Headache-free' : d.headache === 'migraine' ? 'Migraine' : d.headache === 'headache' ? 'Headache' : 'Logged'),
}

export const respiratoryTracker: TrackerDef = {
  id: 'respiratory',
  label: 'Breathing & asthma',
  emoji: '🫁',
  accent: 'blue',
  category: 'body',
  description: 'Peak flow zones, rescue inhaler use, controller doses, symptoms, triggers and night waking',
  intro: 'Track your breathing so you can spot worsening early and follow your action plan.',
  goals: [
    { value: 'asthma', label: 'Asthma', emoji: '🫁' },
    { value: 'copd', label: 'COPD', emoji: '🌬️' },
    { value: 'allergies', label: 'Allergies / hay fever', emoji: '🌼' },
    { value: 'longcovid', label: 'Long COVID', emoji: '🦠' },
    { value: 'cf', label: 'Cystic fibrosis / bronchiectasis', emoji: '🧬' },
    { value: 'exercise', label: 'Exercise-induced', emoji: '🏃' },
  ],
  setup: [
    { id: 'personalBest', type: 'number', label: 'Personal best peak flow', unit: 'L/min', placeholder: 'e.g. 450' },
  ],
  sections: [
    {
      key: 'peak',
      label: 'Peak flow & oxygen',
      emoji: '📈',
      accent: 'blue',
      explainer: 'Take the best of three blows. Green zone is 80% or more of your personal best, yellow 50–80%, red under 50%.',
      defaultOn: (g) => !g.includes('allergies') || g.length > 1,
      fields: [
        { id: 'peakAm', type: 'number', label: 'Morning peak flow', unit: 'L/min' },
        { id: 'peakPm', type: 'number', label: 'Evening peak flow', unit: 'L/min' },
        { id: 'spo2', type: 'number', label: 'Oxygen (SpO₂)', unit: '%' },
      ],
    },
    {
      key: 'meds',
      label: 'Inhalers & meds',
      emoji: '💨',
      accent: 'green',
      fields: [
        { id: 'rescuePuffs', type: 'stepper', label: 'Rescue inhaler puffs', max: 60 },
        { id: 'controller', type: 'choice', label: 'Controller / preventer', options: ['Taken', 'Missed', 'Not prescribed'] },
        { id: 'otherMeds', type: 'chips', label: 'Other', allowCustom: true, options: ['Nebulizer', 'Antihistamine', 'Nasal spray', 'Steroid tablets', 'Antibiotics', 'Airway clearance'] },
      ],
    },
    {
      key: 'symptoms',
      label: 'Symptoms',
      emoji: '😮‍💨',
      accent: 'amber',
      fields: [
        { id: 'symptoms', type: 'chips', label: 'Symptoms', allowCustom: true, options: ['Wheeze', 'Cough', 'Chest tightness', 'Short of breath', 'Mucus', 'Runny / blocked nose', 'Itchy eyes', 'Sore throat'] },
        { id: 'nightWaking', type: 'toggle', label: 'Woke at night from breathing' },
        { id: 'limited', type: 'toggle', label: 'Limited my activity' },
        { id: 'triggers', type: 'chips', label: 'Triggers', allowCustom: true, options: ['Pollen', 'Dust', 'Pets', 'Smoke', 'Cold air', 'Exercise', 'Cold / flu', 'Mold', 'Strong smells', 'Air pollution', 'Stress', 'Period'] },
      ],
    },
    {
      key: 'danger',
      label: 'Danger signs',
      emoji: '🚩',
      accent: 'red',
      collapsed: true,
      fields: [
        { id: 'danger', type: 'chips', label: 'Any of these?', options: ['Too breathless to speak', 'Blue / grey lips', 'Rescue inhaler not helping', 'Ribs pulling in', 'Confused or very drowsy'] },
      ],
    },
    { key: 'notes', label: 'Notes', emoji: '📝', accent: 'blue', fields: [{ id: 'notes', type: 'text', multiline: true, label: 'Notes' }] },
  ],
  insightFields: ['peakAm', 'rescuePuffs', 'symptoms', 'triggers', 'nightWaking'],
  hero: (ctx) => {
    const best = num(ctx.prefs.setup.personalBest)
    const peak = num(ctx.day.peakAm) ?? num(ctx.day.peakPm)
    const pct = best && peak ? Math.round((peak / best) * 100) : null
    const rescueDays = recentEntries(ctx, 7).filter((e) => (num(e.data.rescuePuffs) ?? 0) > 0).length
    const zone = pct == null ? null : pct >= 80 ? '🟢 Green zone' : pct >= 50 ? '🟡 Yellow zone' : '🔴 Red zone'
    return {
      center: pct != null ? `${pct}%` : peak != null ? String(peak) : '—',
      caption: pct != null ? 'of best' : 'peak flow',
      title: zone ?? (best ? 'Log a peak flow reading' : 'Add your personal best in Make it yours'),
      subtitle: `Rescue inhaler on ${rescueDays} of the last 7 days.`,
      progress: pct != null ? Math.min(1, pct / 100) : null,
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const danger = list(ctx.day.danger)
    const best = num(ctx.prefs.setup.personalBest)
    const peak = num(ctx.day.peakAm) ?? num(ctx.day.peakPm)
    const spo2 = num(ctx.day.spo2)
    if (danger.length || (best && peak && peak / best < 0.5) || (spo2 != null && spo2 < 92)) {
      out.push({ id: 'red', tone: 'urgent', title: 'Follow your red-zone plan', body: 'Use your rescue inhaler as your action plan says and get emergency help now (call emergency services) if you are not improving fast.' })
    } else if (best && peak && peak / best < 0.8) {
      out.push({ id: 'yellow', tone: 'warn', body: 'Yellow zone: follow your action plan and contact your clinician if it does not improve within a day.' })
    }
    const rescueDays = recentEntries(ctx, 7).filter((e) => (num(e.data.rescuePuffs) ?? 0) > 0).length
    if (rescueDays > 2) out.push({ id: 'control', tone: 'warn', body: 'Needing your rescue inhaler more than 2 days a week usually means asthma is not well controlled. Ask about your preventer.' })
    return out
  },
  dayLabel: (d) => (num(d.rescuePuffs) ? `Rescue ×${num(d.rescuePuffs)}` : num(d.peakAm) ? `Peak ${num(d.peakAm)}` : 'Breathing logged'),
}

export const vitalsTracker: TrackerDef = {
  id: 'vitals',
  label: 'Vitals',
  emoji: '❤️',
  accent: 'red',
  category: 'body',
  description: 'Blood pressure, heart rate, glucose with meal context, oxygen, temperature and ketones',
  intro: 'Log readings as you take them. Ranges are general guides; your clinician may set different targets.',
  goals: [
    { value: 'bp', label: 'Blood pressure', emoji: '🩺' },
    { value: 'diabetes', label: 'Diabetes / glucose', emoji: '🩸' },
    { value: 'gestational', label: 'Gestational diabetes', emoji: '🤰' },
    { value: 'heart', label: 'Heart rhythm / POTS', emoji: '💓', hint: 'Adds lying vs standing heart rate' },
    { value: 'oxygen', label: 'Oxygen', emoji: '🫁' },
    { value: 'fever', label: 'Temperature / illness', emoji: '🌡️' },
    { value: 'hrt', label: 'Monitoring on HRT or the pill', emoji: '💊' },
  ],
  setup: [
    { id: 'glucoseUnit', type: 'choice', label: 'Glucose unit', options: ['mg/dL', 'mmol/L'] },
    { id: 'tempUnit', type: 'choice', label: 'Temperature unit', options: ['°C', '°F'] },
  ],
  sections: [
    {
      key: 'bp',
      label: 'Blood pressure & heart',
      emoji: '🩺',
      accent: 'red',
      explainer: 'Sit quietly for 5 minutes, feet flat, arm at heart level. Take two readings a minute apart.',
      defaultOn: (g) => g.length === 0 || g.some((x) => ['bp', 'heart', 'hrt', 'gestational'].includes(x)),
      fields: [
        { id: 'systolic', type: 'number', label: 'Systolic (top)', unit: 'mmHg' },
        { id: 'diastolic', type: 'number', label: 'Diastolic (bottom)', unit: 'mmHg' },
        { id: 'pulse', type: 'number', label: 'Heart rate', unit: 'bpm' },
        { id: 'pulseStanding', type: 'number', label: 'Heart rate after 10 min standing', unit: 'bpm', showIf: ({ prefs }) => prefs.goals.includes('heart') },
        { id: 'bpContext', type: 'chips', label: 'Context', options: ['Morning', 'Evening', 'Left arm', 'Right arm', 'After meds', 'Stressed', 'Wrist cuff'] },
      ],
    },
    {
      key: 'glucose',
      label: 'Glucose',
      emoji: '🩸',
      accent: 'amber',
      defaultOn: (g) => g.includes('diabetes') || g.includes('gestational'),
      fields: [
        { id: 'glucose', type: 'number', label: 'Glucose', unit: (p) => String(p.setup.glucoseUnit ?? 'mg/dL'), decimal: true },
        { id: 'glucoseContext', type: 'choice', label: 'When', options: ['Fasting', 'Before meal', '1 h after meal', '2 h after meal', 'Bedtime', 'Overnight', 'Random'] },
        { id: 'insulin', type: 'number', label: 'Insulin', unit: 'units', decimal: true },
        { id: 'ketones', type: 'number', label: 'Ketones', unit: 'mmol/L', decimal: true },
        { id: 'hypo', type: 'toggle', label: 'Had a hypo (low)' },
      ],
    },
    {
      key: 'other',
      label: 'Oxygen & temperature',
      emoji: '🌡️',
      accent: 'blue',
      defaultOn: (g) => g.includes('oxygen') || g.includes('fever'),
      fields: [
        { id: 'spo2', type: 'number', label: 'Oxygen (SpO₂)', unit: '%' },
        { id: 'temp', type: 'number', label: 'Temperature', unit: (p) => String(p.setup.tempUnit ?? '°C'), decimal: true },
        { id: 'resp', type: 'number', label: 'Breaths per minute', unit: '/min' },
      ],
    },
    {
      key: 'symptoms',
      label: 'How you feel',
      emoji: '🫀',
      accent: 'purple',
      fields: [
        { id: 'symptoms', type: 'chips', label: 'Symptoms', allowCustom: true, options: ['Headache', 'Dizzy', 'Palpitations', 'Fainted / nearly fainted', 'Shaky', 'Sweaty', 'Very thirsty', 'Blurred vision', 'Chest pain', 'Short of breath', 'Swollen ankles'] },
        { id: 'notes', type: 'text', multiline: true, label: 'Notes' },
      ],
    },
  ],
  insightFields: ['systolic', 'diastolic', 'pulse', 'glucose', 'spo2'],
  hero: (ctx) => {
    const s = num(ctx.day.systolic)
    const d = num(ctx.day.diastolic)
    const g = num(ctx.day.glucose)
    const bps = recentEntries(ctx, 7).filter((e) => num(e.data.systolic) != null)
    const avgS = bps.length ? Math.round(bps.reduce((t, e) => t + (num(e.data.systolic) ?? 0), 0) / bps.length) : null
    const avgD = bps.length ? Math.round(bps.reduce((t, e) => t + (num(e.data.diastolic) ?? 0), 0) / bps.length) : null
    return {
      center: s != null && d != null ? `${s}/${d}` : g != null ? String(g) : '—',
      caption: s != null && d != null ? 'mmHg' : g != null ? String(ctx.prefs.setup.glucoseUnit ?? 'mg/dL') : 'today',
      title: avgS != null ? `7-day average ${avgS}/${avgD}` : 'Log a reading',
      subtitle: 'Readings at the same times each day are easiest to compare.',
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const d = ctx.day
    const s = num(d.systolic) ?? 0
    const di = num(d.diastolic) ?? 0
    const mmol = ctx.prefs.setup.glucoseUnit === 'mmol/L'
    const g = num(d.glucose)
    const tempC = num(d.temp) != null ? (ctx.prefs.setup.tempUnit === '°F' ? ((num(d.temp) as number) - 32) * (5 / 9) : (num(d.temp) as number)) : null
    if (s >= 180 || di >= 120 || has(d.symptoms, 'Chest pain') || has(d.symptoms, 'Fainted / nearly fainted')) {
      out.push({ id: 'crisis', tone: 'urgent', title: 'Get help now', body: 'Very high blood pressure, chest pain or fainting needs urgent medical attention. Call emergency services if you have chest pain, weakness, vision or speech changes.' })
    } else if (s >= 140 || di >= 90) {
      out.push({ id: 'high', tone: 'warn', body: 'This reading is high. Recheck after resting; if it stays at 140/90 or above, contact your clinician (urgently if you are pregnant).' })
    } else if (s >= 130 || di >= 80) {
      out.push({ id: 'elevated', tone: 'info', body: 'Slightly raised reading. Worth keeping an eye on and sharing at your next appointment.' })
    }
    if (g != null && (mmol ? g < 3.9 : g < 70)) out.push({ id: 'hypo', tone: 'urgent', body: 'Low glucose. Treat it now with fast-acting sugar (like juice or glucose tabs), recheck in 15 minutes, and get help if you are confused or it will not come up.' })
    if (g != null && (mmol ? g > 13.9 : g > 250)) out.push({ id: 'hyper', tone: 'warn', body: 'High glucose. Check ketones if you use insulin, drink water, and follow your sick-day plan.' })
    if (num(d.ketones) != null && (num(d.ketones) as number) >= 1.5) out.push({ id: 'ketones', tone: 'urgent', body: 'Ketones 1.5 or higher can lead to DKA. Follow your plan and contact your diabetes team or urgent care now.' })
    if (num(d.spo2) != null && (num(d.spo2) as number) < 92) out.push({ id: 'spo2', tone: 'urgent', body: 'Oxygen under 92% needs medical advice today, sooner if you are breathless.' })
    if (tempC != null && tempC >= 38) out.push({ id: 'fever', tone: 'info', body: 'You have a fever. Rest and fluids; seek care if it lasts over 3 days, is very high, or you feel very unwell.' })
    if (num(d.pulse) != null && num(d.pulseStanding) != null && (num(d.pulseStanding) as number) - (num(d.pulse) as number) >= 30) {
      out.push({ id: 'pots', tone: 'info', body: 'Your heart rate rose 30+ bpm on standing. That pattern is worth sharing with a clinician (it is one sign looked at for POTS).' })
    }
    return out
  },
  dayLabel: (d) => (num(d.systolic) != null ? `BP ${num(d.systolic)}/${num(d.diastolic) ?? '?'}` : num(d.glucose) != null ? `Glucose ${num(d.glucose)}` : 'Vitals logged'),
}

export const gutTracker: TrackerDef = {
  id: 'gut',
  label: 'Gut health',
  emoji: '🌀',
  accent: 'green',
  category: 'body',
  description: 'Bristol stool chart, bloating, pain, reflux, food triggers, IBD flares and ostomy output',
  intro: 'Nobody else sees this. Gut details are really useful for doctors and help you find your triggers.',
  goals: [
    { value: 'ibs', label: 'IBS', emoji: '🌀' },
    { value: 'ibd', label: "Crohn's / colitis", emoji: '🔥' },
    { value: 'celiac', label: 'Celiac / intolerances', emoji: '🌾' },
    { value: 'reflux', label: 'Reflux / GERD', emoji: '🔥' },
    { value: 'endo', label: 'Endo belly / cycle-linked', emoji: '🌸' },
    { value: 'ostomy', label: 'I have a stoma', emoji: '🫙', hint: 'Adds output and bag changes' },
    { value: 'fodmap', label: 'Low-FODMAP / elimination diet', emoji: '🥕' },
    { value: 'constipation', label: 'Constipation', emoji: '🧱' },
  ],
  sections: [
    {
      key: 'bm',
      label: 'Bowel movements',
      emoji: '🚽',
      accent: 'green',
      explainer: 'Bristol type 1–2 is hard (constipation), 3–4 is the ideal, 5–7 is loose to watery.',
      defaultOn: (g) => !g.includes('ostomy') || g.length > 1,
      fields: [
        { id: 'bmCount', type: 'stepper', label: 'How many', max: 30 },
        { id: 'bristol', type: 'scale', label: 'Bristol type', min: 1, max: 7, low: 'Hard lumps', high: 'Watery' },
        { id: 'urgency', type: 'toggle', label: 'Urgency or accidents' },
        { id: 'straining', type: 'toggle', label: 'Straining / incomplete' },
      ],
    },
    {
      key: 'ostomy',
      label: 'Stoma',
      emoji: '🫙',
      accent: 'blue',
      defaultOn: (g) => g.includes('ostomy'),
      fields: [
        { id: 'emptyings', type: 'stepper', label: 'Bag emptyings', max: 30 },
        { id: 'output', type: 'choice', label: 'Output', options: ['Thick', 'Porridge-like', 'Loose', 'Watery / high output'] },
        { id: 'bagChange', type: 'toggle', label: 'Changed appliance' },
        { id: 'skin', type: 'chips', label: 'Peristomal skin', options: ['Fine', 'Red', 'Sore', 'Leak', 'Bleeding'] },
      ],
    },
    {
      key: 'symptoms',
      label: 'Symptoms',
      emoji: '🎈',
      accent: 'amber',
      fields: [
        { id: 'bloating', type: 'scale', label: 'Bloating', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'pain', type: 'scale', label: 'Tummy pain', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'symptoms', type: 'chips', label: 'Other', allowCustom: true, options: ['Gas', 'Nausea', 'Reflux / heartburn', 'Cramping', 'Mucus', 'Fatigue', 'Loss of appetite', 'Feeling full fast'] },
      ],
    },
    {
      key: 'food',
      label: 'Food & triggers',
      emoji: '🥕',
      accent: 'green',
      fields: [
        { id: 'triggers', type: 'chips', label: 'Suspected triggers', allowCustom: true, options: ['Dairy', 'Gluten / wheat', 'Onion / garlic', 'Beans', 'Spicy', 'Fatty / fried', 'Caffeine', 'Alcohol', 'Artificial sweeteners', 'Large meal', 'Stress', 'Period'] },
        { id: 'water', type: 'stepper', label: 'Glasses of water', max: 30 },
        { id: 'fiber', type: 'toggle', label: 'Took fiber / supplement' },
      ],
    },
    {
      key: 'red',
      label: 'Warning signs',
      emoji: '🚩',
      accent: 'red',
      collapsed: true,
      fields: [{ id: 'redFlags', type: 'chips', label: 'Any of these?', options: ['Blood in stool', 'Black, tarry stool', 'Vomiting blood', 'Unexplained weight loss', 'Severe pain that will not ease', 'Fever with pain', 'No stoma output for 6+ hours'] }],
    },
    { key: 'notes', label: 'Notes', emoji: '📝', accent: 'blue', fields: [{ id: 'notes', type: 'text', multiline: true, label: 'What I ate / notes' }] },
  ],
  insightFields: ['bristol', 'bloating', 'pain', 'triggers', 'symptoms'],
  flags: (ctx) => {
    const out: Flag[] = []
    const red = list(ctx.day.redFlags)
    if (red.some((r) => ['Black, tarry stool', 'Vomiting blood', 'Severe pain that will not ease', 'No stoma output for 6+ hours'].includes(r))) {
      out.push({ id: 'urgent', tone: 'urgent', title: 'Please get urgent care', body: `${red.join(', ')} can be serious. Contact a doctor now or go to urgent care.` })
    } else if (red.length) {
      out.push({ id: 'warn', tone: 'warn', body: `${red.join(', ')}: please book an appointment soon so it can be checked.` })
    }
    if (ctx.day.output === 'Watery / high output') out.push({ id: 'dehydrate', tone: 'warn', body: 'High stoma output can dehydrate you quickly. Use your rehydration plan and contact your stoma nurse if it continues.' })
    return out
  },
  dayLabel: (d) => (num(d.bristol) != null ? `Bristol ${num(d.bristol)}` : num(d.bloating) != null ? `Bloating ${num(d.bloating)}` : 'Gut logged'),
}

export const skinTracker: TrackerDef = {
  id: 'skin',
  label: 'Skin & hair',
  emoji: '✨',
  accent: 'amber',
  category: 'body',
  description: 'Breakouts by area, eczema, psoriasis, rosacea, HS, routines, products, hair shedding and mole checks',
  intro: 'Spot links between your skin, cycle, hormones, products and stress.',
  goals: [
    { value: 'acne', label: 'Acne / hormonal breakouts', emoji: '🔴' },
    { value: 'eczema', label: 'Eczema', emoji: '🩹' },
    { value: 'psoriasis', label: 'Psoriasis', emoji: '🧴' },
    { value: 'rosacea', label: 'Rosacea', emoji: '🌹' },
    { value: 'hs', label: 'Hidradenitis suppurativa', emoji: '⚠️' },
    { value: 'hair', label: 'Hair loss / thinning', emoji: '💇' },
    { value: 'hirsutism', label: 'Unwanted hair (PCOS, etc.)', emoji: '🪒' },
    { value: 'routine', label: 'Skincare routine', emoji: '🧖' },
    { value: 'moles', label: 'Mole checks', emoji: '🔍' },
  ],
  sections: [
    {
      key: 'skin',
      label: 'Skin today',
      emoji: '✨',
      accent: 'amber',
      fields: [
        { id: 'overall', type: 'scale', label: 'Overall', min: 1, max: 5, low: 'Rough', high: 'Glowing' },
        { id: 'breakouts', type: 'chips', label: 'Breakouts', options: ['Forehead', 'Cheeks', 'Chin / jaw', 'Nose', 'Back', 'Chest', 'Shoulders', 'Scalp', 'Groin / underarm'] },
        { id: 'issues', type: 'chips', label: 'Going on', allowCustom: true, options: ['Dry', 'Oily', 'Itchy', 'Redness', 'Flaking', 'Cracked / bleeding', 'Burning', 'Hives', 'Dark spots', 'Sunburn', 'Ingrown hairs', 'Boils / abscess'] },
        { id: 'itch', type: 'scale', label: 'Itch', min: 0, max: 10, low: 'None', high: 'Unbearable', showIf: ({ prefs }) => prefs.goals.includes('eczema') || prefs.goals.includes('psoriasis') },
      ],
    },
    {
      key: 'hair',
      label: 'Hair',
      emoji: '💇',
      accent: 'purple',
      defaultOn: (g) => g.includes('hair') || g.includes('hirsutism'),
      fields: [
        { id: 'shedding', type: 'scale', label: 'Shedding', min: 0, max: 5, low: 'Normal', high: 'A lot' },
        { id: 'scalp', type: 'chips', label: 'Scalp', options: ['Itchy', 'Flaky', 'Oily', 'Tender', 'Bald patch'] },
        { id: 'hairRemoval', type: 'chips', label: 'Hair removal', options: ['Shaved', 'Waxed', 'Laser', 'Electrolysis', 'Plucked', 'Cream'] },
      ],
    },
    {
      key: 'routine',
      label: 'Routine & products',
      emoji: '🧴',
      accent: 'green',
      fields: [
        { id: 'routine', type: 'chips', label: 'Did today', options: ['Cleanser', 'Moisturizer', 'SPF', 'Treatment / active', 'Prescription cream', 'Makeup removed', 'Changed pillowcase'] },
        { id: 'newProduct', type: 'text', label: 'New product tried', placeholder: 'Name' },
        { id: 'triggers', type: 'chips', label: 'Possible triggers', allowCustom: true, options: ['Period / cycle', 'Stress', 'Poor sleep', 'Dairy', 'Sugar', 'Sweat / gym', 'Mask', 'Weather', 'Hot water', 'Fragrance', 'Hormone change'] },
      ],
    },
    {
      key: 'moles',
      label: 'Mole check',
      emoji: '🔍',
      accent: 'red',
      explainer: 'ABCDE: Asymmetry, uneven Border, several Colours, Diameter over 6 mm, Evolving (changing). Any of these is worth showing a doctor.',
      defaultOn: (g) => g.includes('moles'),
      fields: [
        { id: 'moleChecked', type: 'toggle', label: 'Did a skin check' },
        { id: 'moleChanges', type: 'chips', label: 'Noticed', options: ['New mole', 'Changing size', 'Changing colour', 'Irregular edge', 'Itching / bleeding', 'Sore that will not heal'] },
      ],
    },
    { key: 'notes', label: 'Notes', emoji: '📝', accent: 'blue', fields: [{ id: 'notes', type: 'text', multiline: true, label: 'Notes' }] },
  ],
  insightFields: ['overall', 'breakouts', 'issues', 'triggers'],
  flags: (ctx) => {
    const out: Flag[] = []
    if (list(ctx.day.moleChanges).length) out.push({ id: 'mole', tone: 'warn', body: 'A new or changing mole, or a sore that will not heal, should be looked at by a doctor or dermatologist soon.' })
    if (has(ctx.day.issues, 'Hives') && has(ctx.day.issues, 'Burning')) out.push({ id: 'allergy', tone: 'info', body: 'If hives come with swelling of the lips, tongue or throat, or trouble breathing, get emergency help.' })
    return out
  },
  dayLabel: (d) => (num(d.overall) != null ? `Skin ${num(d.overall)}/5` : 'Skin logged'),
}

