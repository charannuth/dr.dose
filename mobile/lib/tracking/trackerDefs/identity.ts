import {
  diffDays,
  has,
  isIsoDate,
  list,
  num,
  recentEntries,
  str,
  type Flag,
  type HeroInfo,
  type TrackerCtx,
  type TrackerDef,
} from '../genericTracker'
import { CRISIS_LINE } from './mind'

// ---------------------------------------------------------------------------
// Pelvic health
// ---------------------------------------------------------------------------

export const pelvicTracker: TrackerDef = {
  id: 'pelvic',
  label: 'Pelvic health',
  emoji: '🌸',
  accent: 'purple',
  category: 'cycle',
  description: 'Bladder leaks and pads, pelvic floor exercises, dilator practice, sex and pain, prolapse and UTI signs',
  intro: 'Pelvic floor and bladder health for every body: after birth, in menopause, after surgery, with vaginismus or just because.',
  disclaimer: 'Not medical advice. A pelvic health physiotherapist can help with almost everything here.',
  goals: [
    { value: 'leaks', label: 'Bladder leaks', emoji: '💧' },
    { value: 'postpartum', label: 'Recovery after birth', emoji: '🍼' },
    { value: 'menopause', label: 'Menopause / GSM', emoji: '🌙', hint: 'Dryness, urgency, recurrent UTIs' },
    { value: 'prolapse', label: 'Prolapse', emoji: '🪷' },
    { value: 'vaginismus', label: 'Vaginismus / painful sex', emoji: '🫧' },
    { value: 'vaginoplasty', label: 'After vaginoplasty', emoji: '🏳️‍⚧️', hint: 'Dilation schedule' },
    { value: 'uti', label: 'Recurrent UTIs', emoji: '🦠' },
    { value: 'ic', label: 'Interstitial cystitis / bladder pain', emoji: '🔥' },
    { value: 'bowel', label: 'Bowel control', emoji: '🚽' },
    { value: 'strength', label: 'Pelvic floor strength', emoji: '💪' },
  ],
  setup: [
    { id: 'dilationsPerDay', type: 'stepper', label: 'Dilation sessions your surgeon asked for per day', max: 6 },
    { id: 'kegelTarget', type: 'stepper', label: 'Pelvic floor sets per day (goal)', max: 10 },
  ],
  sections: [
    {
      key: 'bladder',
      label: 'Bladder',
      emoji: '💧',
      accent: 'blue',
      defaultOn: (g) => g.some((x) => ['leaks', 'postpartum', 'menopause', 'prolapse', 'uti', 'ic'].includes(x)) || g.length === 0,
      explainer: 'Stress leaks happen with coughs, sneezes or jumping. Urge leaks happen with a sudden "must go now" feeling. Many people have both.',
      fields: [
        { id: 'leaks', type: 'stepper', label: 'Leaks', max: 30 },
        { id: 'leakType', type: 'chips', label: 'When it happened', options: ['Cough / sneeze / laugh', 'Exercise / lifting', 'Sudden urge', "Didn't feel it", 'At night', 'During sex'] },
        { id: 'leakSize', type: 'choice', label: 'Amount', options: ['Drops', 'Damp', 'Soaked through'] },
        { id: 'pads', type: 'stepper', label: 'Pads / liners / pants changed', max: 20 },
        { id: 'voids', type: 'stepper', label: 'Times you peed (day)', max: 40 },
        { id: 'nocturia', type: 'stepper', label: 'Woke up to pee', max: 10 },
        { id: 'urgency', type: 'scale', label: 'Urgency', min: 0, max: 10, low: 'None', high: 'Desperate' },
        { id: 'bladderPain', type: 'scale', label: 'Bladder pain', min: 0, max: 10, low: 'None', high: 'Severe', showIf: ({ prefs }) => prefs.goals.includes('ic') || prefs.goals.includes('uti') },
        { id: 'triggers', type: 'chips', label: 'Possible triggers', allowCustom: true, options: ['Coffee', 'Alcohol', 'Fizzy drinks', 'Citrus', 'Spicy food', 'Artificial sweetener', 'Cold weather', 'Constipation', 'Period'], showIf: ({ prefs }) => prefs.goals.includes('ic') || prefs.goals.includes('leaks') },
      ],
    },
    {
      key: 'uti',
      label: 'UTI signs',
      emoji: '🦠',
      accent: 'red',
      defaultOn: (g) => g.includes('uti') || g.includes('menopause') || g.includes('vaginoplasty'),
      fields: [
        { id: 'utiSigns', type: 'chips', label: 'Signs', options: ['Burning when peeing', 'Peeing often', 'Cloudy / smelly pee', 'Blood in pee', 'Lower belly ache', 'Fever / chills', 'Back or side pain', 'Confusion (older adults)'] },
        { id: 'utiTest', type: 'choice', label: 'Dipstick / test', options: ['Not tested', 'Negative', 'Positive'] },
        { id: 'utiTreatment', type: 'text', label: 'Treatment / antibiotic', placeholder: 'e.g. nitrofurantoin day 2 of 5' },
      ],
    },
    {
      key: 'floor',
      label: 'Pelvic floor exercises',
      emoji: '💪',
      accent: 'green',
      defaultOn: (g) => g.some((x) => ['leaks', 'postpartum', 'prolapse', 'strength', 'bowel', 'menopause'].includes(x)),
      explainer: 'Squeeze and lift as if stopping wind and pee, hold, then fully relax. The relax matters as much as the squeeze. If you have pain or tightness, a physio may suggest relaxation (down-training) instead.',
      fields: [
        { id: 'kegelSets', type: 'stepper', label: 'Sets done', max: 10 },
        { id: 'kegelKind', type: 'chips', label: 'Kind', options: ['Long holds', 'Quick flicks', 'The Knack (squeeze before cough)', 'Relaxation / reverse kegels', 'Breathing / diaphragm', 'Trainer / app device', 'Physio session'] },
        { id: 'heaviness', type: 'scale', label: 'Heaviness / dragging', min: 0, max: 10, low: 'None', high: 'Strong', showIf: ({ prefs }) => prefs.goals.includes('prolapse') || prefs.goals.includes('postpartum') },
        { id: 'pessary', type: 'choice', label: 'Pessary', options: ['In', 'Out / cleaned', 'Not used'], showIf: ({ prefs }) => prefs.goals.includes('prolapse') },
      ],
    },
    {
      key: 'dilation',
      label: 'Dilator practice',
      emoji: '🫧',
      accent: 'purple',
      defaultOn: (g) => g.includes('vaginoplasty') || g.includes('vaginismus'),
      explainer: 'Follow your surgeon or physio\'s schedule. Use plenty of water-based lube, breathe slowly and stop if you feel sharp pain. After vaginoplasty, consistent dilation in the first year is key to keeping depth.',
      fields: [
        { id: 'dilations', type: 'stepper', label: 'Sessions today', max: 6 },
        { id: 'dilatorSize', type: 'text', label: 'Dilator size', placeholder: 'e.g. Soul Source #2 / medium' },
        { id: 'depth', type: 'number', label: 'Depth reached', unit: 'cm', decimal: true, showIf: ({ prefs }) => prefs.goals.includes('vaginoplasty') },
        { id: 'minutes', type: 'number', label: 'Minutes per session', unit: 'min' },
        { id: 'dilationPain', type: 'scale', label: 'Discomfort', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'dilationNotes', type: 'chips', label: 'Notes', allowCustom: true, options: ['Bleeding', 'Granulation tissue', 'Smell / discharge', 'Douched', 'Felt easier', 'Hard to relax', 'Skipped (OK!)'] },
      ],
    },
    {
      key: 'intimacy',
      label: 'Sex & comfort',
      emoji: '💗',
      accent: 'red',
      defaultOn: (g) => g.includes('vaginismus') || g.includes('menopause'),
      collapsed: true,
      explainer: 'Private and optional. Pain with sex is common and treatable; it is never something you just have to put up with.',
      fields: [
        { id: 'sexPain', type: 'scale', label: 'Pain during / after', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'dryness', type: 'scale', label: 'Dryness', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'comfortAids', type: 'chips', label: 'What helped', allowCustom: true, options: ['Lubricant', 'Vaginal moisturiser', 'Vaginal estrogen', 'Numbing gel', 'Slower pace', 'Different position', 'Warm bath'] },
      ],
    },
    {
      key: 'bowelc',
      label: 'Bowel control',
      emoji: '🚽',
      accent: 'amber',
      defaultOn: (g) => g.includes('bowel'),
      fields: [
        { id: 'bowelAccidents', type: 'stepper', label: 'Accidents / soiling', max: 20 },
        { id: 'windControl', type: 'toggle', label: 'Trouble holding wind' },
        { id: 'straining', type: 'toggle', label: 'Straining / incomplete emptying' },
      ],
    },
    {
      key: 'notes',
      label: 'Notes',
      emoji: '📝',
      accent: 'purple',
      fields: [{ id: 'notes', type: 'text', label: 'Anything else', multiline: true }],
    },
  ],
  insightFields: ['leaks', 'urgency', 'kegelSets', 'dilations', 'leakType', 'triggers', 'nocturia'],
  dayLabel: (d) => {
    if (num(d.dilations)) return `🫧${num(d.dilations)}`
    if (num(d.leaks)) return `💧${num(d.leaks)}`
    if (num(d.kegelSets)) return `💪${num(d.kegelSets)}`
    return '🌸'
  },
  hero: (ctx) => {
    const week = recentEntries(ctx, 7)
    const wantDil = ctx.prefs.goals.includes('vaginoplasty') || ctx.prefs.goals.includes('vaginismus')
    if (wantDil) {
      const target = num(ctx.prefs.setup.dilationsPerDay) ?? 0
      const today = num(ctx.day.dilations) ?? 0
      const weekTotal = week.reduce((s, e) => s + (num(e.data.dilations) ?? 0), 0)
      return {
        center: target ? `${today}/${target}` : String(today),
        caption: 'dilations today',
        title: `${weekTotal} session${weekTotal === 1 ? '' : 's'} this week`,
        subtitle: 'Consistency beats perfection. A missed session is not a failure.',
        progress: target ? Math.min(1, today / target) : null,
      }
    }
    const leaks = week.reduce((s, e) => s + (num(e.data.leaks) ?? 0), 0)
    const sets = num(ctx.day.kegelSets) ?? 0
    const target = num(ctx.prefs.setup.kegelTarget) ?? 3
    return {
      center: `${sets}/${target}`,
      caption: 'floor sets today',
      title: `${leaks} leak${leaks === 1 ? '' : 's'} in the last 7 days`,
      subtitle: 'Small daily practice adds up over 8–12 weeks.',
      progress: Math.min(1, sets / Math.max(1, target)),
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const signs = list(ctx.day.utiSigns)
    if (signs.includes('Fever / chills') || signs.includes('Back or side pain')) {
      out.push({ id: 'kidney', tone: 'urgent', title: 'Possible kidney infection', body: 'UTI signs with fever, chills or back/side pain need a doctor today.' })
    } else if (signs.includes('Blood in pee')) {
      out.push({ id: 'blood', tone: 'warn', body: 'Blood in your pee should always be checked by a clinician, even if it stops.' })
    } else if (signs.length >= 2 || ctx.day.utiTest === 'Positive') {
      out.push({ id: 'uti', tone: 'warn', body: 'These signs can mean a UTI. A pharmacist or GP can test and treat it.' })
    }
    const utiDays = recentEntries(ctx, 180).filter((e) => list(e.data.utiSigns).length >= 2 || e.data.utiTest === 'Positive')
    const episodes = new Set(utiDays.map((e) => e.log_date.slice(0, 7))).size
    if (episodes >= 3) out.push({ id: 'recurrent', tone: 'info', body: 'Several UTI episodes in 6 months counts as recurrent. Ask about prevention, including vaginal estrogen if you are peri/postmenopausal.' })
    if (has(ctx.day.dilationNotes, 'Bleeding') && (num(ctx.day.dilationPain) ?? 0) >= 7) {
      out.push({ id: 'dilbleed', tone: 'warn', body: 'Heavy bleeding or severe pain with dilation: contact your surgical team.' })
    }
    if (has(ctx.day.dilationNotes, 'Smell / discharge') && has(ctx.day.utiSigns, 'Fever / chills')) {
      out.push({ id: 'postopinf', tone: 'urgent', body: 'Unusual discharge with fever after surgery can be an infection. Contact your surgeon today.' })
    }
    return out
  },
}

// ---------------------------------------------------------------------------
// Breast / chest self-check
// ---------------------------------------------------------------------------

export const breastcheckTracker: TrackerDef = {
  id: 'breastcheck',
  label: 'Breast & chest checks',
  emoji: '🎀',
  accent: 'red',
  category: 'cycle',
  description: 'Monthly self-check reminders and a private log of anything new, for every chest',
  intro: 'Get to know what is normal for you. Checking a week after your period (or the same date each month) works best.',
  disclaimer: 'Self-checks do not replace screening. If you notice any change, see a clinician; most changes are not cancer, but all deserve a look.',
  goals: [
    { value: 'routine', label: 'Routine checks', emoji: '🗓️' },
    { value: 'dense', label: 'Dense / lumpy breasts', emoji: '🫧' },
    { value: 'family', label: 'Family history / BRCA', emoji: '🧬' },
    { value: 'implants', label: 'Implants', emoji: '✨' },
    { value: 'mastectomy', label: 'After mastectomy / reconstruction', emoji: '🎗️' },
    { value: 'topsurgery', label: 'After top surgery', emoji: '🏳️‍⚧️', hint: 'Residual tissue can still change' },
    { value: 'hrt', label: 'On feminizing HRT', emoji: '💊', hint: 'New breast tissue needs checks too' },
    { value: 'breastfeeding', label: 'Breastfeeding / chestfeeding', emoji: '🍼' },
    { value: 'male', label: 'Male breast check', emoji: '🙋‍♂️' },
  ],
  setup: [
    { id: 'chestWord', type: 'choice', label: 'Words to use', options: ['Breasts', 'Chest'] },
    { id: 'lastScreen', type: 'date', label: 'Last mammogram / scan' },
    { id: 'screenEveryMonths', type: 'choice', label: 'Screening interval', options: ['6', '12', '24', '36'] },
  ],
  sections: [
    {
      key: 'check',
      label: 'Self-check',
      emoji: '🎀',
      accent: 'red',
      explainer: 'Look in a mirror with arms down, then raised. Then feel with flat fingers in small circles, light, medium and firm pressure, covering up to the collarbone and into the armpit. Lying down helps.',
      fields: [
        { id: 'checked', type: 'toggle', label: 'Did a self-check today' },
        { id: 'findings', type: 'chips', label: 'Anything new?', options: ['All normal for me', 'New lump / thickening', 'Skin dimpling / puckering', 'Redness / rash', 'Orange-peel skin', 'Nipple turned in (new)', 'Nipple discharge', 'Blood from nipple', 'Swelling', 'Lump in armpit', 'Lump near collarbone', 'Constant pain in one spot', 'Change near implant / scar'] },
        { id: 'side', type: 'choice', label: 'Side', options: ['Left', 'Right', 'Both'], showIf: ({ data }) => list(data.findings).some((f) => f !== 'All normal for me') },
        { id: 'where', type: 'text', label: 'Where exactly', placeholder: 'e.g. left, 2 o\'clock, 3 cm from nipple', showIf: ({ data }) => list(data.findings).some((f) => f !== 'All normal for me') },
        { id: 'cyclic', type: 'toggle', label: 'Changes with my cycle (tender before period)' },
      ],
    },
    {
      key: 'implants',
      label: 'Implants',
      emoji: '✨',
      accent: 'purple',
      defaultOn: (g) => g.includes('implants') || g.includes('mastectomy'),
      fields: [{ id: 'implantSigns', type: 'chips', label: 'Implant changes', options: ['Hardening', 'Shape change', 'Late swelling', 'Fluid build-up', 'Pain', 'Rippling'] }],
    },
    {
      key: 'screening',
      label: 'Screening & appointments',
      emoji: '🩺',
      accent: 'blue',
      collapsed: true,
      fields: [
        { id: 'appt', type: 'chips', label: 'Today', options: ['Mammogram', 'Ultrasound', 'MRI', 'Clinical exam', 'Biopsy', 'Genetic counselling', 'Results received'] },
        { id: 'apptNotes', type: 'text', label: 'Notes / results', multiline: true },
      ],
    },
  ],
  insightFields: ['findings'],
  dayLabel: (d) => (list(d.findings).some((f) => f !== 'All normal for me') ? '🎀!' : d.checked ? '🎀' : null),
  hero: (ctx) => {
    const all = [...ctx.history.filter((e) => e.log_date !== ctx.date), { log_date: ctx.date, data: ctx.day }]
    const checks = all.filter((e) => e.data.checked === true && e.log_date <= ctx.today).map((e) => e.log_date).sort()
    const last = checks[checks.length - 1]
    const since = last ? diffDays(last, ctx.today) : null
    const word = ctx.prefs.setup.chestWord === 'Chest' ? 'chest' : 'breast'
    const pills: string[] = []
    if (isIsoDate(ctx.prefs.setup.lastScreen)) {
      const months = num(ctx.prefs.setup.screenEveryMonths)
      if (months) {
        const dueIn = Math.round(months * 30.4) - diffDays(ctx.prefs.setup.lastScreen, ctx.today)
        pills.push(dueIn <= 0 ? '🩺 Screening due' : `🩺 Screening in ${Math.ceil(dueIn / 30.4)} mo`)
      }
    }
    return {
      center: since == null ? '—' : String(since),
      caption: 'days since check',
      title: since == null ? `Log your first ${word} check` : since > 35 ? 'Time for a check' : 'You\'re on track',
      subtitle: 'Once a month is plenty. You know your body best.',
      progress: since == null ? 0 : Math.max(0, 1 - since / 31),
      pills,
    }
  },
  flags: (ctx) => {
    const f = list(ctx.day.findings).filter((x) => x !== 'All normal for me' && x !== 'Constant pain in one spot')
    const out: Flag[] = []
    if (f.length) {
      out.push({
        id: 'change',
        tone: 'warn',
        title: 'Get this checked',
        body: `You noted: ${f.join(', ')}. Book a clinician appointment soon. If it is still there after your next period, do not wait any longer.${ctx.prefs.goals.includes('breastfeeding') && has(ctx.day.findings, 'Redness / rash') ? ' Redness with fever while feeding can be mastitis; see someone today.' : ''}`,
      })
    }
    if (ctx.prefs.goals.includes('family')) {
      out.push({ id: 'family', tone: 'info', body: 'With a family history, ask about earlier or more frequent screening and genetic counselling.' })
    }
    return out
  },
}

// ---------------------------------------------------------------------------
// Gender-affirming care
// ---------------------------------------------------------------------------

function affirmingHero(ctx: TrackerCtx): HeroInfo {
  const surgery = ctx.prefs.setup.surgeryDate
  if (isIsoDate(surgery) && diffDays(surgery, ctx.today) >= 0 && diffDays(surgery, ctx.today) <= 365) {
    const d = diffDays(surgery, ctx.today)
    const name = str(ctx.prefs.setup.surgeryType) ?? 'surgery'
    return {
      center: String(d),
      caption: 'days post-op',
      title: `Healing from ${name}`,
      subtitle: d < 14 ? 'Rest is your job right now. 💜' : d < 42 ? 'Follow your surgeon\'s lifting and activity limits.' : 'Keep up aftercare and scar care.',
      progress: Math.min(1, d / 90),
    }
  }
  const week = recentEntries(ctx, 7)
  const euph = week.map((e) => num(e.data.euphoria)).filter((n): n is number => n != null)
  const avg = euph.length ? Math.round((euph.reduce((s, n) => s + n, 0) / euph.length) * 10) / 10 : null
  const bindHours = num(ctx.day.bindHours)
  return {
    center: avg == null ? '✨' : String(avg),
    caption: avg == null ? 'you' : 'euphoria avg',
    title: str(ctx.prefs.setup.name) ? `Hi, ${str(ctx.prefs.setup.name)}` : 'Your affirming care',
    subtitle: 'Track what helps you feel like you. Only you decide what goes here.',
    pills: bindHours ? [`🎽 ${bindHours} h binding`] : [],
    progress: avg == null ? null : avg / 5,
  }
}

export const affirmingTracker: TrackerDef = {
  id: 'affirming',
  label: 'Gender-affirming care',
  emoji: '🏳️‍⚧️',
  accent: 'blue',
  category: 'cycle',
  description: 'Binding and tucking time, voice practice, hair removal, surgery recovery, euphoria and milestones',
  intro: 'For trans, non-binary, gender-questioning and gender-nonconforming people. Pair it with the HRT tracker if you take hormones.',
  disclaimer: 'Not medical advice. Your surgeon and care team\'s instructions come first.',
  goals: [
    { value: 'binding', label: 'Binding', emoji: '🎽' },
    { value: 'tucking', label: 'Tucking', emoji: '🩲' },
    { value: 'packing', label: 'Packing / STP', emoji: '🍆' },
    { value: 'voice', label: 'Voice training', emoji: '🎙️' },
    { value: 'hair', label: 'Hair removal', emoji: '✨' },
    { value: 'surgery', label: 'Surgery recovery', emoji: '🩹' },
    { value: 'social', label: 'Social / legal transition', emoji: '🪪' },
    { value: 'dysphoria', label: 'Dysphoria & euphoria', emoji: '💜' },
    { value: 'questioning', label: 'Questioning / exploring', emoji: '🌈' },
    { value: 'detrans', label: 'Pausing or changing direction', emoji: '🧭', hint: 'Every path is valid' },
  ],
  setup: [
    { id: 'name', type: 'text', label: 'The name you want to see here', placeholder: 'Optional' },
    { id: 'surgeryType', type: 'text', label: 'Surgery (if any)', placeholder: 'e.g. top surgery, vaginoplasty, FFS' },
    { id: 'surgeryDate', type: 'date', label: 'Surgery date' },
    { id: 'bindLimit', type: 'stepper', label: 'Max binding hours you aim for', max: 12 },
  ],
  sections: [
    {
      key: 'feel',
      label: 'How you feel in yourself',
      emoji: '💜',
      accent: 'purple',
      defaultOn: (g) => g.length === 0 || g.some((x) => ['dysphoria', 'questioning', 'social', 'detrans'].includes(x)),
      fields: [
        { id: 'euphoria', type: 'scale', label: 'Gender euphoria', min: 1, max: 5, low: 'Little', high: 'Lots', emojis: ['😶', '🙂', '😊', '😄', '🤩'] },
        { id: 'dysphoria', type: 'scale', label: 'Dysphoria', min: 0, max: 5, low: 'None', high: 'Intense' },
        { id: 'dysphoriaKind', type: 'chips', label: 'Kind', options: ['Body', 'Social', 'Voice', 'Face', 'Chest', 'Genitals', 'Height / shape', 'Being misgendered'] },
        { id: 'euphoriaFrom', type: 'chips', label: 'What gave you joy', allowCustom: true, options: ['Clothes', 'Haircut', 'Makeup', 'Right name / pronouns', 'Mirror moment', 'Photo', 'Community', 'Voice passed', 'Packing', 'Binding', 'Being seen'] },
        { id: 'misgendered', type: 'stepper', label: 'Times misgendered / deadnamed', max: 30 },
        { id: 'pronouns', type: 'text', label: 'Pronouns / name tried today', placeholder: 'e.g. they/them, "Sam"', showIf: ({ prefs }) => prefs.goals.includes('questioning') },
      ],
    },
    {
      key: 'binding',
      label: 'Binding',
      emoji: '🎽',
      accent: 'blue',
      defaultOn: (g) => g.includes('binding'),
      explainer: 'Most guidance is no more than 8 hours a day, never sleeping or exercising hard in a binder, and taking days off. Trans tape: under 5 days per application and never on broken skin.',
      fields: [
        { id: 'bindHours', type: 'number', label: 'Hours bound', unit: 'h', decimal: true },
        { id: 'binderType', type: 'choice', label: 'With', options: ['Full binder', 'Half binder', 'Trans tape / KT', 'Sports bra', 'Layers'] },
        { id: 'bindBreak', type: 'toggle', label: 'Took a break during the day' },
        { id: 'bindSymptoms', type: 'chips', label: 'Body check', options: ['Short of breath', 'Rib pain', 'Back pain', 'Skin irritation', 'Tape blisters', 'Overheating', 'Felt fine'] },
      ],
    },
    {
      key: 'tucking',
      label: 'Tucking',
      emoji: '🩲',
      accent: 'purple',
      defaultOn: (g) => g.includes('tucking'),
      fields: [
        { id: 'tuckHours', type: 'number', label: 'Hours tucked', unit: 'h', decimal: true },
        { id: 'tuckMethod', type: 'choice', label: 'Method', options: ['Gaff', 'Tape', 'Tight underwear', 'Other'] },
        { id: 'tuckSymptoms', type: 'chips', label: 'Body check', options: ['Testicular pain', 'Skin irritation', 'Needed to pee often', 'Felt fine'] },
      ],
    },
    {
      key: 'packing',
      label: 'Packing',
      emoji: '🍆',
      accent: 'amber',
      defaultOn: (g) => g.includes('packing'),
      fields: [
        { id: 'packed', type: 'toggle', label: 'Packed today' },
        { id: 'packer', type: 'choice', label: 'Packer', options: ['Soft packer', 'STP', 'Pack-and-play', 'Sock / DIY'] },
        { id: 'stpUsed', type: 'toggle', label: 'Used stand-to-pee' },
      ],
    },
    {
      key: 'voice',
      label: 'Voice practice',
      emoji: '🎙️',
      accent: 'green',
      defaultOn: (g) => g.includes('voice'),
      explainer: 'Short daily sessions (10–20 minutes) work better than long ones. Stop if your throat hurts or your voice gets hoarse.',
      fields: [
        { id: 'voiceMinutes', type: 'number', label: 'Minutes practiced', unit: 'min' },
        { id: 'voiceFocus', type: 'chips', label: 'Focus', allowCustom: true, options: ['Pitch', 'Resonance', 'Weight', 'Intonation', 'Breath', 'Phone calls', 'Reading aloud'] },
        { id: 'pitch', type: 'number', label: 'Average pitch', unit: 'Hz' },
        { id: 'strain', type: 'scale', label: 'Strain / hoarseness', min: 0, max: 5, low: 'None', high: 'Sore' },
      ],
    },
    {
      key: 'hair',
      label: 'Hair removal',
      emoji: '✨',
      accent: 'amber',
      defaultOn: (g) => g.includes('hair'),
      fields: [
        { id: 'hairMethod', type: 'chips', label: 'Session', options: ['Laser', 'Electrolysis', 'IPL at home', 'Shaving', 'Waxing', 'Epilating', 'Cream'] },
        { id: 'hairArea', type: 'chips', label: 'Area', allowCustom: true, options: ['Face', 'Neck', 'Chest', 'Back', 'Arms', 'Legs', 'Genital (pre-surgery)'] },
        { id: 'hairSessionNo', type: 'stepper', label: 'Session number', max: 60 },
        { id: 'hairPain', type: 'scale', label: 'Pain', min: 0, max: 10, low: 'None', high: 'Severe' },
      ],
    },
    {
      key: 'recovery',
      label: 'Surgery recovery',
      emoji: '🩹',
      accent: 'red',
      defaultOn: (g, setup) => g.includes('surgery') || isIsoDate(setup.surgeryDate),
      fields: [
        { id: 'opPain', type: 'scale', label: 'Pain', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'drain', type: 'number', label: 'Drain output', unit: 'ml' },
        { id: 'opCare', type: 'chips', label: 'Aftercare done', allowCustom: true, options: ['Wound clean', 'Dressing change', 'Compression vest', 'Dilation', 'Sitz bath', 'Scar massage', 'Silicone sheets', 'Walk', 'Pain meds'] },
        { id: 'opSigns', type: 'chips', label: 'Warning signs', options: ['Fever over 38 °C', 'Spreading redness', 'Pus / bad smell', 'Bleeding that soaks through', 'One side suddenly swollen', 'Dark / cold nipple or graft', 'Calf pain / swelling', 'Short of breath / chest pain', "Can't pee"] },
      ],
    },
    {
      key: 'milestones',
      label: 'Milestones',
      emoji: '🪪',
      accent: 'green',
      defaultOn: (g) => g.includes('social') || g.includes('questioning'),
      fields: [
        { id: 'milestone', type: 'chips', label: 'Today', allowCustom: true, options: ['Came out to someone', 'Name change', 'Passport / ID updated', 'New pronouns at work / school', 'Bought affirming clothes', 'First appointment', 'Referral accepted', 'Support group'] },
        { id: 'milestoneNote', type: 'text', label: 'Remember this', multiline: true },
      ],
    },
    {
      key: 'support',
      label: 'Support',
      emoji: '🫂',
      accent: 'purple',
      collapsed: true,
      fields: [
        { id: 'safety', type: 'choice', label: 'Feeling safe today', options: ['Yes', 'Mostly', 'Not really'] },
        { id: 'harmThoughts', type: 'toggle', label: 'Thoughts of hurting myself' },
      ],
    },
  ],
  insightFields: ['euphoria', 'dysphoria', 'bindHours', 'voiceMinutes', 'euphoriaFrom', 'dysphoriaKind', 'opPain'],
  dayLabel: (d) => {
    if (num(d.bindHours)) return `🎽${num(d.bindHours)}h`
    if (num(d.euphoria)) return `✨${num(d.euphoria)}`
    if (num(d.voiceMinutes)) return `🎙️${num(d.voiceMinutes)}`
    return '🏳️‍⚧️'
  },
  hero: affirmingHero,
  flags: (ctx) => {
    const out: Flag[] = []
    const signs = list(ctx.day.opSigns)
    if (signs.length) {
      const urgent = signs.some((s) => ['Short of breath / chest pain', 'Dark / cold nipple or graft', 'One side suddenly swollen', 'Bleeding that soaks through', "Can't pee", 'Calf pain / swelling'].includes(s))
      out.push({
        id: 'postop',
        tone: urgent ? 'urgent' : 'warn',
        title: urgent ? 'Contact your surgeon now' : 'Tell your surgical team',
        body: urgent ? `${signs.join(', ')}. Call your surgeon's emergency line or go to the emergency department. Chest pain or breathlessness: call emergency services.` : `${signs.join(', ')} can be a sign of infection. Call your surgeon's team today.`,
      })
    }
    const bind = num(ctx.day.bindHours)
    const limit = num(ctx.prefs.setup.bindLimit) ?? 8
    if (bind != null && bind > limit) out.push({ id: 'bind', tone: 'info', body: `${bind} h is past your ${limit} h goal. A break or binder-free day helps your ribs and skin.` })
    if (has(ctx.day.bindSymptoms, 'Short of breath') || has(ctx.day.bindSymptoms, 'Rib pain')) {
      out.push({ id: 'bindhurt', tone: 'warn', body: 'Take the binder off. Breathlessness or rib pain that lasts after unbinding should be checked.' })
    }
    if (has(ctx.day.tuckSymptoms, 'Testicular pain')) out.push({ id: 'tuck', tone: 'warn', body: 'Untuck. Sudden or severe testicular pain needs urgent care.' })
    if (num(ctx.day.strain) != null && (num(ctx.day.strain) as number) >= 4) out.push({ id: 'voice', tone: 'info', body: 'Rest your voice today. Hoarseness lasting over 3 weeks is worth an ENT or speech therapist check.' })
    if (ctx.day.harmThoughts === true || ctx.day.safety === 'Not really') {
      out.push({ id: 'crisis', tone: 'urgent', title: 'You deserve support', body: CRISIS_LINE })
    }
    const heavy = recentEntries(ctx, 14).filter((e) => (num(e.data.dysphoria) ?? 0) >= 4).length
    if (heavy >= 7) out.push({ id: 'dysph', tone: 'info', body: 'Dysphoria has been heavy lately. A gender-affirming therapist or peer group can help carry it.' })
    return out
  },
}
