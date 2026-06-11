import AsyncStorage from '@react-native-async-storage/async-storage';

export type DemoTourArrow =
  | 'curve-up-left'
  | 'curve-up-right'
  | 'curve-down-left'
  | 'curve-down-right';

export type DemoTourPlacement = 'top' | 'bottom' | 'left' | 'right';

export type DemoTourTargetId =
  | 'add-medication'
  | 'today-tabs'
  | 'today-tab-prn'
  | 'today-summary'
  | 'wellness-checkin'
  | 'profile-menu';

export type DemoTourStep = {
  id: string;
  target: DemoTourTargetId;
  title: string;
  body: string;
  arrow: DemoTourArrow;
  placement: DemoTourPlacement;
};

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 'add-medication',
    target: 'add-medication',
    title: 'Add your medications',
    body: 'Tap + to enter each medicine, dose times (12-hour + AM/PM), and optional refill counts.',
    arrow: 'curve-up-right',
    placement: 'bottom',
  },
  {
    id: 'daily-schedule',
    target: 'today-tabs',
    title: 'Daily schedule',
    body: 'Medications with fixed reminder times appear here. Mark each dose taken as you go through the day.',
    arrow: 'curve-down-left',
    placement: 'bottom',
  },
  {
    id: 'as-needed',
    target: 'today-tab-prn',
    title: 'As needed (PRN)',
    body: 'Rescue inhalers, pain relievers, and other PRN meds live on this tab — log a dose only when you take one.',
    arrow: 'curve-down-right',
    placement: 'bottom',
  },
  {
    id: 'today-streak',
    target: 'today-summary',
    title: 'Streaks & progress',
    body: 'Log every scheduled dose today to grow your streak and unlock tulip badges. Finish the day to keep it going.',
    arrow: 'curve-up-left',
    placement: 'bottom',
  },
  {
    id: 'wellness-checkin',
    target: 'wellness-checkin',
    title: 'Daily check-in',
    body: 'Optional evening log for sleep, energy, and symptoms — helpful to review with your clinician.',
    arrow: 'curve-up-right',
    placement: 'top',
  },
  {
    id: 'profile-menu',
    target: 'profile-menu',
    title: 'Menu & more',
    body: 'Open the menu for History (calendar of doses), Streaks, Wellness, doctor visits, and drug safety checks.',
    arrow: 'curve-down-right',
    placement: 'right',
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
