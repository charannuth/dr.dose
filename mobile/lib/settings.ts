import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type ReminderSettings = {
  enabled: boolean;
};

export type MedSort = 'time' | 'name';

const KEYS = {
  themeMode: 'mt-theme-mode',
  timezone: 'mt-timezone',
  reminders: 'mt-reminders',
  medSort: 'mt-med-sort',
  updateDismissed: 'mt-update-dismissed',
  onboarding: 'mt-onboarding-v1',
  onboardingLegacy: 'mt-onboarding-v1',
} as const;

let timezoneCache: string | null = null;

function onboardingKey(userId: string): string {
  return `${KEYS.onboarding}:${userId}`;
}

const deviceTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.themeMode);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    return 'system';
  } catch {
    return 'system';
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.themeMode, mode);
}

export function getTimezone(): string {
  return timezoneCache ?? deviceTimezone();
}

export async function loadTimezone(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.timezone);
    timezoneCache = stored ?? deviceTimezone();
  } catch {
    timezoneCache = deviceTimezone();
  }
  return timezoneCache;
}

export async function setTimezone(timezone: string): Promise<void> {
  timezoneCache = timezone;
  await AsyncStorage.setItem(KEYS.timezone, timezone);
}

export function listTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [deviceTimezone()];
  }
}

export async function getReminders(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.reminders);
    if (!raw) return { enabled: false };
    return JSON.parse(raw) as ReminderSettings;
  } catch {
    return { enabled: false };
  }
}

export async function setReminders(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminders, JSON.stringify(settings));
}

export async function getMedSort(): Promise<MedSort> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.medSort);
    return raw === 'name' ? 'name' : 'time';
  } catch {
    return 'time';
  }
}

export async function setMedSort(sort: MedSort): Promise<void> {
  await AsyncStorage.setItem(KEYS.medSort, sort);
}

/** The latest App Store version the user dismissed the "update available" prompt for. */
export async function getDismissedUpdateVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.updateDismissed);
  } catch {
    return null;
  }
}

export async function setDismissedUpdateVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.updateDismissed, version);
}

export async function isOnboardingDone(userId: string): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(onboardingKey(userId))) === '1') return true;
    if ((await AsyncStorage.getItem(KEYS.onboardingLegacy)) === '1') {
      await setOnboardingDone(userId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function setOnboardingDone(userId: string): Promise<void> {
  await AsyncStorage.setItem(onboardingKey(userId), '1');
}
