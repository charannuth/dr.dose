import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StreakBadges } from '../components/StreakBadges'
import { StreakCard } from '../components/StreakCard'
import { StreakCelebration } from '../components/StreakCelebration'
import { useAuth } from '../hooks/useAuth'
import { useStreakStats } from '../hooks/useStreakStats'
import type { StreakStats } from '../lib/streaks'

export function StreaksPage() {
  const { user } = useAuth()
  const { stats, loading, error } = useStreakStats(user?.id)
  const [previewStreakDays, setPreviewStreakDays] = useState<number | null>(null)

  return (
    <main className="page streaks-page">
      <header className="page-header">
        <h2>Streaks</h2>
        <p className="page-subtitle">
          Current streak, tulip badges, and what it takes to earn each one. Click a badge
          to preview its celebration.
        </p>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <StreakCard stats={stats ?? emptyStats()} loading={loading} />

      {!loading && stats && (
        <StreakBadges
          longestStreak={stats.longestStreak}
          catalog
          onPreviewBadge={(badge) => setPreviewStreakDays(badge.minDays)}
        />
      )}

      {!loading && stats && !stats.hasMedications && (
        <div className="empty-state">
          <p>Add medications with dose times on Today to start tracking streaks.</p>
          <Link to="/" className="btn btn-primary">
            Go to Today
          </Link>
        </div>
      )}

      <p className="page-footer-hint">
        Tap days on{' '}
        <Link to="/history">History</Link> to see doses logged, missed slots, and wellness
        notes.
      </p>

      {previewStreakDays != null && (
        <StreakCelebration
          key={previewStreakDays}
          streakDays={previewStreakDays}
          onDismiss={() => setPreviewStreakDays(null)}
        />
      )}
    </main>
  )
}

function emptyStats(): StreakStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    todayTaken: 0,
    todayExpected: 0,
    todayExtraLogs: 0,
    todayComplete: false,
    hasMedications: false,
    last7Days: [],
    consistencyCalendar: [],
  }
}
