import { Link } from 'react-router-dom'
import { StreakBadgeIcon } from './StreakBadgeIcon'
import { getActiveStreakBadge, getDisplayStreakDays } from '../lib/streakBadges'
import type { StreakStats } from '../lib/streaks'

export function StreakSnippet({ stats }: { stats: StreakStats | null }) {
  if (!stats?.hasMedications) return null

  const displayStreak = getDisplayStreakDays(stats)
  const activeBadge = displayStreak > 0 ? getActiveStreakBadge(displayStreak) : null

  return (
    <p className="streak-snippet">
      {activeBadge && (
        <span
          key={activeBadge.id}
          className="streak-snippet-badge streak-badge-earned streak-snippet-badge-pop"
          title={activeBadge.description}
        >
          <StreakBadgeIcon earned minDays={activeBadge.minDays} animate />
        </span>
      )}
      {displayStreak > 0 ? (
        <>
          <span className="streak-snippet-count">{displayStreak}</span> day
          streak
          {stats.todayComplete ? ' — today complete' : ' — finish today to continue'}
          {activeBadge && (
            <span className="streak-snippet-tier"> · {activeBadge.label}</span>
          )}
        </>
      ) : stats.todayComplete ? (
        <>Today complete — come back tomorrow to extend your streak</>
      ) : (
        <>Log every dose today to start a streak</>
      )}
      . <Link to="/streaks">Details</Link>
    </p>
  )
}
