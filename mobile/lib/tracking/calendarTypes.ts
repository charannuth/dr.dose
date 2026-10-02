import type { ReactNode } from 'react'

export type TrackingCalendarEventTone =
  | 'wellness'
  | 'cycle-period'
  | 'cycle-phase'
  | 'cycle-symptom'
  | 'weight'
  | 'hrt'
  | 'med-perfect'
  | 'med-partial'
  | 'med-missed'
  | 'doctor-upcoming'
  | 'doctor-past'
  | 'doctor-notes'
  | 'doctor-followup'

/** Apple Calendar–style pill shown inside a day cell. */
export type TrackingCalendarEvent = {
  id: string
  label: string
  tone: TrackingCalendarEventTone
}

/** One cell in the shared tracking calendar. */
export type TrackingCalendarCell = {
  date: string
  /** Modifier classes on the day button (e.g. logged-period, phase-luteal). */
  classNames: string[]
  /** Small indicators under the day number (compact views). */
  markers: Array<'heart' | 'dot'>
  /** Detailed labels for month / birds-eye views. */
  events: TrackingCalendarEvent[]
}

export type TrackingCalendarLegendItem = {
  id: string
  label: string
  swatchClass?: string
  icon?: 'heart' | 'dot'
}

export type TrackingCalendarData = {
  cells: Map<string, TrackingCalendarCell>
  legend: TrackingCalendarLegendItem[]
  emptyMessage?: string
  footer?: ReactNode
}

export function emptyCalendarCell(date: string): TrackingCalendarCell {
  return { date, classNames: [], markers: [], events: [] }
}
