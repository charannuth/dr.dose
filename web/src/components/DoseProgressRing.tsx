type DoseProgressRingProps = {
  taken: number
  total: number
}

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function DoseProgressRing({ taken, total }: DoseProgressRingProps) {
  const ratio = total > 0 ? Math.min(taken / total, 1) : 0
  const complete = total > 0 && taken >= total

  return (
    <div
      className={`dose-ring${complete ? ' is-complete' : ''}`}
      role="img"
      aria-label={`${taken} of ${total} doses taken today`}
    >
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="dose-ring-track" cx="40" cy="40" r={RADIUS} />
        <circle
          className="dose-ring-value"
          cx="40"
          cy="40"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <span className="dose-ring-label">
        <strong>{taken}</strong>
        <span>/{total}</span>
      </span>
    </div>
  )
}
