import type { AccentKey } from '../../constants/theme';
import type { DrawerIconName } from './DrawerIcon';

export type DrawerNavEntry = {
  /** Drawer route name (file name under app/(drawer)). */
  route: string;
  label: string;
  icon: DrawerIconName;
  accent: AccentKey;
};

export type DrawerNavSection = {
  title: string;
  items: DrawerNavEntry[];
};

export const DRAWER_SECTIONS: DrawerNavSection[] = [
  {
    title: 'Daily',
    items: [
      { route: 'today', label: 'Today', icon: 'today', accent: 'accentPurple' },
      { route: 'history', label: 'History', icon: 'history', accent: 'accentBlue' },
      { route: 'streaks', label: 'Streaks', icon: 'streaks', accent: 'accentAmber' },
      { route: 'wellness', label: 'Wellness', icon: 'wellness', accent: 'accentRed' },
    ],
  },
  {
    title: 'Health',
    items: [
      { route: 'tracking', label: 'Tracking', icon: 'tracking', accent: 'accentGreen' },
      { route: 'doctor-visits', label: 'Doctor visits', icon: 'doctor', accent: 'accentBlue' },
      { route: 'medical-records', label: 'Medical records', icon: 'records', accent: 'accentPurple' },
      { route: 'interactions', label: 'Drug safety check', icon: 'safety', accent: 'accentGreen' },
    ],
  },
  {
    title: 'You',
    items: [
      { route: 'account', label: 'My account', icon: 'account', accent: 'accentPurple' },
      { route: 'help', label: 'Help & safety', icon: 'help', accent: 'accentAmber' },
    ],
  },
];
