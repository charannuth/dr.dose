import type { CycleCalendarDay } from '../../lib/tracking/cycle'

type CycleCalendarProps = {
  year: number
  month: number
  days: CycleCalendarDay[]
  selectedDate: string
  today: string
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function dayClasses(day: CycleCalendarDay, selectedDate: string, today: string): string {
  const parts = ['cycle-calendar-day']
  if (day.phase) parts.push(`phase-${day.phase}`)
  if (day.isLoggedPeriod) parts.push('logged-period')
  if (day.isPredictedPeriod) parts.push('predicted-period')
  if (day.isFuture) parts.push('is-future')
  if (day.hasSymptoms) parts.push('has-symptoms')
  if (day.hasIntercourse) parts.push('has-intercourse')
  if (day.date === selectedDate) parts.push('selected')
  if (day.date === today) parts.push('today')
  return parts.join(' ')
}

export function CycleCalendar({
  year,
  month,
  days,
  selectedDate,
  today,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CycleCalendarProps) {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const cells: ({ date: string | null; label: string; meta?: CycleCalendarDay })[] =
    []
  for (let i = 0; i < firstDow; i++) {
    cells.push({ date: null, label: '' })
  }
  for (const day of days) {
    cells.push({ date: day.date, label: String(parseInt(day.date.slice(8), 10)), meta: day })
  }

  return (
    <div className="cycle-calendar-wrap">
      <div className="cycle-calendar-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPrevMonth}>
          ←
        </button>
        <h4>{monthLabel(year, month)}</h4>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onNextMonth}>
          →
        </button>
      </div>

      <ul className="cycle-calendar-legend" aria-label="Calendar legend">
        <li>
          <span className="cycle-legend-swatch logged-period" /> Logged period
        </li>
        <li>
          <span className="cycle-legend-swatch predicted-period" /> Predicted period
        </li>
        <li>
          <span className="cycle-legend-swatch phase-follicular" /> Follicular
        </li>
        <li>
          <span className="cycle-legend-swatch phase-ovulation" /> Ovulation
        </li>
        <li>
          <span className="cycle-legend-swatch phase-luteal" /> Luteal
        </li>
        <li>
          <span className="cycle-legend-swatch cycle-symptom" /> Symptoms
        </li>
        <li>
          <span className="cycle-legend-heart" aria-hidden>♥</span> Intercourse
        </li>
      </ul>

      <div className="cycle-calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cycle-calendar-grid">
        {cells.map((cell, i) =>
          cell.date && cell.meta ? (
            <button
              key={cell.date}
              type="button"
              className={dayClasses(cell.meta, selectedDate, today)}
              onClick={() => onSelectDate(cell.date!)}
              aria-label={`${cell.label}${cell.meta.isLoggedPeriod ? ', period logged' : ''}${cell.meta.hasSymptoms ? ', symptoms' : ''}`}
            >
              <span className="cycle-day-num">{cell.label}</span>
              <span className="cycle-day-markers" aria-hidden>
                {cell.meta.hasIntercourse && (
                  <span className="cycle-marker-heart">♥</span>
                )}
                {cell.meta.hasSymptoms && (
                  <span className="cycle-marker-symptom" />
                )}
              </span>
            </button>
          ) : (
            <span key={`pad-${i}`} className="cycle-calendar-day cycle-calendar-day--empty" />
          ),
        )}
      </div>
    </div>
  )
}
