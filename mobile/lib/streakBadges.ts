export type StreakBadge = {
  id: string
  minDays: number
  /** Inclusive end of the streak-day range this badge represents on Today (null = open-ended). */
  maxDays: number | null
  label: string
  description: string
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'bloom-1',
    minDays: 1,
    maxDays: 2,
    label: 'First bloom',
    description: 'Completed your first perfect adherence day',
  },
  {
    id: 'bloom-3',
    minDays: 3,
    maxDays: 6,
    label: '3-day roots',
    description: 'Three perfect days in a row',
  },
  {
    id: 'bloom-7',
    minDays: 7,
    maxDays: 13,
    label: 'Week in bloom',
    description: 'Seven-day streak — shown for days 7–13',
  },
  {
    id: 'bloom-14',
    minDays: 14,
    maxDays: 29,
    label: 'Fortnight',
    description: 'Fourteen-day streak — shown for days 14–29',
  },
  {
    id: 'bloom-30',
    minDays: 30,
    maxDays: 59,
    label: 'Garden keeper',
    description: 'Thirty-day streak — shown for days 30–59',
  },
  {
    id: 'bloom-60',
    minDays: 60,
    maxDays: 99,
    label: 'Steady growth',
    description: 'Sixty-day streak — shown for days 60–99',
  },
  {
    id: 'bloom-100',
    minDays: 100,
    maxDays: null,
    label: 'Century bloom',
    description: 'One hundred perfect days — stays active from day 100 onward',
  },
]

export function getEarnedStreakBadges(longestStreak: number): StreakBadge[] {
  return STREAK_BADGES.filter((b) => longestStreak >= b.minDays)
}

export function getNextStreakBadge(longestStreak: number): StreakBadge | null {
  return STREAK_BADGES.find((b) => longestStreak < b.minDays) ?? null
}

/** Streak days to show on Today (includes today when complete, even on a fresh restart). */
export function getDisplayStreakDays(stats: {
  currentStreak: number
  todayComplete: boolean
}): number {
  if (stats.currentStreak > 0) return stats.currentStreak
  if (stats.todayComplete) return 1
  return 0
}

/**
 * Highest badge tier for the current streak length.
 * Ranges: 14–29 Fortnight, 30–59 Garden keeper, 60–99 Steady growth, 100+ Century bloom.
 */
export function getActiveStreakBadge(currentStreak: number): StreakBadge | null {
  if (currentStreak <= 0) return null
  let active: StreakBadge | null = null
  for (const badge of STREAK_BADGES) {
    if (currentStreak >= badge.minDays) active = badge
    else break
  }
  return active
}

/** Badge milestones that can trigger a richer celebration (week and above). */
export const STREAK_CELEBRATION_MILESTONES = STREAK_BADGES.filter(
  (b) => b.minDays >= 7,
).map((b) => b.minDays)

export function isStreakCelebrationMilestone(streakDays: number): boolean {
  return STREAK_CELEBRATION_MILESTONES.includes(streakDays)
}

/** Number of tulips shown for a badge tier (bouquet grows with each unlock). */
export function bouquetTulipCount(minDays: number): number {
  return bouquetColorsForMinDays(minDays).length
}

/**
 * Tulip colors for a badge tier. Uses the badge's minDays (1/3/7/14/30/60/100),
 * not the raw streak length, so each unlock gets a distinct bouquet.
 */
export function bouquetColorsForMinDays(minDays: number): string[] {
  const tier = getActiveStreakBadge(Math.max(1, minDays))
  switch (tier?.minDays) {
    case 1:
    case 3:
      return ['#7c3aed']
    case 7:
      return ['#7c3aed', '#facc15']
    case 14:
      return ['#7c3aed', '#facc15', '#fb923c']
    case 30:
      return ['#7c3aed', '#facc15', '#fb923c', '#f472b6']
    case 60:
      return ['#7c3aed', '#facc15', '#fb923c', '#f472b6', '#f8fafc']
    case 100:
      return ['#7c3aed', '#facc15', '#fb923c', '#f472b6', '#f8fafc', '#ef4444']
    default:
      return ['#7c3aed']
  }
}

export type TulipCelebrationVariant =
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'pink'
  | 'white'
  | 'red'

/** Map bouquet hex colors to celebration tulip variants. */
export function tulipCelebrationVariantForColor(hex: string): TulipCelebrationVariant {
  switch (hex.toLowerCase()) {
    case '#facc15':
      return 'yellow'
    case '#fb923c':
      return 'orange'
    case '#f472b6':
      return 'pink'
    case '#f8fafc':
      return 'white'
    case '#ef4444':
      return 'red'
    default:
      return 'purple'
  }
}
