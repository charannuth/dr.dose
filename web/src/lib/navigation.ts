import type { NavIconName } from '../components/NavIcon'

export type NavItem = {
  to: string
  label: string
  icon: NavIconName
  end?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Daily',
    items: [
      { to: '/', label: 'Today', icon: 'today', end: true },
      { to: '/history', label: 'History', icon: 'history' },
      { to: '/streaks', label: 'Streaks', icon: 'streaks' },
      { to: '/wellness', label: 'Wellness', icon: 'wellness' },
    ],
  },
  {
    label: 'Health',
    items: [
      { to: '/tracking', label: 'Tracking', icon: 'tracking' },
      { to: '/doctor-visits', label: 'Doctor visits', icon: 'doctor' },
      { to: '/medical-records', label: 'Medical records', icon: 'records' },
      { to: '/interactions', label: 'Drug safety check', icon: 'safety' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/account', label: 'My account', icon: 'account' },
      { to: '/help', label: 'Help & safety', icon: 'help' },
    ],
  },
]

/** Docked sidebar replaces the slide-out drawer at laptop widths and up. */
export const SIDEBAR_DOCK_QUERY = '(min-width: 1025px)'
