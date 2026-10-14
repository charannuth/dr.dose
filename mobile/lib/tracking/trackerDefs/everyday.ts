import {
  has,
  list,
  num,
  recentEntries,
  shiftDate,
  str,
  type CustomFieldDef,
  type FieldDef,
  type Flag,
  type GenericPrefs,
  type SectionDef,
  type TrackerDef,
} from '../genericTracker'

// ---------------------------------------------------------------------------
// Nourish (non-diet hydration & nutrition)
// ---------------------------------------------------------------------------

const ED_LINE =
  'If food feels frightening or out of control, you deserve support. In the US, the ANAD helpline is 1-888-375-7767; in the UK, Beat is 0808 801 0677. In an emergency call your local emergency number.'

function edMode(prefs: GenericPrefs): boolean {
  return prefs.goals.includes('ed_recovery')
}

export const nourishTracker: TrackerDef = {
  id: 'nourish',
  label: 'Food & water',
  emoji: '🥗',
  accent: 'green',
  category: 'everyday',
  description: 'Meals, water, hunger and fullness, allergies and medication-friendly eating. No calories, no judgement',
  intro: 'Notice, don\'t judge. There are no good or bad foods here, and nothing counts calories unless you turn on the weight tracker.',
  disclaimer: 'Not dietary advice. A dietitian can tailor this to your health needs.',
  goals: [
    { value: 'regular', label: 'Eat regularly', emoji: '🍽️' },
    { value: 'hydrate', label: 'Drink more water', emoji: '💧' },
    { value: 'ed_recovery', label: 'Eating disorder recovery', emoji: '🌱', hint: 'No numbers, gentle wording, meal-plan check-ins' },
    { value: 'intuitive', label: 'Intuitive eating', emoji: '🧘' },
    { value: 'glp1', label: 'On GLP-1 (Ozempic, Mounjaro…)', emoji: '💉', hint: 'Protein, fluids, nausea' },
    { value: 'allergy', label: 'Allergies / intolerances', emoji: '🥜' },
    { value: 'diabetes', label: 'Diabetes / carb awareness', emoji: '🩸' },
    { value: 'kidney', label: 'Fluid limit (kidney / heart)', emoji: '🫘', hint: 'Track against a maximum' },
    { value: 'pregnancy', label: 'Pregnancy / feeding', emoji: '🤰' },
    { value: 'arfid', label: 'ARFID / sensory eating', emoji: '🧩' },
    { value: 'budget', label: 'Food insecurity', emoji: '🧺', hint: 'Track skipped meals without shame' },
  ],
  setup: [
    { id: 'waterTarget', type: 'stepper', label: 'Glasses of water per day (goal or limit)', max: 20 },
    { id: 'glassSize', type: 'choice', label: 'Glass size', options: ['250 ml', '330 ml', '500 ml', '8 oz', '12 oz', '16 oz'] },
    { id: 'mealPlan', type: 'text', label: 'Meal plan from your dietitian', placeholder: 'e.g. 3 meals + 3 snacks' },
    { id: 'allergens', type: 'text', label: 'Allergens / foods you avoid', placeholder: 'e.g. peanuts, gluten (coeliac)' },
  ],
  sections: [
    {
      key: 'meals',
      label: 'Meals & snacks',
      emoji: '🍽️',
      accent: 'green',
      fields: [
        { id: 'meals', type: 'chips', label: 'Eaten today', options: ['Breakfast', 'Morning snack', 'Lunch', 'Afternoon snack', 'Dinner', 'Evening snack', 'Night feed / snack'] },
        { id: 'skipped', type: 'chips', label: 'Missed', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] },
        { id: 'skipWhy', type: 'chips', label: 'Why missed', options: ['Not hungry', 'Too busy', 'Nausea', 'No food available', 'Anxiety', 'Forgot', 'Fasting (religious)', 'Restricting'], showIf: ({ data }) => list(data.skipped).length > 0 },
        { id: 'protein', type: 'chips', label: 'Protein in', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], showIf: ({ prefs }) => prefs.goals.includes('glp1') || prefs.goals.includes('pregnancy') },
        { id: 'veg', type: 'stepper', label: 'Fruit & veg portions', max: 15, showIf: ({ prefs }) => !edMode(prefs) },
        { id: 'carbs', type: 'number', label: 'Carbs', unit: 'g', showIf: ({ prefs }) => prefs.goals.includes('diabetes') },
        { id: 'safeFoods', type: 'chips', label: 'Foods eaten', allowCustom: true, options: [], showIf: ({ prefs }) => prefs.goals.includes('arfid') },
        { id: 'newFood', type: 'toggle', label: 'Tried a new food', showIf: ({ prefs }) => prefs.goals.includes('arfid') || prefs.goals.includes('intuitive') },
      ],
    },
    {
      key: 'water',
      label: 'Drinks',
      emoji: '💧',
      accent: 'blue',
      fields: [
        { id: 'water', type: 'stepper', label: 'Glasses of water', max: 30 },
        { id: 'drinks', type: 'chips', label: 'Other drinks', allowCustom: true, options: ['Tea', 'Coffee', 'Juice', 'Fizzy drink', 'Energy drink', 'Milk', 'Oral rehydration', 'Alcohol'] },
        { id: 'caffeine', type: 'stepper', label: 'Caffeinated drinks', max: 15 },
        { id: 'alcoholUnits', type: 'stepper', label: 'Alcohol units', max: 30, showIf: ({ data }) => has(data.drinks, 'Alcohol') },
        { id: 'urineColour', type: 'choice', label: 'Pee colour', options: ['Pale straw', 'Yellow', 'Dark yellow', 'Amber / brown'] },
      ],
    },
    {
      key: 'body',
      label: 'Hunger & fullness',
      emoji: '🫶',
      accent: 'amber',
      explainer: 'Rate before or after a meal. 1 is ravenous, 5 is comfortable, 10 is painfully full. Somewhere in the middle most of the time is a good sign.',
      defaultOn: (g) => g.some((x) => ['intuitive', 'ed_recovery', 'glp1', 'regular'].includes(x)),
      fields: [
        { id: 'hunger', type: 'scale', label: 'Hunger', min: 1, max: 10, low: 'Ravenous', high: 'Painfully full' },
        { id: 'foodFeelings', type: 'chips', label: 'Around food I felt', allowCustom: true, options: ['Calm', 'Satisfied', 'Guilty', 'Anxious', 'Out of control', 'Proud', 'Distracted', 'Comforted', 'Rushed'] },
        { id: 'glpSymptoms', type: 'chips', label: 'Side effects', options: ['Nausea', 'Vomiting', 'Reflux', 'Constipation', 'Diarrhoea', 'Fullness fast', 'No appetite', 'Belly pain'], showIf: ({ prefs }) => prefs.goals.includes('glp1') },
      ],
    },
    {
      key: 'recovery',
      label: 'Recovery check-in',
      emoji: '🌱',
      accent: 'green',
      defaultOn: (g) => g.includes('ed_recovery'),
      collapsed: true,
      explainer: 'Private. Logging urges is not failing; it is information for you and your team.',
      fields: [
        { id: 'mealPlanMet', type: 'choice', label: 'Followed my meal plan', options: ['Fully', 'Mostly', 'Partly', 'Not today'] },
        { id: 'urges', type: 'chips', label: 'Urges', options: ['Restrict', 'Binge', 'Purge', 'Over-exercise', 'Body check', 'Weigh myself', 'Compare'] },
        { id: 'actedOn', type: 'chips', label: 'Acted on', options: ['Restrict', 'Binge', 'Purge', 'Over-exercise', 'Laxatives / diuretics'] },
        { id: 'copingUsed', type: 'chips', label: 'What helped', allowCustom: true, options: ['Called someone', 'Distraction', 'Grounding', 'Ate with others', 'Journaled', 'Skills app', 'Therapy'] },
        { id: 'win', type: 'text', label: 'A win today', placeholder: 'Big or small' },
      ],
    },
    {
      key: 'reactions',
      label: 'Food reactions',
      emoji: '🥜',
      accent: 'red',
      defaultOn: (g) => g.includes('allergy'),
      fields: [
        { id: 'reactionFood', type: 'chips', label: 'Suspected food', allowCustom: true, options: ['Dairy', 'Gluten', 'Eggs', 'Peanuts', 'Tree nuts', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'FODMAPs', 'Histamine'] },
        { id: 'reaction', type: 'chips', label: 'Reaction', options: ['Itchy mouth', 'Hives', 'Swelling lips / face', 'Throat tight', 'Wheeze', 'Vomiting', 'Bloating', 'Diarrhoea', 'Headache', 'Dizzy / faint'] },
        { id: 'epipen', type: 'toggle', label: 'Used adrenaline (EpiPen)' },
      ],
    },
    {
      key: 'notes',
      label: 'Notes',
      emoji: '📝',
      accent: 'green',
      fields: [{ id: 'notes', type: 'text', label: 'Anything else', multiline: true }],
    },
  ],
  insightFields: ['water', 'hunger', 'meals', 'skipped', 'foodFeelings', 'glpSymptoms', 'urges'],
  dayLabel: (d, prefs) => {
    const meals = list(d.meals).length
    if (meals && edMode(prefs)) return '🌱'
    if (num(d.water)) return `💧${num(d.water)}`
    return meals ? `🍽️${meals}` : '🥗'
  },
  hero: (ctx) => {
    const target = num(ctx.prefs.setup.waterTarget) ?? 8
    const water = num(ctx.day.water) ?? 0
    const meals = list(ctx.day.meals).length
    const limit = ctx.prefs.goals.includes('kidney')
    if (edMode(ctx.prefs)) {
      return {
        center: String(meals),
        caption: meals === 1 ? 'meal / snack' : 'meals & snacks',
        title: 'Nourishing yourself is enough',
        subtitle: str(ctx.prefs.setup.mealPlan) ? `Your plan: ${str(ctx.prefs.setup.mealPlan)}` : 'Every meal is a step. Be kind to yourself today.',
        progress: null,
      }
    }
    return {
      center: `${water}/${target}`,
      caption: limit ? 'glasses (limit)' : 'glasses of water',
      title: meals ? `${meals} meal${meals === 1 ? '' : 's'} & snacks today` : 'Log what you ate',
      subtitle: str(ctx.prefs.setup.glassSize) ? `One glass = ${str(ctx.prefs.setup.glassSize)}.` : 'Little and often works for hydration.',
      progress: Math.min(1, water / Math.max(1, target)),
      pills: str(ctx.prefs.setup.allergens) ? [`🚫 ${str(ctx.prefs.setup.allergens)}`] : [],
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const r = list(ctx.day.reaction)
    if (r.some((x) => ['Throat tight', 'Wheeze', 'Swelling lips / face', 'Dizzy / faint'].includes(x)) || ctx.day.epipen === true) {
      out.push({ id: 'anaphylaxis', tone: 'urgent', title: 'Possible anaphylaxis', body: 'Use adrenaline if you have it and call emergency services, even if you feel better. Symptoms can come back.' })
    }
    if (list(ctx.day.actedOn).includes('Purge') || list(ctx.day.actedOn).includes('Laxatives / diuretics')) {
      out.push({ id: 'purge', tone: 'warn', body: `Purging can upset your heart\'s salts. Dizziness, palpitations or fainting need urgent care. ${ED_LINE}` })
    } else if (edMode(ctx.prefs) && (list(ctx.day.urges).length >= 3 || ctx.day.mealPlanMet === 'Not today')) {
      out.push({ id: 'ed', tone: 'info', body: ED_LINE })
    }
    const water = num(ctx.day.water)
    const target = num(ctx.prefs.setup.waterTarget)
    if (ctx.prefs.goals.includes('kidney') && water != null && target && water > target) {
      out.push({ id: 'limit', tone: 'warn', body: `You are over your fluid limit of ${target} glasses. Watch for swelling or breathlessness and follow your team's advice.` })
    }
    if (ctx.day.urineColour === 'Amber / brown') out.push({ id: 'urine', tone: 'warn', body: 'Very dark pee can mean dehydration. If it stays dark after drinking, or looks like cola, see a clinician.' })
    if (has(ctx.day.glpSymptoms, 'Vomiting') && has(ctx.day.glpSymptoms, 'Belly pain')) {
      out.push({ id: 'glp', tone: 'warn', body: 'Severe belly pain with vomiting on a GLP-1 can be pancreatitis or gallbladder trouble. Get medical advice today.' })
    }
    const missed = recentEntries(ctx, 7).filter((e) => list(e.data.skipWhy).includes('No food available')).length
    if (missed >= 2) out.push({ id: 'food', tone: 'info', body: 'Not having enough food is not your fault. Local food banks, school meal schemes and benefits (e.g. SNAP / WIC in the US) can help.' })
    return out
  },
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export const movementTracker: TrackerDef = {
  id: 'movement',
  label: 'Movement',
  emoji: '🏃',
  accent: 'green',
  category: 'everyday',
  description: 'Any movement counts: walks, rehab, wheelchair, yoga, sport. Pacing for chronic illness built in',
  intro: 'Move in ways that feel good. Housework, stretching, wheeling and physio all count.',
  disclaimer: 'Check with your clinician before starting something new if you have a heart, lung or pregnancy condition.',
  goals: [
    { value: 'general', label: 'Move more', emoji: '🚶' },
    { value: 'strength', label: 'Strength', emoji: '🏋️' },
    { value: 'rehab', label: 'Physio / rehab', emoji: '🩹' },
    { value: 'wheelchair', label: 'Wheelchair user', emoji: '🦽' },
    { value: 'pacing', label: 'Pacing (ME/CFS, long COVID, POTS)', emoji: '🔋', hint: 'Stay within your energy envelope' },
    { value: 'pregnancy', label: 'Pregnancy / postpartum', emoji: '🤰' },
    { value: 'cycle', label: 'Train with my cycle', emoji: '🔄' },
    { value: 'athlete', label: 'Sport / competition', emoji: '🏅' },
    { value: 'older', label: 'Balance & falls', emoji: '🧓' },
    { value: 'joy', label: 'Just for fun', emoji: '💃', hint: 'No targets' },
  ],
  setup: [
    { id: 'weeklyMinutes', type: 'number', label: 'Weekly minutes goal', unit: 'min', placeholder: '150' },
    { id: 'stepGoal', type: 'number', label: 'Daily steps goal (optional)', placeholder: 'e.g. 6000' },
    { id: 'hrCeiling', type: 'number', label: 'Heart-rate ceiling (pacing)', unit: 'bpm' },
  ],
  sections: [
    {
      key: 'activity',
      label: 'What you did',
      emoji: '🏃',
      accent: 'green',
      fields: [
        { id: 'activities', type: 'chips', label: 'Activities', allowCustom: true, options: ['Walk', 'Wheel / push', 'Run', 'Cycle', 'Swim', 'Yoga', 'Pilates', 'Strength', 'Dance', 'Sport', 'Hike', 'Stretching', 'Physio exercises', 'Chair exercise', 'Housework / garden', 'Climbing', 'Martial arts'] },
        { id: 'minutes', type: 'number', label: 'Minutes', unit: 'min' },
        { id: 'intensity', type: 'choice', label: 'Effort', options: [{ value: 'Gentle', emoji: '🌿' }, { value: 'Moderate', emoji: '🌤️' }, { value: 'Hard', emoji: '🔥' }] },
        { id: 'steps', type: 'number', label: 'Steps', showIf: ({ prefs }) => !prefs.goals.includes('wheelchair') },
        { id: 'pushes', type: 'number', label: 'Pushes / distance', unit: 'km', decimal: true, showIf: ({ prefs }) => prefs.goals.includes('wheelchair') },
        { id: 'enjoy', type: 'scale', label: 'Enjoyment', min: 1, max: 5, low: 'Meh', high: 'Loved it', emojis: ['😑', '🙂', '😊', '😄', '🤩'] },
      ],
    },
    {
      key: 'rehab',
      label: 'Physio / rehab',
      emoji: '🩹',
      accent: 'blue',
      defaultOn: (g) => g.includes('rehab') || g.includes('older'),
      fields: [
        { id: 'rehabDone', type: 'choice', label: 'Home programme', options: ['All of it', 'Some', 'None today'] },
        { id: 'rehabPain', type: 'scale', label: 'Pain during', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'balance', type: 'chips', label: 'Balance', options: ['Felt steady', 'Wobbly', 'Near fall', 'Fell'], showIf: ({ prefs }) => prefs.goals.includes('older') || prefs.goals.includes('rehab') },
      ],
    },
    {
      key: 'pacing',
      label: 'Energy & pacing',
      emoji: '🔋',
      accent: 'purple',
      defaultOn: (g) => g.includes('pacing'),
      explainer: 'Post-exertional malaise (PEM) is a crash that can show up 12–72 hours after doing too much. Logging it helps you find your safe envelope.',
      fields: [
        { id: 'energyBefore', type: 'scale', label: 'Energy', min: 0, max: 10, low: 'Empty', high: 'Full' },
        { id: 'pem', type: 'choice', label: 'Crash / PEM', options: ['None', 'Mild', 'Moderate', 'Severe (bedbound)'] },
        { id: 'upright', type: 'number', label: 'Hours upright', unit: 'h', decimal: true },
        { id: 'peakHr', type: 'number', label: 'Peak heart rate', unit: 'bpm' },
        { id: 'restDay', type: 'toggle', label: 'Planned rest day' },
      ],
    },
    {
      key: 'body',
      label: 'How your body felt',
      emoji: '💗',
      accent: 'red',
      fields: [
        { id: 'feel', type: 'chips', label: 'During or after', options: ['Great', 'Sore muscles', 'Joint pain', 'Breathless', 'Chest pain / pressure', 'Dizzy / faint', 'Palpitations', 'Leaking (pelvic)', 'Heaviness (pelvic)', 'Injury'] },
        { id: 'cyclePhase', type: 'choice', label: 'Cycle phase', options: ['Period', 'Follicular', 'Ovulation', 'Luteal', 'Not sure'], showIf: ({ prefs }) => prefs.goals.includes('cycle') },
        { id: 'injury', type: 'text', label: 'Injury details', showIf: ({ data }) => has(data.feel, 'Injury') },
      ],
    },
  ],
  insightFields: ['minutes', 'activities', 'enjoy', 'energyBefore', 'pem', 'feel'],
  dayLabel: (d) => {
    if (d.restDay === true) return '🛌'
    const m = num(d.minutes)
    return m ? `🏃${m}` : list(d.activities).length ? '🏃' : null
  },
  hero: (ctx) => {
    const goal = num(ctx.prefs.setup.weeklyMinutes) ?? 150
    const from = shiftDate(ctx.today, -6)
    const week = recentEntries(ctx, 7).filter((e) => e.log_date >= from)
    const mins = week.reduce((s, e) => s + (num(e.data.minutes) ?? 0), 0)
    const active = week.filter((e) => list(e.data.activities).length || num(e.data.minutes)).length
    const joy = ctx.prefs.goals.includes('joy')
    const pacing = ctx.prefs.goals.includes('pacing')
    return {
      center: String(mins),
      caption: 'min this week',
      title: joy ? `${active} active day${active === 1 ? '' : 's'} this week` : pacing ? 'Stay inside your envelope' : `${Math.max(0, goal - mins)} min to your ${goal} min goal`,
      subtitle: pacing ? 'Rest is part of the plan. Stop before you feel tired.' : 'Everything counts, including the small stuff.',
      progress: joy || pacing ? null : Math.min(1, mins / Math.max(1, goal)),
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const feel = list(ctx.day.feel)
    if (feel.includes('Chest pain / pressure') || (feel.includes('Dizzy / faint') && feel.includes('Palpitations'))) {
      out.push({ id: 'chest', tone: 'urgent', title: 'Stop and get help', body: 'Chest pain or pressure, or fainting with palpitations, during exercise needs emergency care. Call emergency services.' })
    }
    if (has(ctx.day.balance, 'Fell')) out.push({ id: 'fall', tone: 'warn', body: 'After a fall, check for injury and tell your clinician; a falls assessment can help prevent the next one.' })
    if (ctx.prefs.goals.includes('pacing')) {
      const crashes = recentEntries(ctx, 14).filter((e) => e.data.pem === 'Moderate' || e.data.pem === 'Severe (bedbound)').length
      if (crashes >= 3) out.push({ id: 'pem', tone: 'info', body: `${crashes} crashes in 2 weeks. Your envelope may be smaller than your plan; try cutting activity by a third.` })
      const hr = num(ctx.day.peakHr)
      const ceiling = num(ctx.prefs.setup.hrCeiling)
      if (hr && ceiling && hr > ceiling) out.push({ id: 'hr', tone: 'info', body: `Peak ${hr} bpm went above your ${ceiling} bpm ceiling.` })
    }
    if (feel.includes('Leaking (pelvic)') || feel.includes('Heaviness (pelvic)')) {
      out.push({ id: 'pelvic', tone: 'info', body: 'Leaking or heaviness with exercise is common and treatable. Try the Pelvic health tracker or see a pelvic physio.' })
    }
    return out
  },
}

// ---------------------------------------------------------------------------
// Custom tracker
// ---------------------------------------------------------------------------

export function customFieldToFieldDef(c: CustomFieldDef): FieldDef {
  switch (c.type) {
    case 'scale':
      return { id: c.id, type: 'scale', label: c.label, min: 0, max: 10, low: 'Low', high: 'High' }
    case 'number':
      return { id: c.id, type: 'number', label: c.label, unit: c.unit, decimal: true }
    case 'toggle':
      return { id: c.id, type: 'toggle', label: c.label }
    case 'stepper':
      return { id: c.id, type: 'stepper', label: c.label, unit: c.unit, max: 99 }
    case 'chips':
      return { id: c.id, type: 'chips', label: c.label, options: c.options ?? [], allowCustom: true }
    case 'choice':
      return { id: c.id, type: 'choice', label: c.label, options: c.options?.length ? c.options : ['Yes', 'No'] }
    default:
      return { id: c.id, type: 'text', label: c.label, multiline: true }
  }
}

export const customTracker: TrackerDef = {
  id: 'custom',
  label: 'Custom tracker',
  emoji: '🧩',
  accent: 'amber',
  category: 'custom',
  description: 'Build your own: name it, pick fields (scales, numbers, checkboxes, lists) and log anything',
  intro: 'Track anything: a rare condition, a supplement trial, tics, seizures, allergy shots, a habit. Add fields in ✨ Make it yours.',
  goals: [],
  setup: [
    { id: 'name', type: 'text', label: 'Tracker name', placeholder: 'e.g. Seizure log, Eczema, Tics' },
    { id: 'emoji', type: 'text', label: 'Emoji', placeholder: '🧩' },
  ],
  sections: [
    {
      key: 'notes',
      label: 'Notes',
      emoji: '📝',
      accent: 'amber',
      fields: [{ id: 'notes', type: 'text', label: 'Notes', multiline: true }],
    },
  ],
  dynamicSections: (prefs): SectionDef[] =>
    prefs.customFields.length
      ? [
          {
            key: 'custom_fields',
            label: str(prefs.setup.name) ?? 'Your fields',
            emoji: str(prefs.setup.emoji) ?? '🧩',
            accent: 'amber',
            fields: prefs.customFields.map(customFieldToFieldDef),
          },
        ]
      : [],
  dayLabel: (_d, prefs) => str(prefs.setup.emoji) ?? '🧩',
  hero: (ctx) => {
    const name = str(ctx.prefs.setup.name) ?? 'Custom tracker'
    const week = recentEntries(ctx, 7).filter((e) => Object.keys(e.data).length).length
    return {
      center: str(ctx.prefs.setup.emoji) ?? '🧩',
      caption: name,
      title: ctx.prefs.customFields.length ? `${week} of the last 7 days logged` : 'Add your first field',
      subtitle: ctx.prefs.customFields.length ? 'Your tracker, your rules.' : 'Tap ✨ Make it yours to name this tracker and add fields.',
      progress: ctx.prefs.customFields.length ? week / 7 : null,
    }
  },
}
