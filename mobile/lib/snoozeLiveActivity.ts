import { Platform } from 'react-native';
import type { LiveActivity } from 'expo-widgets';
import type { SnoozeActivityProps } from '../widgets/SnoozeLiveActivity';

type ActivityFactory = {
  start: (
    props: SnoozeActivityProps,
    url?: string,
  ) => LiveActivity<SnoozeActivityProps>;
  getInstances: () => LiveActivity<SnoozeActivityProps>[];
};

const instances = new Map<string, LiveActivity<SnoozeActivityProps>>();

function slotKey(medicationId: string, scheduleTime: string): string {
  return `${medicationId}|${scheduleTime}`;
}

function formatRemindAt(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function loadFactory(): ActivityFactory | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../widgets/SnoozeLiveActivity').default as ActivityFactory;
  } catch {
    return null;
  }
}

/** iOS Lock Screen / Dynamic Island card while a dose snooze is active. */
export async function startSnoozeLiveActivity(args: {
  medicationId: string;
  scheduleTime: string;
  medName: string;
  remindAt: Date;
}): Promise<void> {
  const factory = loadFactory();
  if (!factory) return;

  const key = slotKey(args.medicationId, args.scheduleTime);
  await endSnoozeLiveActivity(args.medicationId, args.scheduleTime);

  const remindAtLabel = formatRemindAt(args.remindAt);
  const instance = factory.start(
    {
      medName: args.medName,
      remindAtLabel,
      subtitle: 'Snoozed dose — tap Dr. Dose to mark taken',
    },
    'medicine-tracker://today',
  );
  instances.set(key, instance);
}

/** Dismiss the snooze Live Activity for one dose slot. */
export async function endSnoozeLiveActivity(
  medicationId: string,
  scheduleTime: string,
): Promise<void> {
  const key = slotKey(medicationId, scheduleTime);
  const cached = instances.get(key);
  if (cached?.end) {
    try {
      await cached.end('immediate');
    } catch {
      // Activity may already have ended.
    }
    instances.delete(key);
    return;
  }

  const factory = loadFactory();
  if (!factory?.getInstances) return;

  for (const instance of factory.getInstances()) {
    try {
      await instance.end('immediate');
    } catch {
      // best-effort
    }
  }
}

/** Clear every snooze Live Activity (e.g. when reminders are turned off). */
export async function endAllSnoozeLiveActivities(): Promise<void> {
  const keys = [...instances.keys()];
  await Promise.all(
    keys.map((key) => {
      const [medicationId, scheduleTime] = key.split('|');
      if (!medicationId || !scheduleTime) return Promise.resolve();
      return endSnoozeLiveActivity(medicationId, scheduleTime);
    }),
  );
}
