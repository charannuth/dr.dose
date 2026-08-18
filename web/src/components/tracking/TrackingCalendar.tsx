import { useMemo } from 'react'
import {
  CALENDAR_SOURCE_ALL,
  calendarSourceOptions,
  type CalendarSourceId,
  type CalendarSourceMeta,
} from '../../lib/tracking/calendarSources'
import {
  CALENDAR_RANGE_OPTIONS,
  getCalendarWindow,
  shiftCalendarAnchor,
  type CalendarViewRange,
} from '../../lib/tracking/calendarRange'
import type {
  TrackingCalendarCell,
  TrackingCalendarData,
  TrackingCalendarEvent,
} from '../../lib/tracking/calendarTypes'
import type { TrackerId } from '../../lib/tracking/catalog'

const MAX_VISIBLE_EVENTS = 4
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type TrackingCalendarProps = {
  today: string
  anchor: string
  range: CalendarViewRange
  source: CalendarSourceId | null
  selectedDate: string
  enabledTrackers: TrackerId[]
  data: TrackingCalendarData
  loading?: boolean
  onAnchorChange: (date: string) => void
  onRangeChange: (range: CalendarViewRange) => void
  onSourceChange: (source: CalendarSourceId) => void
  onSelectDate: (date: string) => void
  /** When set, overrides tracker-based source options (e.g. doctor visits page). */
  sourceOptions?: CalendarSourceMeta[]
}

function dayButtonClasses(
  cell: TrackingCalendarCell | undefined,
  selectedDate: string,
  today: string,
  variant: 'month' | 'week' | 'day' | 'compact',
): string {
  const parts = ['tracking-calendar-day', 'cycle-calendar-day']
  parts.push(`tracking-calendar-day--${variant}`)
  if (!cell) return parts.join(' ')
  for (const c of cell.classNames) parts.push(c)
  if (cell.date === selectedDate) parts.push('selected')
  if (cell.date === today) parts.push('today')
  if ((variant === 'day' || variant === 'week') && cell.events.length > 0) {
    parts.push('has-events')
  }
  return parts.join(' ')
}

