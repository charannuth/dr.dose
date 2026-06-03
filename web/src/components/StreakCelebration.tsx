import { useEffect, useState, type CSSProperties } from 'react'
import {
  bouquetColorsForMinDays,
  getActiveStreakBadge,
  tulipCelebrationVariantForColor,
  type TulipCelebrationVariant,
} from '../lib/streakBadges'
import { getCelebrationBouquetLayout } from '../lib/streakCelebrationLayout'

type StreakCelebrationProps = {
  streakDays: number
  onDismiss: () => void
}

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300] as const

const TULIP_VARIANT_STYLES: Record<
  TulipCelebrationVariant,
  { petalFill: string; petalShine: string; centerFill: string; ringStroke: string; pollenFill: string }
> = {
  purple: {
    petalFill: 'url(#streak-petal-fill-purple)',
    petalShine: 'url(#streak-petal-shine-purple)',
    centerFill: 'url(#streak-center-gold)',
    ringStroke: '#fbbf24',
    pollenFill: '#fde68a',
  },
  yellow: {
    petalFill: 'url(#streak-petal-fill-yellow)',
    petalShine: 'url(#streak-petal-shine-yellow)',
    centerFill: 'url(#streak-center-yellow)',
    ringStroke: '#f59e0b',
    pollenFill: '#fef9c3',
  },
  orange: {
    petalFill: 'url(#streak-petal-fill-orange)',
    petalShine: 'url(#streak-petal-shine-orange)',
    centerFill: 'url(#streak-center-orange)',
    ringStroke: '#ea580c',
    pollenFill: '#ffedd5',
  },
  pink: {
    petalFill: 'url(#streak-petal-fill-pink)',
    petalShine: 'url(#streak-petal-shine-pink)',
    centerFill: 'url(#streak-center-pink)',
    ringStroke: '#db2777',
    pollenFill: '#fce7f3',
  },
  white: {
    petalFill: 'url(#streak-petal-fill-white)',
    petalShine: 'url(#streak-petal-shine-white)',
    centerFill: 'url(#streak-center-white)',
    ringStroke: '#94a3b8',
    pollenFill: '#f8fafc',
  },
  red: {
    petalFill: 'url(#streak-petal-fill-red)',
    petalShine: 'url(#streak-petal-shine-red)',
    centerFill: 'url(#streak-center-red)',
    ringStroke: '#b91c1c',
    pollenFill: '#fee2e2',
  },
}

/** Flat monarch-style clipart — drawn in-scene so it never clips the card. */
function StreakButterflyInScene({ dual }: { dual: boolean }) {
  return (
    <g
      className={`streak-butterfly-figure${dual ? ' streak-butterfly-figure-dual' : ' streak-butterfly-figure-single'}`}
      aria-hidden
    >
      <g className="streak-butterfly-sprite">
        <g className="streak-butterfly-wings">
          <path
            className="streak-butterfly-wing-upper"
            d="M4 10 C-14 0 -24 8 -20 22 C-12 28 2 20 4 14 Z"
            fill="url(#streak-bfly-wing)"
            stroke="#c2410c"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            className="streak-butterfly-wing-lower"
            d="M4 16 C-10 18 -16 28 -10 30 C-4 26 4 22 4 18 Z"
            fill="url(#streak-bfly-wing-soft)"
            stroke="#c2410c"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <circle cx="-10" cy="12" r="2.2" fill="#fff7ed" opacity="0.9" />
          <circle cx="-14" cy="20" r="1.5" fill="#fff7ed" opacity="0.85" />
        </g>
        <ellipse cx="8" cy="16" rx="3.2" ry="8.5" fill="#4a2c20" />
        <circle cx="10" cy="6" r="3.4" fill="#4a2c20" />
        <circle cx="8.5" cy="5.5" r="1.1" fill="#fef9c3" />
        <path
          d="M9 3.5 Q7 0.5 5 0"
          stroke="#4a2c20"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11 3.5 Q13 0.5 15 0"
          stroke="#4a2c20"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </g>
  )
}

function TulipBloom({
  variant,
  scale = 1,
  bloomSeq = 0,
}: {
  variant: TulipCelebrationVariant
  scale?: number
  bloomSeq?: number
}) {
  const styles = TULIP_VARIANT_STYLES[variant]
  const tieredStyle = { '--bloom-seq': bloomSeq } as CSSProperties

  return (
    <g
      className={`streak-tulip-bloom streak-tulip-bloom-${variant} streak-tulip-bloom-tiered`}
      style={tieredStyle}
      transform={scale !== 1 ? `scale(${scale})` : undefined}
    >
      <ellipse className="streak-tulip-bud" cx="0" cy="2" rx="11" ry="14" fill={styles.petalFill} />
      {PETAL_ANGLES.map((deg, i) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <ellipse
            className={`streak-tulip-petal streak-tulip-petal-${i + 1}`}
            cx="0"
            cy="-20"
            rx="14"
            ry="28"
            fill={styles.petalFill}
          />
          <ellipse
            className={`streak-tulip-petal-shine streak-tulip-petal-shine-${i + 1}`}
            cx="-3"
            cy="-22"
            rx="5"
            ry="14"
            fill={styles.petalShine}
          />
        </g>
      ))}
      <circle
        className="streak-tulip-center-ring"
        cx="0"
        cy="0"
        r="14"
        stroke={styles.ringStroke}
        strokeWidth="1.5"
        fill="none"
      />
      <circle className="streak-tulip-center" cx="0" cy="0" r="10" fill={styles.centerFill} />
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <circle
          key={deg}
          className={`streak-tulip-pollen streak-tulip-pollen-${i + 1}`}
          cx="0"
          cy="-5"
          r="1.8"
          fill={styles.pollenFill}
          transform={`rotate(${deg}) translate(0 -5)`}
        />
      ))}
    </g>
  )
}

