import { todayLocalDate } from './dates'

/** Full-screen bloom + butterfly when all of today's scheduled doses are logged. */
export const STREAK_CELEBRATION_MILESTONE_DAYS = 7

function celebrationKey(userId: string, date: string): string {
  return `mt-streak-celebrated:${userId}:${date}`
}

export function wasStreakCelebratedToday(userId: string, date = todayLocalDate()): boolean {
  return localStorage.getItem(celebrationKey(userId, date)) === '1'
}

export function markStreakCelebratedToday(userId: string, date = todayLocalDate()): void {
  localStorage.setItem(celebrationKey(userId, date), '1')
}

/** Allow the bloom modal to play again after undoing today's last dose. */
export function clearStreakCelebratedToday(userId: string, date = todayLocalDate()): void {
  localStorage.removeItem(celebrationKey(userId, date))
}
