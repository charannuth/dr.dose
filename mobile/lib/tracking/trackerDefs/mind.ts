import {
  has,
  hoursBetweenClock,
  list,
  num,
  recentEntries,
  str,
  type Flag,
  type TrackerDef,
} from '../genericTracker'

export const CRISIS_LINE =
  "If you might act on these thoughts, please contact emergency services or a crisis line now. In the US call or text 988 (Trans Lifeline 877-565-8860, Trevor Project 1-866-488-7386 for LGBTQ+ young people). In the UK call Samaritans on 116 123. You don't have to go through this alone."

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

export const moodTracker: TrackerDef = {
  id: 'mood',
  label: 'Mood & mental health',
  emoji: '🌈',
  accent: 'blue',
  category: 'mind',
  description: 'Mood, anxiety, energy, triggers, coping tools, therapy and med check-ins, quick screeners',
  intro: 'A quick daily check-in on how you feel. Every feeling is valid, and logging even one word helps.',
  disclaimer: 'Not a diagnosis. If you are struggling, reaching out to a professional is a sign of strength.',
  goals: [
    { value: 'general', label: 'Understand my moods', emoji: '💭' },
    { value: 'anxiety', label: 'Anxiety or panic', emoji: '🌀' },
    { value: 'depression', label: 'Low mood / depression', emoji: '🌧️' },
    { value: 'bipolar', label: 'Bipolar / mood swings', emoji: '🎢', hint: 'Adds elevated mood and sleep-need tracking' },
    { value: 'pmdd', label: 'PMDD / cycle-linked moods', emoji: '🌙' },
    { value: 'adhd', label: 'ADHD / focus', emoji: '⚡' },
    { value: 'trauma', label: 'PTSD / trauma', emoji: '🫂', hint: 'Adds flashbacks, nightmares and grounding' },
    { value: 'postpartum', label: 'Postpartum / perinatal', emoji: '🤱' },
    { value: 'grief', label: 'Grief or a hard season', emoji: '🕊️' },
    { value: 'meds', label: 'Starting or changing meds', emoji: '💊' },
  ],
  setup: [
    { id: 'screeners', type: 'toggle', label: 'Weekly quick screener', hint: 'Two-question check for low mood and anxiety (PHQ-2 / GAD-2 style).' },
    { id: 'careTeam', type: 'text', label: 'Who you can reach out to', placeholder: 'Therapist, friend, helpline…' },
  ],
  sections: [
    {
      key: 'feel',
      label: 'How you feel',
      emoji: '🌈',
      accent: 'blue',
      explainer: 'Rate your overall mood and pick any words that fit. You can add your own.',
      fields: [
        { id: 'mood', type: 'scale', label: 'Mood', min: 1, max: 5, low: 'Really low', high: 'Really good', emojis: MOOD_EMOJIS },
        {
          id: 'feelings',
          type: 'chips',
          label: 'Feelings',
          allowCustom: true,
          options: [
            { value: 'Happy', emoji: '😊' },
            { value: 'Calm', emoji: '😌' },
            { value: 'Grateful', emoji: '🙏' },
            { value: 'Hopeful', emoji: '🌱' },
            { value: 'Loved', emoji: '🥰' },
            { value: 'Proud', emoji: '🌟' },
            { value: 'Anxious', emoji: '😰' },
            { value: 'Sad', emoji: '😢' },
            { value: 'Lonely', emoji: '🫥' },
            { value: 'Irritable', emoji: '😤' },
            { value: 'Angry', emoji: '😠' },
            { value: 'Overwhelmed', emoji: '😵‍💫' },
            { value: 'Numb', emoji: '😶' },
            { value: 'Guilty', emoji: '😔' },
            { value: 'Ashamed', emoji: '🙈' },
            { value: 'Restless', emoji: '🦵' },
            { value: 'Hopeless', emoji: '🌧️' },
          ],
        },
        { id: 'anxiety', type: 'scale', label: 'Anxiety', min: 0, max: 10, low: 'None', high: 'Severe' },
        { id: 'energy', type: 'scale', label: 'Energy', min: 1, max: 5, low: 'Drained', high: 'Buzzing', emojis: ['🪫', '😮‍💨', '🙂', '😊', '⚡'] },
        { id: 'focus', type: 'scale', label: 'Focus', min: 1, max: 5, low: 'Scattered', high: 'Locked in', showIf: ({ prefs }) => prefs.goals.includes('adhd') },
      ],
    },
    {
      key: 'elevated',
      label: 'Elevated mood signs',
      emoji: '🎢',
      accent: 'amber',
      explainer: 'Early signs of hypomania or mania are easier to catch when you log them alongside sleep.',
      defaultOn: (g) => g.includes('bipolar'),
      fields: [
        { id: 'elevated', type: 'scale', label: 'Elevated / high', min: 0, max: 5, low: 'Not at all', high: 'Very' },
        {
          id: 'elevatedSigns',
          type: 'chips',
          label: 'Signs',
          options: ['Racing thoughts', 'Little need for sleep', 'Talking fast', 'Impulsive spending', 'Risky choices', 'Very irritable', 'Big plans'],
        },
      ],
    },
    {
      key: 'panic',
      label: 'Panic & trauma',
      emoji: '🌀',
      accent: 'purple',
      defaultOn: (g) => g.includes('anxiety') || g.includes('trauma'),
      fields: [
        { id: 'panicAttacks', type: 'stepper', label: 'Panic attacks', max: 20 },
        { id: 'traumaSigns', type: 'chips', label: 'Experiences', options: ['Flashback', 'Nightmare', 'Dissociation', 'Hypervigilance', 'Avoidance', 'Startled easily'], allowCustom: true },
      ],
    },
    {
      key: 'context',
      label: 'What affected today',
      emoji: '🧩',
      accent: 'green',
      fields: [
        {
          id: 'triggers',
          type: 'chips',
          label: 'Triggers',
          allowCustom: true,
          options: ['Work / school', 'Money', 'Relationships', 'Family', 'Health', 'Poor sleep', 'Social media', 'News', 'Hormones / cycle', 'Loneliness', 'Discrimination', 'Body image', 'Anniversary / memory'],
        },
        {
          id: 'helped',
          type: 'chips',
          label: 'What helped',
          allowCustom: true,
          options: ['Talked to someone', 'Walk / movement', 'Music', 'Breathing', 'Grounding (5-4-3-2-1)', 'Journaling', 'Nature', 'Rest', 'Therapy', 'Meds', 'Faith / spirituality', 'Pets', 'Creative time', 'Saying no'],
        },
        { id: 'socialized', type: 'toggle', label: 'Connected with someone' },
        { id: 'outside', type: 'toggle', label: 'Got outside' },
      ],
    },
    {
      key: 'care',
      label: 'Care & meds',
      emoji: '💊',
      accent: 'purple',
      defaultOn: (g) => g.includes('meds') || g.includes('depression') || g.includes('bipolar'),
      fields: [
        { id: 'therapy', type: 'toggle', label: 'Therapy / support session' },
        { id: 'medsTaken', type: 'choice', label: 'Mood meds', options: ['Taken', 'Missed', 'Not on any'] },
        { id: 'sideEffects', type: 'chips', label: 'Side effects', allowCustom: true, options: ['Nausea', 'Headache', 'Drowsy', 'Insomnia', 'Low libido', 'Emotional blunting', 'Appetite change', 'Jittery', 'Dizziness'] },
      ],
    },
    {
      key: 'screen',
      label: 'Weekly check-in',
      emoji: '🧭',
      accent: 'blue',
      explainer: 'Over the last 2 weeks, how often have you been bothered by these? 0 = not at all, 3 = nearly every day.',
      defaultOn: (_g, setup) => setup.screeners === true,
      fields: [
        { id: 'phqInterest', type: 'scale', label: 'Little interest or pleasure in doing things', min: 0, max: 3, low: 'Not at all', high: 'Nearly every day' },
        { id: 'phqDown', type: 'scale', label: 'Feeling down, depressed or hopeless', min: 0, max: 3, low: 'Not at all', high: 'Nearly every day' },
        { id: 'gadNervous', type: 'scale', label: 'Feeling nervous, anxious or on edge', min: 0, max: 3, low: 'Not at all', high: 'Nearly every day' },
        { id: 'gadWorry', type: 'scale', label: "Can't stop or control worrying", min: 0, max: 3, low: 'Not at all', high: 'Nearly every day' },
      ],
    },
    {
      key: 'safety',
      label: 'Safety check',
      emoji: '🤍',
      accent: 'red',
      explainer: 'Only you see this. Being honest here can point you to support when you need it.',
      collapsed: true,
      fields: [
        { id: 'selfHarmThoughts', type: 'toggle', label: 'Thoughts of hurting myself or not wanting to be here' },
        { id: 'selfHarmUrges', type: 'toggle', label: 'Urges to self-harm' },
      ],
    },
    {
      key: 'journal',
      label: 'Journal',
      emoji: '📝',
      accent: 'blue',
      fields: [
        { id: 'win', type: 'text', label: 'One good thing', placeholder: 'Even something tiny counts' },
        { id: 'notes', type: 'text', multiline: true, label: 'Notes', placeholder: 'What is on your mind?' },
      ],
    },
  ],
  insightFields: ['mood', 'anxiety', 'energy', 'feelings', 'triggers', 'helped'],
  hero: (ctx) => {
    const week = recentEntries(ctx, 7)
    const moods = week.map((e) => num(e.data.mood)).filter((n): n is number => n != null)
    const avg = moods.length ? Math.round((moods.reduce((s, n) => s + n, 0) / moods.length) * 10) / 10 : null
    const today = num(ctx.day.mood)
    return {
      center: today != null ? MOOD_EMOJIS[Math.round(today) - 1] ?? String(today) : '—',
      caption: 'today',
      title: avg != null ? `Average mood ${avg}/5 this week` : 'How are you, really?',
      subtitle: avg != null ? `${moods.length} check-in${moods.length === 1 ? '' : 's'} in the last 7 days.` : 'Tap a face below to check in.',
      progress: avg != null ? avg / 5 : null,
      pills: list(ctx.day.helped).slice(0, 2).map((h) => `✨ ${h}`),
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    const d = ctx.day
    if (d.selfHarmThoughts === true || d.selfHarmUrges === true || has(d.feelings, 'Hopeless')) {
      out.push({ id: 'crisis', tone: 'urgent', title: 'You matter', body: `${CRISIS_LINE}${str(ctx.prefs.setup.careTeam) ? ` You listed: ${str(ctx.prefs.setup.careTeam)}.` : ''}` })
    }
    const phq = (num(d.phqInterest) ?? 0) + (num(d.phqDown) ?? 0)
    const gad = (num(d.gadNervous) ?? 0) + (num(d.gadWorry) ?? 0)
    if (phq >= 3) out.push({ id: 'phq', tone: 'warn', body: 'Your low-mood check-in scored 3 or more, which is a common point to talk with a doctor or therapist about depression.' })
    if (gad >= 3) out.push({ id: 'gad', tone: 'warn', body: 'Your anxiety check-in scored 3 or more. A doctor or therapist can help; anxiety is very treatable.' })
    const twoWeeks = recentEntries(ctx, 14)
    const low = twoWeeks.filter((e) => (num(e.data.mood) ?? 5) <= 2).length
    if (low >= 7) out.push({ id: 'low-run', tone: 'warn', body: 'You have logged low mood on most days for two weeks. Please consider reaching out to someone you trust or a professional.' })
    if ((num(d.elevated) ?? 0) >= 4 && has(d.elevatedSigns, 'Little need for sleep')) {
      out.push({ id: 'elevated', tone: 'warn', body: 'High mood with little need for sleep can be an early sign of hypomania. If this is part of your plan, follow it or contact your care team.' })
    }
    return out
  },
  dayLabel: (d) => {
    const m = num(d.mood)
    return m != null ? `Mood ${MOOD_EMOJIS[Math.round(m) - 1] ?? m}` : 'Mood check-in'
  },
}

export const sleepTracker: TrackerDef = {
  id: 'sleep',
  label: 'Sleep',
  emoji: '😴',
  accent: 'purple',
  category: 'mind',
  description: 'Bed and wake times, quality, naps, night waking, shift work, CPAP and sleep aids',
  intro: 'Log last night when you wake up. Patterns with your cycle, mood and meds show up over time.',
  goals: [
    { value: 'general', label: 'Sleep better', emoji: '🌙' },
    { value: 'insomnia', label: 'Insomnia', emoji: '👀' },
    { value: 'shift', label: 'Shift work / nights', emoji: '🏥', hint: 'Log sleep at any time of day' },
    { value: 'apnea', label: 'Sleep apnea / snoring', emoji: '😮‍💨', hint: 'Adds CPAP and snoring fields' },
    { value: 'menopause', label: 'Night sweats / menopause', emoji: '🌡️' },
    { value: 'parent', label: 'New parent', emoji: '🍼', hint: 'Counts broken sleep' },
    { value: 'chronic', label: 'Chronic illness / fatigue', emoji: '🔋' },
    { value: 'teen', label: 'Teen / school schedule', emoji: '🎒' },
  ],
  setup: [
    { id: 'targetHours', type: 'number', label: 'Sleep goal (hours)', placeholder: '8', decimal: true },
  ],
  sections: [
    {
      key: 'night',
      label: 'Last sleep',
      emoji: '🌙',
      accent: 'purple',
      explainer: 'Use 24-hour time like 23:30 or 7:15. It works across midnight and for daytime sleep after night shifts.',
      fields: [
        { id: 'bedtime', type: 'time', label: 'Fell asleep', placeholder: '23:30' },
        { id: 'wake', type: 'time', label: 'Woke up', placeholder: '07:00' },
        { id: 'quality', type: 'scale', label: 'Quality', min: 1, max: 5, low: 'Awful', high: 'Amazing', emojis: ['😫', '😪', '😐', '🙂', '😴'] },
        { id: 'wakings', type: 'stepper', label: 'Times woken up', max: 30 },
        { id: 'restedness', type: 'scale', label: 'How rested', min: 1, max: 5, low: 'Exhausted', high: 'Refreshed' },
      ],
    },
    {
      key: 'disturb',
      label: 'What got in the way',
      emoji: '🌀',
      accent: 'blue',
      fields: [
        {
          id: 'disturbances',
          type: 'chips',
          label: 'Disturbances',
          allowCustom: true,
          options: ['Racing mind', 'Pain', 'Night sweats', 'Hot flashes', 'Needed the bathroom', 'Baby / kids', 'Partner / pets', 'Noise', 'Nightmares', 'Restless legs', 'Heartburn', 'Screens', 'Caffeine late', 'Alcohol', 'Period cramps'],
        },
        { id: 'nap', type: 'number', label: 'Naps (minutes)', unit: 'min', placeholder: '0' },
      ],
    },
    {
      key: 'apnea',
      label: 'Breathing & CPAP',
      emoji: '😮‍💨',
      accent: 'amber',
      defaultOn: (g) => g.includes('apnea'),
      fields: [
        { id: 'cpapHours', type: 'number', label: 'CPAP use', unit: 'hours', decimal: true },
        { id: 'apneaSigns', type: 'chips', label: 'Signs', options: ['Loud snoring', 'Gasping / choking', 'Morning headache', 'Dry mouth', 'Daytime sleepiness'] },
      ],
    },
    {
      key: 'aids',
      label: 'Wind-down & aids',
      emoji: '🛁',
      accent: 'green',
      defaultOn: (g) => g.includes('insomnia') || g.includes('general'),
      fields: [
        { id: 'aids', type: 'chips', label: 'Used', allowCustom: true, options: ['Melatonin', 'Prescription sleep aid', 'Antihistamine', 'Earplugs', 'Eye mask', 'White noise', 'Meditation', 'Reading', 'No screens', 'Weighted blanket'] },
        { id: 'caffeineAfter2', type: 'toggle', label: 'Caffeine after 2pm' },
      ],
    },
    { key: 'notes', label: 'Notes', emoji: '📝', accent: 'blue', fields: [{ id: 'dreams', type: 'text', multiline: true, label: 'Dreams or notes' }] },
  ],
  insightFields: ['quality', 'restedness', 'wakings', 'disturbances'],
  hero: (ctx) => {
    const week = recentEntries(ctx, 7)
    const hours = week.map((e) => hoursBetweenClock(e.data.bedtime, e.data.wake)).filter((n): n is number => n != null)
    const avg = hours.length ? Math.round((hours.reduce((s, n) => s + n, 0) / hours.length) * 10) / 10 : null
    const last = hoursBetweenClock(ctx.day.bedtime, ctx.day.wake)
    const target = num(ctx.prefs.setup.targetHours) ?? 8
    return {
      center: last != null ? `${last}` : avg != null ? `${avg}` : '—',
      caption: last != null ? 'hours' : 'avg hours',
      title: avg != null ? `Averaging ${avg} h a night this week` : 'How did you sleep?',
      subtitle: `Your goal is ${target} hours.`,
      progress: last != null ? Math.min(1, last / target) : avg != null ? Math.min(1, avg / target) : null,
    }
  },
  flags: (ctx) => {
    const out: Flag[] = []
    if (has(ctx.day.apneaSigns, 'Gasping / choking') || (has(ctx.day.apneaSigns, 'Loud snoring') && has(ctx.day.apneaSigns, 'Daytime sleepiness'))) {
      out.push({ id: 'apnea', tone: 'warn', body: 'Snoring with gasping or daytime sleepiness can be signs of sleep apnea, which is common and treatable. Mention it to a clinician.' })
    }
    const short = recentEntries(ctx, 14).filter((e) => {
      const h = hoursBetweenClock(e.data.bedtime, e.data.wake)
      return h != null && h < 5
    }).length
    if (short >= 5) out.push({ id: 'short', tone: 'warn', body: 'You have slept under 5 hours on several nights in the last two weeks. Ongoing short sleep affects mood, hormones and immunity; a clinician can help.' })
    return out
  },
  dayLabel: (d) => {
    const h = hoursBetweenClock(d.bedtime, d.wake)
    return h != null ? `Slept ${h} h` : 'Sleep logged'
  },
}
