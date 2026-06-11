export type DemoTourPlacement = 'top' | 'bottom' | 'left' | 'right'

export type DemoTourDrawerMode = 'closed' | 'open'

export type DemoTourStep = {
  id: string
  target: string
  title: string
  body: string
  placement: DemoTourPlacement
  drawer?: DemoTourDrawerMode
}

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 'add-medication',
    target: '[data-tour="add-medication"]',
    title: 'Add your medications',
    body: 'Start here to enter each medicine, dose times (12-hour + AM/PM), and optional refill counts.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'daily-schedule',
    target: '[data-tour="today-tabs"]',
    title: 'Daily schedule',
    body: 'Medications with fixed reminder times appear here. Mark each dose taken as you go through the day.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'as-needed',
    target: '[data-tour="today-tab-prn"]',
    title: 'As needed (PRN)',
    body: 'Rescue inhalers, pain relievers, and other PRN meds live on this tab — log a dose only when you take one.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'wellness-checkin',
    target: '[data-tour="wellness-checkin"]',
    title: 'Daily check-in',
    body: 'Optional evening log for sleep, energy, and symptoms — helpful to review with your clinician.',
    placement: 'top',
    drawer: 'closed',
  },
  {
    id: 'profile-menu',
    target: '[data-tour="profile-menu"]',
    title: 'Open the menu',
    body: 'Tap your profile photo to open the menu. History, Streaks, Tracking, and the rest of the app live here.',
    placement: 'left',
    drawer: 'closed',
  },
  {
    id: 'streaks',
    target: '[data-tour="drawer-streaks"]',
    title: 'Streaks & progress',
    body: 'Track your adherence streak and unlock tulip badges as you log scheduled doses day after day.',
    placement: 'left',
    drawer: 'open',
  },
  {
    id: 'menu-more',
    target: '[data-tour="drawer-nav"]',
    title: 'Everything else',
    body: 'All other features and categories — Wellness, Tracking, doctor visits, drug safety, and account settings — are in this menu.',
    placement: 'left',
    drawer: 'open',
  },
]

const DEMO_TOUR_STORAGE = 'mt-demo-tour-v1'

function demoTourKey(userId: string): string {
  return `${DEMO_TOUR_STORAGE}:${userId}`
}

export function isDemoTourDone(userId: string): boolean {
  return localStorage.getItem(demoTourKey(userId)) === '1'
}

export function setDemoTourDone(userId: string): void {
  localStorage.setItem(demoTourKey(userId), '1')
}
