import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type ReminderSettings = {
  enabled: boolean;
};

export type MedSort = 'time' | 'name' | 'custom';

/** How to mark multiple scheduled doses that share the same time on Today. */
export type SameTimeDoseMode = 'individual' | 'take_all' | 'choose';

export const SAME_TIME_DOSE_MODES: {
  value: SameTimeDoseMode;
  label: string;
  hint: string;
}[] = [
  {
    value: 'individual',
    label: 'One at a time',
    hint: 'Use each medication’s Mark taken button. No batch shortcuts.',
  },
  {
    value: 'take_all',
    label: 'Take all at once',
    hint: 'When 2+ doses share a time, offer a single Take all action for that time.',
  },
  {
    value: 'choose',
    label: 'Pick which doses',
    hint: 'Choose which medications you took when several are due at the same time.',
  },
];

/** Bundled reminder chimes (see app.json expo-notifications "sounds"). */
export type ReminderSound = 'default' | 'chime' | 'bell' | 'alert';

export const REMINDER_SOUNDS: {
  id: ReminderSound;
  label: string;
  /** Bundled file name used by iOS content + the Android channel; null = system default. */
  file: string | null;
}[] = [
  { id: 'default', label: 'Default', file: null },
  { id: 'chime', label: 'Chime', file: 'chime.wav' },
  { id: 'bell', label: 'Bell', file: 'bell.wav' },
  { id: 'alert', label: 'Alert', file: 'alert.wav' },
];

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
  reminderSound: 'mt-reminder-sound',
  medSort: 'mt-med-sort',
  customOrder: 'mt-custom-order',
  updateDismissed: 'mt-update-dismissed',
  onboarding: 'mt-onboarding-v1',
  onboardingLegacy: 'mt-onboarding-v1',
  labelAiEnabled: 'mt-label-ai-enabled',
  sameTimeDoseMode: 'mt-same-time-dose-mode',
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

export async function getSameTimeDoseMode(): Promise<SameTimeDoseMode> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.sameTimeDoseMode);
    if (raw === 'individual' || raw === 'take_all' || raw === 'choose') return raw;
    return 'choose';
  } catch {
    return 'choose';
  }
}

export async function setSameTimeDoseMode(mode: SameTimeDoseMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.sameTimeDoseMode, mode);
}

const REMINDER_SOUND_IDS = REMINDER_SOUNDS.map((s) => s.id);

export async function getReminderSound(): Promise<ReminderSound> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.reminderSound);
    return (REMINDER_SOUND_IDS as string[]).includes(raw ?? '')
      ? (raw as ReminderSound)
      : 'default';
  } catch {
    return 'default';
  }
}

export async function setReminderSound(sound: ReminderSound): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminderSound, sound);
}

/** File name for a sound id (or null for the system default). */
export function reminderSoundFile(sound: ReminderSound): string | null {
  return REMINDER_SOUNDS.find((s) => s.id === sound)?.file ?? null;
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

/**
 * Cloud label AI (Gemini) is OFF by default — OCR never leaves the device unless
 * the user explicitly opts in (sends label text to Google).
 */
export async function isLabelAiOptInEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.labelAiEnabled)) === '1';
  } catch {
    return false;
  }
}

export async function setLabelAiOptInEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.labelAiEnabled, enabled ? '1' : '0');
}

