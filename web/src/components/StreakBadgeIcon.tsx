import { useEffect, useState } from 'react'
import { bouquetColorsForMinDays } from '../lib/streakBadges'

type StreakBadgeIconProps = {
  earned: boolean
  minDays: number
  className?: string
  /** When false, show the bloomed state without entrance animation. */
  animate?: boolean
  /** Increment to force the bloom animation to run again. */
  replayKey?: number
}

const PETAL_ANGLES = [0, 72, 144, 216, 288] as const

const BOUQUET_OFFSETS = [-12, 12, -6, 6, -16, 16] as const

function AnimatedTulip({
  color,
  earned,
  slot,
}: {
  color: string
  earned: boolean
  slot: number
}) {
  const opacity = earned ? 1 : 0.25
  const x = BOUQUET_OFFSETS[slot] ?? 0
  const slotClass = slot === 0 ? '' : ` streak-badge-tulip-${slot + 1}`

  return (
    <g
      className={`streak-badge-tulip${slotClass}`}
      transform={`translate(${x} 0)`}
      opacity={opacity}
    >
      <path
        className="streak-badge-stem"
        d="M16 38 C16 28 15 22 16 16"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="streak-badge-bloom" transform="translate(16 14)">
        {PETAL_ANGLES.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <ellipse
              className={`streak-badge-petal streak-badge-petal-${i + 1}`}
              cx="0"
              cy="-6"
              rx="5"
              ry="9"
              fill={color}
            />
          </g>
        ))}
        <circle className="streak-badge-center" cx="0" cy="0" r="3" fill={color} />
      </g>
    </g>
  )
}

export function StreakBadgeIcon({
  earned,
  minDays,
  className = '',
  animate = true,
  replayKey = 0,
}: StreakBadgeIconProps) {
  const colors = bouquetColorsForMinDays(minDays)
  const wide = colors.length > 1
  const [playing, setPlaying] = useState(animate)

  useEffect(() => {
    if (!animate || replayKey === 0) return
    setPlaying(false)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPlaying(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [replayKey, animate])

  useEffect(() => {
    if (replayKey === 0) setPlaying(animate)
  }, [animate, replayKey])

  const showBloom = animate && playing

  return (
    <svg
      className={`streak-badge-icon${earned ? ' earned' : ''}${wide ? ' streak-badge-icon-wide' : ''}${showBloom ? '' : ' streak-badge-icon-static'}${className ? ` ${className}` : ''}`}
      data-tulips={colors.length}
      viewBox={wide ? '0 0 48 40' : '0 0 32 40'}
      fill="none"
      aria-hidden
    >
      {colors.length === 1 ? (
        <AnimatedTulip color={colors[0]} earned={earned} slot={0} />
      ) : (
        <g>
          {colors.slice(0, 6).map((color, idx) => (
            <AnimatedTulip key={`${color}-${idx}`} color={color} earned={earned} slot={idx} />
          ))}
        </g>
      )}
    </svg>
  )
}