function DayEvents({ events }: { events: TrackingCalendarEvent[] }) {
  if (events.length === 0) return null
  const visible = events.slice(0, MAX_VISIBLE_EVENTS)
  const overflow = events.length - visible.length

  return (
    <div className="tracking-calendar-day-events" aria-hidden>
      {visible.map((event) => (
        <span
          key={event.id}
          className={`tracking-calendar-event tracking-calendar-event--${event.tone}`}
          title={event.label}
        >
          {event.label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="tracking-calendar-event-more">+{overflow} more</span>
      )}
    </div>
  )
}

function DayMarkers({
  cell,
  detailed,
}: {
  cell: TrackingCalendarCell | undefined
  detailed: boolean
}) {
  const events = cell?.events ?? []
  const markers = cell?.markers ?? []

  if (!detailed) {
    return (
      <span className="cycle-day-markers" aria-hidden>
        {markers.includes('heart') && <span className="cycle-marker-heart">♥</span>}
        {markers.includes('dot') && <span className="cycle-marker-symptom" />}
      </span>
    )
  }

  return <DayEvents events={events} />
}

function MonthGrid({
  year,
  month,
  dates,
  cells,
  selectedDate,
  today,
  compact,
  detailed,
  showTitle,
  onSelectDate,
}: {
  year: number
  month: number
  dates: string[]
  cells: Map<string, TrackingCalendarCell>
  selectedDate: string
  today: string
  compact: boolean
  detailed: boolean
  showTitle: boolean
  onSelectDate: (date: string) => void
}) {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const gridCells: ({ date: string; label: string } | null)[] = []
  for (let i = 0; i < firstDow; i++) gridCells.push(null)
  for (const date of dates) {
    gridCells.push({ date, label: String(parseInt(date.slice(8), 10)) })
  }

  const monthTitle = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: compact ? 'short' : 'long',
    year: compact ? 'numeric' : undefined,
  })
  const headers = WEEKDAYS_SHORT
  const variant = compact ? 'compact' : 'month'

  return (
    <div
      className={`tracking-calendar-month${compact ? ' tracking-calendar-month--compact' : ''}${detailed ? ' tracking-calendar-month--detailed' : ''}${!compact ? ' tracking-calendar-month--spacious' : ''}`}
    >
      {showTitle && (
        <h5
          className={`tracking-calendar-month-label${!compact ? ' tracking-calendar-month-label--hero' : ''}`}
        >
          {monthTitle}
        </h5>
      )}
      <div className="tracking-calendar-weekdays cycle-calendar-weekdays">
        {headers.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="tracking-calendar-grid cycle-calendar-grid">
        {gridCells.map((cell, i) =>
          cell?.date ? (
            <button
              key={cell.date}
              type="button"
              className={`${dayButtonClasses(
                cells.get(cell.date),
                selectedDate,
                today,
                variant,
              )}${detailed ? ' tracking-calendar-day--detailed' : ''}`}
              onClick={() => onSelectDate(cell.date)}
            >
              <span className="tracking-calendar-day-header">
                <span className="cycle-day-num">{cell.label}</span>
              </span>
              <DayMarkers cell={cells.get(cell.date)} detailed={detailed} />
            </button>
          ) : (
            <span
              key={`pad-${year}-${month}-${i}`}
              className={`tracking-calendar-day cycle-calendar-day--empty tracking-calendar-day--empty tracking-calendar-day--${variant}`}
            />
          ),
        )}
      </div>
    </div>
  )
}

function StripLayout({
  dates,
  cells,
  selectedDate,
  today,
  range,
  onSelectDate,
}: {
  dates: string[]
  cells: Map<string, TrackingCalendarCell>
  selectedDate: string
  today: string
  range: CalendarViewRange
  onSelectDate: (date: string) => void
}) {
  if (range === 'day') {
    const date = dates[0]
    if (!date) return null
    const d = new Date(`${date}T12:00:00`)
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
    const cell = cells.get(date)
    return (
      <div className="tracking-calendar-focus">
        <button
          type="button"
          className={dayButtonClasses(cell, selectedDate, today, 'day')}
          onClick={() => onSelectDate(date)}
        >
          <span className="tracking-calendar-focus-dow">{weekday}</span>
          <span className="cycle-day-num">{d.getDate()}</span>
          <DayMarkers cell={cell} detailed />
        </button>
      </div>
    )
  }

  return (
    <div className="tracking-calendar-strip-wrap">
      <div className="tracking-calendar-weekdays cycle-calendar-weekdays tracking-calendar-strip-headers">
        {dates.map((date) => {
          const d = new Date(`${date}T12:00:00`)
          return (
            <span key={`h-${date}`}>
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
          )
        })}
      </div>
      <div className="tracking-calendar-strip">
        {dates.map((date) => {
          const d = new Date(`${date}T12:00:00`)
          const cell = cells.get(date)
          return (
            <button
              key={date}
              type="button"
              className={dayButtonClasses(cell, selectedDate, today, 'week')}
              onClick={() => onSelectDate(date)}
            >
              <span className="cycle-day-num">{d.getDate()}</span>
              <DayMarkers cell={cell} detailed />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TrackingCalendar({
  today,
  anchor,
  range,
  source,
  selectedDate,
  enabledTrackers,
  data,
  loading = false,
  onAnchorChange,
  onRangeChange,
  onSourceChange,
  onSelectDate,
  sourceOptions: sourceOptionsOverride,
}: TrackingCalendarProps) {
  const window = useMemo(() => getCalendarWindow(anchor, range), [anchor, range])
  const sourceOptions = useMemo(
    () => sourceOptionsOverride ?? calendarSourceOptions(enabledTrackers),
    [sourceOptionsOverride, enabledTrackers],
  )
  const activeSource = sourceOptions.find((o) => o.id === source)
  const showGrid = !loading && activeSource?.support === 'full'
  const showPlannedHint = !loading && activeSource?.support === 'planned'
  const isOverview = source === CALENDAR_SOURCE_ALL
  const detailedMonth =
    !window.isStripLayout && window.months.length === 1 && (isOverview || range === 'month')
  const multiMonthCompact = window.months.length >= 6

  function renderSourceOptions(meta: CalendarSourceMeta) {
    if (meta.support === 'full') {
      return (
        <option key={meta.id} value={meta.id}>
          {meta.label}
        </option>
      )
    }
    return (
      <option key={meta.id} value={meta.id} disabled>
        {meta.label} (coming soon)
      </option>
    )
  }

  return (
    <section
      className={`tracking-calendar-hub${detailedMonth ? ' tracking-calendar-hub--expanded' : ''}${isOverview ? ' tracking-calendar-hub--overview' : ''}`}
      aria-label="Tracking calendar"
    >
      <div className="tracking-calendar-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Previous period"
          onClick={() => onAnchorChange(shiftCalendarAnchor(anchor, range, -1))}
        >
          ←
        </button>

        <div className="tracking-calendar-toolbar-center">
          <label className="tracking-calendar-control">
            <span className="tracking-calendar-control-label">View</span>
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value as CalendarViewRange)}
            >
              {CALENDAR_RANGE_OPTIONS.filter((o) => o.group === 'short').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <optgroup label="Longer ranges">
                {CALENDAR_RANGE_OPTIONS.filter((o) => o.group === 'long').map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          {sourceOptions.length > 1 && (
            <label className="tracking-calendar-control">
              <span className="tracking-calendar-control-label">Show</span>
              <select
                value={source ?? ''}
                onChange={(e) => onSourceChange(e.target.value as CalendarSourceId)}
              >
                {sourceOptions.map(renderSourceOptions)}
              </select>
            </label>
          )}

          <h4 className="tracking-calendar-title">{window.title}</h4>

          {anchor !== today && (
            <button
              type="button"
              className="btn btn-ghost btn-sm tracking-calendar-today-jump"
              onClick={() => onAnchorChange(today)}
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Next period"
          onClick={() => onAnchorChange(shiftCalendarAnchor(anchor, range, 1))}
        >
          →
        </button>
      </div>

      {isOverview && !loading && (
        <p className="field-hint tracking-calendar-overview-hint">
          Birds-eye view — every enabled tracker on one calendar. Tap a day for details below.
        </p>
      )}

      {loading && <p className="loading tracking-calendar-loading">Loading calendar…</p>}

      {!loading && data.legend.length > 0 && (
        <ul className="tracking-calendar-legend cycle-calendar-legend">
          {data.legend.map((item) => (
            <li key={item.id}>
              {item.swatchClass && (
                <span className={`cycle-legend-swatch ${item.swatchClass}`} />
              )}
              {item.icon === 'dot' && <span className="cycle-legend-dot symptom" />}
              {item.icon === 'heart' && (
                <span className="cycle-legend-heart" aria-hidden>
                  ♥
                </span>
              )}
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {showPlannedHint && data.emptyMessage && (
        <p className="field-hint tracking-calendar-empty">{data.emptyMessage}</p>
      )}

      {showGrid && (
        <div
          className={[
            'tracking-calendar-body',
            window.isStripLayout ? 'tracking-calendar-body--strip' : '',
            window.months.length > 1 ? 'tracking-calendar-body--multi' : '',
            multiMonthCompact ? 'tracking-calendar-body--multi-compact' : '',
            detailedMonth ? 'tracking-calendar-body--detailed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {window.isStripLayout ? (
            <StripLayout
              dates={window.dates}
              cells={data.cells}
              selectedDate={selectedDate}
              today={today}
              range={range}
              onSelectDate={onSelectDate}
            />
          ) : window.months.length === 1 ? (
            <MonthGrid
              year={window.months[0].year}
              month={window.months[0].month}
              dates={window.months[0].dates}
              cells={data.cells}
              selectedDate={selectedDate}
              today={today}
              compact={false}
              detailed={detailedMonth}
              showTitle={false}
              onSelectDate={onSelectDate}
            />
          ) : (
            <div
              className={`tracking-calendar-multi${multiMonthCompact ? ' tracking-calendar-multi--compact' : ''}`}
            >
              {window.months.map((block) => (
                <div
                  key={`${block.year}-${block.month}`}
                  className={multiMonthCompact ? 'tracking-calendar-mini-slot' : undefined}
                >
                  <MonthGrid
                    year={block.year}
                    month={block.month}
                    dates={block.dates}
                    cells={data.cells}
                    selectedDate={selectedDate}
                    today={today}
                    compact={multiMonthCompact}
                    detailed={false}
                    showTitle
                    onSelectDate={onSelectDate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.footer}
    </section>
  )
}
