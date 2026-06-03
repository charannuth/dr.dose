export type StreakBadge = {
  id: string
  minDays: number
  label: string
  description: string
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'bloom-1',
    minDays: 1,
    label: 'First bloom',
    description: 'Completed your first perfect adherence day',
  },
  {
    id: 'bloom-3',
    minDays: 3,
    label: '3-day roots',
    description: 'Three perfect days in a row',
  },
  {
    id: 'bloom-7',
    minDays: 7,
    label: 'Week in bloom',
    description: 'Seven-day streak',
  },
  {
    id: 'bloom-14',
    minDays: 14,
    label: 'Fortnight',
    description: 'Fourteen-day streak',
  },
  {
    id: 'bloom-30',
    minDays: 30,
    label: 'Garden keeper',
    description: 'Thirty-day streak',
  },
  {
    id: 'bloom-60',
    minDays: 60,
    label: 'Steady growth',
    description: 'Sixty-day streak',
  },
  {
    id: 'bloom-100',
    minDays: 100,
    label: 'Century bloom',
    description: 'One hundred perfect days',
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

/** Highest badge tier reached by the current streak (shown on Today). */
export function getActiveStreakBadge(currentStreak: number): StreakBadge | null {
  if (currentStreak <= 0) return null
  let active: StreakBadge | null = null
  for (const badge of STREAK_BADGES) {
    if (currentStreak >= badge.minDays) active = badge
  }
  return active
}

/** Badge milestones that trigger the full-screen celebration modal. */
export const STREAK_CELEBRATION_MILESTONES = STREAK_BADGES.filter(
  (b) => b.minDays >= 7,
).map((b) => b.minDays)

export function isStreakCelebrationMilestone(streakDays: number): boolean {
  return STREAK_CELEBRATION_MILESTONES.includes(streakDays)
}

/** Number of tulips shown for a badge tier (bouquet grows at 7+ days). */
export function bouquetTulipCount(minDays: number): number {
  return bouquetColorsForMinDays(minDays).length
}

/** Tulip colors for a badge tier (bouquet grows at 7+ days). */
export function bouquetColorsForMinDays(minDays: number): string[] {
  if (minDays < 7) return ['#7c3aed']
  if (minDays < 14) return ['#7c3aed', '#facc15']
  if (minDays < 30) return ['#7c3aed', '#facc15', '#fb923c']
  if (minDays < 60) return ['#7c3aed', '#facc15', '#fb923c', '#f472b6']
  if (minDays < 100) return ['#7c3aed', '#facc15', '#fb923c', '#f472b6', '#f8fafc']
  return ['#7c3aed', '#facc15', '#fb923c', '#f472b6', '#f8fafc', '#ef4444']
}
