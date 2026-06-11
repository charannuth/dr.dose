import AsyncStorage from '@react-native-async-storage/async-storage';

export type DemoTourPlacement = 'top' | 'bottom' | 'left' | 'right';

export type DemoTourDrawerMode = 'closed' | 'open';

export type DemoTourTargetId =
  | 'add-medication'
  | 'today-tabs'
  | 'today-tab-prn'
  | 'wellness-checkin'
  | 'profile-menu'
  | 'drawer-streaks'
  | 'drawer-nav';

export type DemoTourStep = {
  id: string;
  target: DemoTourTargetId;
  title: string;
  body: string;
  placement: DemoTourPlacement;
  drawer?: DemoTourDrawerMode;
};

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 'add-medication',
    target: 'add-medication',
    title: 'Add your medications',
    body: 'Tap + to enter each medicine, dose times (12-hour + AM/PM), and optional refill counts.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'daily-schedule',
    target: 'today-tabs',
    title: 'Daily schedule',
    body: 'Medications with fixed reminder times appear here. Mark each dose taken as you go through the day.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'as-needed',
    target: 'today-tab-prn',
    title: 'As needed (PRN)',
    body: 'Rescue inhalers, pain relievers, and other PRN meds live on this tab — log a dose only when you take one.',
    placement: 'bottom',
    drawer: 'closed',
  },
  {
    id: 'wellness-checkin',
    target: 'wellness-checkin',
    title: 'Daily check-in',
    body: 'Optional evening log for sleep, energy, and symptoms — helpful to review with your clinician.',
    placement: 'top',
    drawer: 'closed',
  },
  {
    id: 'profile-menu',
    target: 'profile-menu',
    title: 'Open the menu',
    body: 'Tap ≡ to open the side menu. History, Streaks, Tracking, and the rest of the app live here.',
    placement: 'right',
    drawer: 'closed',
  },
  {
    id: 'streaks',
    target: 'drawer-streaks',
    title: 'Streaks & progress',
    body: 'Track your adherence streak and unlock tulip badges as you log scheduled doses day after day.',
    placement: 'right',
    drawer: 'open',
  },
  {
    id: 'menu-more',
    target: 'drawer-nav',
    title: 'Everything else',
    body: 'All other features and categories — Wellness, Tracking, doctor visits, drug safety, and account settings — are in this menu.',
    placement: 'right',
    drawer: 'open',
  },
];

const DEMO_TOUR_STORAGE = 'mt-demo-tour-v1';

function demoTourKey(userId: string): string {
  return `${DEMO_TOUR_STORAGE}:${userId}`;
}

export async function isDemoTourDone(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(demoTourKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function setDemoTourDone(userId: string): Promise<void> {
  await AsyncStorage.setItem(demoTourKey(userId), '1');
}