function CelebrationGradientDefs() {
  return (
    <defs>
      <linearGradient id="streak-bfly-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="streak-bfly-wing-soft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-purple" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="45%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#5b21b6" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-purple" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-yellow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="45%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-yellow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-orange" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="45%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-orange" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-pink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f9a8d4" />
        <stop offset="45%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-pink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fce7f3" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-white" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-white" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="streak-petal-fill-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="45%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="streak-petal-shine-red" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fee2e2" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="streak-center-gold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="55%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>
      <radialGradient id="streak-center-yellow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fffbeb" />
        <stop offset="55%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#eab308" />
      </radialGradient>
      <radialGradient id="streak-center-orange" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffedd5" />
        <stop offset="55%" stopColor="#fdba74" />
        <stop offset="100%" stopColor="#ea580c" />
      </radialGradient>
      <radialGradient id="streak-center-pink" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fce7f3" />
        <stop offset="55%" stopColor="#f9a8d4" />
        <stop offset="100%" stopColor="#db2777" />
      </radialGradient>
      <radialGradient id="streak-center-white" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#94a3b8" />
      </radialGradient>
      <radialGradient id="streak-center-red" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fecaca" />
        <stop offset="55%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#b91c1c" />
      </radialGradient>
    </defs>
  )
}

export function StreakCelebration({ streakDays, onDismiss }: StreakCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const badge = getActiveStreakBadge(streakDays)
  const bouquetColors = bouquetColorsForMinDays(badge?.minDays ?? 1)
  const layout = getCelebrationBouquetLayout(bouquetColors.length)
  const multiBloom = bouquetColors.length >= 2

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onDismiss])

  const label = badge
    ? `Streak × ${streakDays} — ${badge.label}!`
    : `Streak × ${streakDays}!`

  return (
    <div
      className={`streak-celebration-backdrop${visible ? ' streak-celebration-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-celebration-title"
      onClick={onDismiss}
    >
      <div
        className="streak-celebration-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="streak-celebration-glow" aria-hidden />
        <div className="streak-celebration-glow streak-celebration-glow-outer" aria-hidden />

        <div
          className={`streak-celebration-illustration ${layout.bouquetClass}`}
          aria-hidden
        >
          <div className={`streak-celebration-tulip-wrap ${layout.bouquetClass}`}>
            <div className="streak-celebration-sparkles" aria-hidden>
              <span className="streak-sparkle streak-sparkle-1" />
              <span className="streak-sparkle streak-sparkle-2" />
              <span className="streak-sparkle streak-sparkle-3" />
              <span className="streak-sparkle streak-sparkle-4" />
              <span className="streak-sparkle streak-sparkle-5" />
              <span className="streak-sparkle streak-sparkle-6" />
              {multiBloom && (
                <>
                  <span className="streak-sparkle streak-sparkle-7" />
                  <span className="streak-sparkle streak-sparkle-8" />
                </>
              )}
            </div>

            <svg
              className={`streak-tulip-svg ${layout.bouquetClass}`}
              viewBox={layout.viewBox}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <CelebrationGradientDefs />

              <path
                className={`streak-tulip-stem${layout.branches.length > 0 ? ' streak-tulip-stem-trunk' : ''}`}
                d={layout.trunk}
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {layout.branches.map((branch, index) => (
                <path
                  key={branch}
                  className={`streak-tulip-stem streak-tulip-stem-branch${index % 2 === 1 ? ' streak-tulip-stem-branch-right' : ''}`}
                  d={branch}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ))}
              {layout.leaves.map((leaf, index) => (
                <path
                  key={leaf}
                  className={`streak-tulip-leaf${index % 2 === 0 ? ' streak-tulip-leaf-left' : ' streak-tulip-leaf-right'}`}
                  d={leaf}
                  fill="currentColor"
                />
              ))}
              {bouquetColors.map((color, index) => {
                const slot = layout.blooms[index]
                if (!slot) return null
                return (
                  <g
                    key={`${color}-${index}`}
                    className="streak-tulip-bloom-anchor"
                    transform={`translate(${slot.x} ${slot.y})`}
                  >
                    <TulipBloom
                      variant={tulipCelebrationVariantForColor(color)}
                      scale={slot.scale}
                      bloomSeq={index}
                    />
                  </g>
                )
              })}
              <StreakButterflyInScene dual={multiBloom} />
            </svg>
          </div>
        </div>

        <h2 id="streak-celebration-title" className="streak-celebration-title">
          {label}
        </h2>
        <p className="streak-celebration-subtitle">
          {badge?.description ?? 'Every scheduled dose logged today. Keep it growing tomorrow.'}
        </p>
        <button type="button" className="btn btn-primary streak-celebration-btn" onClick={onDismiss}>
          Continue
        </button>
      </div>
    </div>
  )
}
