import { addDaysToDateString, localDateString } from '../dates'

export type CalendarViewRange =
  | 'day'
  | '4day'
  | 'week'
  | 'month'
  | '3month'
  | '6month'
  | '12month'

export type CalendarRangeOption = {
  value: CalendarViewRange
  label: string
  group: 'short' | 'long'
}

export const CALENDAR_RANGE_OPTIONS: CalendarRangeOption[] = [
  { value: 'day', label: '1 day', group: 'short' },
  { value: '4day', label: '4 days', group: 'short' },
  { value: 'week', label: '1 week', group: 'short' },
  { value: 'month', label: '1 month', group: 'short' },
  { value: '3month', label: '3 months', group: 'long' },
  { value: '6month', label: '6 months', group: 'long' },
  { value: '12month', label: '12 months', group: 'long' },
]

export type CalendarMonthBlock = {
  year: number
  month: number
  dates: string[]
}

export type CalendarWindow = {
  range: CalendarViewRange
  anchor: string
  start: string
  end: string
  dates: string[]
  months: CalendarMonthBlock[]
  title: string
  isStripLayout: boolean
}

function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate()
  const m = String(month).padStart(2, '0')
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function datesForMonth(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate()
  const m = String(month).padStart(2, '0')
  const dates: string[] = []
  for (let d = 1; d <= last; d++) {
    dates.push(`${year}-${m}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

function weekStartSunday(dateStr: string): string {
  const d = parseYmd(dateStr)
  const dow = d.getDay()
  return addDaysToDateString(dateStr, -dow)
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function monthBlocksStartingAt(
  anchor: string,
  count: number,
): CalendarMonthBlock[] {
  const d = parseYmd(anchor)
  const blocks: CalendarMonthBlock[] = []
  for (let i = 0; i < count; i++) {
    const shifted = new Date(d.getFullYear(), d.getMonth() + i, 1)
    const year = shifted.getFullYear()
    const month = shifted.getMonth() + 1
    blocks.push({ year, month, dates: datesForMonth(year, month) })
  }
  return blocks
}

function formatTitle(start: string, end: string, range: CalendarViewRange): string {
  const s = parseYmd(start)
  const e = parseYmd(end)
  if (range === 'day') {
    return s.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (start === end) {
    return s.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  }
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  if (sameMonth) {
    return s.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  if (sameYear) {
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function getCalendarWindow(
  anchor: string,
  range: CalendarViewRange,
): CalendarWindow {
  const d = parseYmd(anchor)
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  if (range === 'day') {
    return {
      range,
      anchor,
      start: anchor,
      end: anchor,
      dates: [anchor],
      months: [{ year, month, dates: [anchor] }],
      title: formatTitle(anchor, anchor, range),
      isStripLayout: true,
    }
  }

  if (range === '4day') {
    const dates = Array.from({ length: 4 }, (_, i) =>
      addDaysToDateString(anchor, i - 3),
    )
    return {
      range,
      anchor,
      start: dates[0],
      end: dates[3],
      dates,
      months: monthBlocksStartingAt(anchor, 1),
      title: formatTitle(dates[0], dates[3], range),
      isStripLayout: true,
    }
  }

  if (range === 'week') {
    const start = weekStartSunday(anchor)
    const dates = Array.from({ length: 7 }, (_, i) => addDaysToDateString(start, i))
    return {
      range,
      anchor,
      start,
      end: dates[6],
      dates,
      months: monthBlocksStartingAt(anchor, 1),
      title: formatTitle(start, dates[6], range),
      isStripLayout: true,
    }
  }

  if (range === 'month') {
    const dates = datesForMonth(year, month)
    const { start, end } = monthBounds(year, month)
    return {
      range,
      anchor,
      start,
      end,
      dates,
      months: [{ year, month, dates }],
      title: formatTitle(start, end, range),
      isStripLayout: false,
    }
  }

  const monthCount =
    range === '3month' ? 3 : range === '6month' ? 6 : 12
  const months = monthBlocksStartingAt(anchor, monthCount)
  const start = months[0] ? monthBounds(months[0].year, months[0].month).start : anchor
  const last = months[months.length - 1]
  const end = last ? monthBounds(last.year, last.month).end : anchor
  const dates = months.flatMap((m) => m.dates)

  return {
    range,
    anchor,
    start,
    end,
    dates,
    months,
    title: formatTitle(start, end, range),
    isStripLayout: false,
  }
}

export function shiftCalendarAnchor(
  anchor: string,
  range: CalendarViewRange,
  direction: -1 | 1,
): string {
  const step = direction === 1 ? 1 : -1
  switch (range) {
    case 'day':
      return addDaysToDateString(anchor, step)
    case '4day':
      return addDaysToDateString(anchor, step * 4)
    case 'week':
      return addDaysToDateString(anchor, step * 7)
    case 'month': {
      const d = parseYmd(anchor)
      const next = addMonths(d.getFullYear(), d.getMonth() + 1, step)
      const { start } = monthBounds(next.year, next.month)
      return start
    }
    case '3month': {
      const d = parseYmd(anchor)
      const next = addMonths(d.getFullYear(), d.getMonth() + 1, step * 3)
      return monthBounds(next.year, next.month).start
    }
    case '6month': {
      const d = parseYmd(anchor)
      const next = addMonths(d.getFullYear(), d.getMonth() + 1, step * 6)
      return monthBounds(next.year, next.month).start
    }
    case '12month': {
      const d = parseYmd(anchor)
      const next = addMonths(d.getFullYear(), d.getMonth() + 1, step * 12)
      return monthBounds(next.year, next.month).start
    }
    default:
      return anchor
  }
}

export function defaultCalendarAnchor(today = localDateString()): string {
  return today
}
