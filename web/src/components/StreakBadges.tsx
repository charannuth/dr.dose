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
  /** Click a badge to preview its streak celebration animation. */
  onPreviewBadge?: (badge: StreakBadge) => void
}

function BadgeTile({
  badge,
  earned,
  catalog,
  onPreview,
}: {
  badge: StreakBadge
  earned: boolean
  catalog?: boolean
  onPreview?: () => void
}) {
  const dayLabel = badge.minDays === 1 ? '1 day' : `${badge.minDays} days`
  const className = `streak-badge-tile${earned ? ' streak-badge-earned' : ' streak-badge-locked'}${catalog ? ' streak-badge-tile-catalog' : ''}${onPreview ? ' streak-badge-tile-previewable' : ''}`

  const inner = (
    <>
      <StreakBadgeIcon earned={earned} minDays={badge.minDays} animate={false} />
      {catalog ? (
        <>
          <span className="streak-badge-label">{badge.label}</span>
          <span className="streak-badge-requirement">
            {earned ? 'Unlocked' : `Unlock at ${dayLabel}`}
          </span>
          <span className="streak-badge-desc">{badge.description}</span>
          {onPreview ? (
            <span className="streak-badge-preview-hint">Click to preview celebration</span>
          ) : null}
        </>
      ) : (
        <>
          <span className="streak-badge-days">{badge.minDays}d</span>
          <span className="streak-badge-label">{badge.label}</span>
          {onPreview ? (
            <span className="streak-badge-preview-hint">Preview</span>
          ) : null}
        </>
      )}
    </>
  )

  if (onPreview) {
    return (
      <li>
        <button
          type="button"
          className={className}
          title={`Preview ${badge.label} celebration`}
          onClick={onPreview}
        >
          {inner}
        </button>
      </li>
    )
  }

  return (
    <li className={className} title={badge.description}>
      {inner}
    </li>
  )
}

export function StreakBadges({
  longestStreak,
  compact = false,
  catalog = false,
  onPreviewBadge,
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
          perfect days (every scheduled dose logged). Your Today icon upgrades at 14, then
          stays on Garden keeper for days 30–59, Steady growth for 60–99, and Century bloom
          from 100 onward.
          {next && (
            <>
              {' '}
              Next up: <strong>{next.label}</strong> at {next.minDays} day
              {next.minDays === 1 ? '' : 's'}
              {longestStreak > 0 && ` (${next.minDays - longestStreak} to go)`}.
            </>
          )}
          {onPreviewBadge ? ' Click any badge to preview its celebration.' : null}
        </p>
        <ul className="streak-badge-grid streak-badge-grid-catalog">
          {STREAK_BADGES.map((badge) => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              earned={earnedIds.has(badge.id)}
              catalog
              onPreview={
                onPreviewBadge ? () => onPreviewBadge(badge) : undefined
              }
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
                {onPreviewBadge ? (
                  <button
                    type="button"
                    className="streak-badge-chip-btn"
                    onClick={() => onPreviewBadge(badge)}
                    title={`Preview ${badge.label}`}
                  >
                    <StreakBadgeIcon earned minDays={badge.minDays} animate={false} />
                    <span>{badge.minDays}d</span>
                  </button>
                ) : (
                  <>
                    <StreakBadgeIcon earned minDays={badge.minDays} animate={false} />
                    <span>{badge.minDays}d</span>
                  </>
                )}
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
        {onPreviewBadge ? ' Click any badge to preview its celebration.' : null}
      </p>
      <ul className="streak-badge-grid">
        {STREAK_BADGES.map((badge) => (
          <BadgeTile
            key={badge.id}
            badge={badge}
            earned={earnedIds.has(badge.id)}
            onPreview={onPreviewBadge ? () => onPreviewBadge(badge) : undefined}
          />
        ))}
      </ul>
    </section>
  )
}
