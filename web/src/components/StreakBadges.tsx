import { StreakBadgeIcon } from './StreakBadgeIcon'
import {
  getEarnedStreakBadges,
  getNextStreakBadge,
  STREAK_BADGES,
  type StreakBadge,
} from '../lib/streakBadges'

type StreakBadgesProps = {
  longestStreak: number
  compact?: boolean
  /** Full badge catalog with unlock requirements (Streaks page). */
  catalog?: boolean
}

function BadgeTile({
  badge,
  earned,
  catalog,
}: {
  badge: StreakBadge
  earned: boolean
  catalog?: boolean
}) {
  const dayLabel =
    badge.minDays === 1 ? '1 day' : `${badge.minDays} days`

  return (
    <li
      className={`streak-badge-tile${earned ? ' streak-badge-earned' : ' streak-badge-locked'}${catalog ? ' streak-badge-tile-catalog' : ''}`}
      title={badge.description}
    >
      <StreakBadgeIcon earned={earned} minDays={badge.minDays} animate={false} />
      {catalog ? (
        <>
          <span className="streak-badge-label">{badge.label}</span>
          <span className="streak-badge-requirement">
            {earned ? 'Unlocked' : `Unlock at ${dayLabel}`}
          </span>
          <span className="streak-badge-desc">{badge.description}</span>
        </>
      ) : (
        <>
          <span className="streak-badge-days">{badge.minDays}d</span>
          <span className="streak-badge-label">{badge.label}</span>
        </>
      )}
    </li>
  )
}

export function StreakBadges({
  longestStreak,
  compact = false,
  catalog = false,
}: StreakBadgesProps) {
  const earned = getEarnedStreakBadges(longestStreak)
  const earnedIds = new Set(earned.map((b) => b.id))
  const next = getNextStreakBadge(longestStreak)

  if (catalog) {
    return (
      <section className="streak-badges streak-badges-catalog" aria-labelledby="streak-badges-heading">
        <h3 id="streak-badges-heading" className="streak-badges-title">
          Tulip badges
        </h3>
        <p className="field-hint streak-badges-hint">
          Each badge unlocks when your <strong>longest streak</strong> reaches consecutive
          perfect days (every scheduled dose logged).
          {next && (
            <>
              {' '}
              Next up: <strong>{next.label}</strong> at {next.minDays} day
              {next.minDays === 1 ? '' : 's'}
              {longestStreak > 0 && ` (${next.minDays - longestStreak} to go)`}.
            </>
          )}
        </p>
        <ul className="streak-badge-grid streak-badge-grid-catalog">
          {STREAK_BADGES.map((badge) => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              earned={earnedIds.has(badge.id)}
              catalog
            />
          ))}
        </ul>
      </section>
    )
  }

  if (compact) {
    return (
      <div className="streak-badges streak-badges-compact" aria-label="Streak badges">
        {earned.length === 0 ? (
          <p className="field-hint">Complete a perfect day to earn your first tulip badge.</p>
        ) : (
          <ul className="streak-badge-row">
            {earned.map((badge) => (
              <li key={badge.id} className="streak-badge-chip" title={badge.description}>
                <StreakBadgeIcon earned minDays={badge.minDays} animate={false} />
                <span>{badge.minDays}d</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <section className="streak-badges" aria-labelledby="streak-badges-heading">
      <h3 id="streak-badges-heading" className="streak-badges-title">
        Streak badges
      </h3>
      <p className="field-hint streak-badges-hint">
        Earn tulips for consecutive perfect adherence days (all doses logged).
        {next && (
          <>
            {' '}
            Next: <strong>{next.label}</strong> at {next.minDays} days
            {longestStreak > 0 && ` (${next.minDays - longestStreak} to go)`}.
          </>
        )}
      </p>
      <ul className="streak-badge-grid">
        {STREAK_BADGES.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
        ))}
      </ul>
    </section>
  )
}
