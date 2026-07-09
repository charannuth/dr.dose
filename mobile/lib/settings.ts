import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type ReminderSettings = {
  enabled: boolean;
};

export type MedSort = 'time' | 'name' | 'custom';

/** Which Today list a custom drag order belongs to. */
export type MedListTab = 'scheduled' | 'as_needed' | 'supplement';

export type CustomOrders = Record<MedListTab, string[]>;

const EMPTY_CUSTOM_ORDERS: CustomOrders = {
  scheduled: [],
  as_needed: [],
  supplement: [],
};

const KEYS = {
  themeMode: 'mt-theme-mode',
  timezone: 'mt-timezone',
  reminders: 'mt-reminders',
  medSort: 'mt-med-sort',
  customOrder: 'mt-custom-order',
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
    if (raw === 'name' || raw === 'custom') return raw;
    return 'time';
  } catch {
    return 'time';
  }
}

export async function setMedSort(sort: MedSort): Promise<void> {
  await AsyncStorage.setItem(KEYS.medSort, sort);
}

function customOrderKey(userId: string): string {
  return `${KEYS.customOrder}:${userId}`;
}

/** The user's saved drag order (medication IDs) for each Today list. */
export async function getCustomOrders(userId: string): Promise<CustomOrders> {
  try {
    const raw = await AsyncStorage.getItem(customOrderKey(userId));
    if (!raw) return { ...EMPTY_CUSTOM_ORDERS };
    const parsed = JSON.parse(raw) as Partial<CustomOrders>;
    return {
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      as_needed: Array.isArray(parsed.as_needed) ? parsed.as_needed : [],
      supplement: Array.isArray(parsed.supplement) ? parsed.supplement : [],
    };
  } catch {
    return { ...EMPTY_CUSTOM_ORDERS };
  }
}

/** Persist the drag order (medication IDs) for a single Today list. */
export async function setCustomOrder(
  userId: string,
  tab: MedListTab,
  orderedIds: string[],
): Promise<void> {
  const current = await getCustomOrders(userId);
  const next: CustomOrders = { ...current, [tab]: orderedIds };
  await AsyncStorage.setItem(customOrderKey(userId), JSON.stringify(next));
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
