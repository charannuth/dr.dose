import { useEffect, useRef, useState } from 'react'
import {
  clearStreakCelebratedToday,
  markStreakCelebratedToday,
  wasStreakCelebratedToday,
} from '../lib/streakCelebration'
import { getDisplayStreakDays } from '../lib/streakBadges'
import type { StreakStats } from '../lib/streaks'

/** Dev-only: `?previewStreak=1` (or any day count) replays the bloom modal. */
function devPreviewStreakDays(): number | null {
  if (!import.meta.env.DEV) return null
  const params = new URLSearchParams(window.location.search)
  if (!params.has('previewStreak')) return null
  if (params.get('previewStreak') === '0') return null
  const n = Number(params.get('previewStreak'))
  if (!Number.isFinite(n) || n <= 0) return 1
  return n
}

export function useStreakCelebration(
  userId: string | undefined,
  stats: StreakStats | null,
) {
  const [celebrationStreak, setCelebrationStreak] = useState<number | null>(null)
  const initializedRef = useRef(false)
  const devPreviewShownRef = useRef(false)
  const prevRef = useRef<{
    todayComplete: boolean
    currentStreak: number
  } | null>(null)

  useEffect(() => {
    if (!userId) return

    const previewDays = devPreviewStreakDays()
    if (previewDays !== null) {
      if (!devPreviewShownRef.current) {
        devPreviewShownRef.current = true
        setCelebrationStreak(previewDays)
      }
      return
    }

    if (!stats?.hasMedications) return

    if (!initializedRef.current) {
      initializedRef.current = true
      prevRef.current = {
        todayComplete: stats.todayComplete,
        currentStreak: getDisplayStreakDays(stats),
      }
      return
    }

    const prev = prevRef.current
    if (!prev) return

    if (prev.todayComplete && !stats.todayComplete) {
      clearStreakCelebratedToday(userId)
    }

    const becameCompleteToday = stats.todayComplete && !prev.todayComplete
    const alreadyCelebrated = wasStreakCelebratedToday(userId)
    const displayStreak = getDisplayStreakDays(stats)

    if (becameCompleteToday && !alreadyCelebrated && displayStreak > 0) {
      markStreakCelebratedToday(userId)
      setCelebrationStreak(displayStreak)
    }

    prevRef.current = {
      todayComplete: stats.todayComplete,
      currentStreak: displayStreak,
    }
  }, [userId, stats])

  return {
    celebrationStreak,
    dismissCelebration: () => setCelebrationStreak(null),
  }
}
