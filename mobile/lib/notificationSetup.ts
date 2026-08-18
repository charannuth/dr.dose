import { Platform } from 'react-native'
import { getExpoNotifications } from './expoNotifications'

/** Interactive lock-screen / notification-center category for dose alarms. */
export const DOSE_ALARM_CATEGORY_ID = 'dose_alarm'

export const DOSE_ACTION_MARK_TAKEN = 'MARK_TAKEN'
export const DOSE_ACTION_SNOOZE_10 = 'SNOOZE_10'

export const DOSE_REMINDER_CHANNEL_ID = 'dose-reminders'
/** Louder Android channel used for due-dose alarms (cannot swipe away as easily). */
export const DOSE_ALARM_CHANNEL_ID = 'dose-alarms'

const createdChannels = new Set<string>()
let categoriesReady = false

/**
 * Android channels + iOS/Android notification categories for lock-screen actions.
 * Safe to call repeatedly.
 */
export async function ensureNotificationInfrastructure(): Promise<boolean> {
  const Notifications = await getExpoNotifications()
  if (!Notifications) return false

  await ensureDoseChannel(null)
  await ensureDoseAlarmChannel()
  await ensureDoseAlarmCategory()
  return true
}

async function ensureDoseAlarmCategory(): Promise<void> {
  if (categoriesReady) return
  const Notifications = await getExpoNotifications()
  if (!Notifications) return

  await Notifications.setNotificationCategoryAsync(DOSE_ALARM_CATEGORY_ID, [
    {
      identifier: DOSE_ACTION_MARK_TAKEN,
      buttonTitle: 'Mark taken',
      options: {
        opensAppToForeground: true,
        isAuthenticationRequired: false,
        isDestructive: false,
      },
    },
    {
      identifier: DOSE_ACTION_SNOOZE_10,
      buttonTitle: 'Snooze 10 min',
      options: {
        opensAppToForeground: true,
        isAuthenticationRequired: false,
      },
    },
  ])
  categoriesReady = true
}

/**
 * Ensure the Android notification channel for a given reminder sound exists.
 * Android sets the sound per channel (not per notification), so each bundled
 * chime gets its own channel. Returns the channel id to schedule against.
 * No-op returning the default id on iOS (sound is set on the notification there).
 */
export async function ensureDoseChannel(file: string | null): Promise<string> {
  if (Platform.OS !== 'android') return DOSE_REMINDER_CHANNEL_ID

  const Notifications = await getExpoNotifications()
  if (!Notifications) return DOSE_REMINDER_CHANNEL_ID

  const channelId = file
    ? `${DOSE_REMINDER_CHANNEL_ID}-${file.replace(/\.[^.]+$/, '')}`
    : DOSE_REMINDER_CHANNEL_ID

  if (!createdChannels.has(channelId)) {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: file ? `Dose reminders (${file.replace(/\.[^.]+$/, '')})` : 'Dose reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ab82c5',
      sound: file ?? 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    })
    createdChannels.add(channelId)
  }

  return channelId
}

/** High-urgency Android channel for due-dose alarms (heads-up + ongoing). */
export async function ensureDoseAlarmChannel(): Promise<string> {
  if (Platform.OS !== 'android') return DOSE_ALARM_CHANNEL_ID

  const Notifications = await getExpoNotifications()
  if (!Notifications) return DOSE_ALARM_CHANNEL_ID

  if (!createdChannels.has(DOSE_ALARM_CHANNEL_ID)) {
    await Notifications.setNotificationChannelAsync(DOSE_ALARM_CHANNEL_ID, {
      name: 'Dose alarms',
      description:
        'Urgent medication dose alerts. These stay until you mark taken or snooze.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#0891b2',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      enableVibrate: true,
      showBadge: true,
    })
    createdChannels.add(DOSE_ALARM_CHANNEL_ID)
  }

  return DOSE_ALARM_CHANNEL_ID
}
