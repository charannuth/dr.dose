import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'mt-pending-dose-action-v1'

export type PendingDoseAction =
  | {
      type: 'mark_taken'
      /** Primary / first med (back-compat). */
      medicationId: string
      /** All remaining meds at this clock time (grouped alert). */
      medicationIds: string[]
      scheduleTime: string
      createdAt: string
    }
  | {
      type: 'snooze'
      medicationId: string
      medicationIds: string[]
      scheduleTime: string
      minutes: number
      createdAt: string
    }

function normalizeIds(
  medicationId: string,
  medicationIds?: string[],
): string[] {
  const ids = [
    medicationId,
    ...(Array.isArray(medicationIds) ? medicationIds : []),
  ].filter(Boolean)
  return [...new Set(ids)]
}

export async function setPendingDoseAction(
  action: PendingDoseAction,
): Promise<void> {
  const medicationIds = normalizeIds(action.medicationId, action.medicationIds)
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      ...action,
      medicationId: medicationIds[0] ?? action.medicationId,
      medicationIds,
    }),
  )
}

export async function peekPendingDoseAction(): Promise<PendingDoseAction | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingDoseAction
    const medicationIds = normalizeIds(parsed.medicationId, parsed.medicationIds)
    return {
      ...parsed,
      medicationId: medicationIds[0] ?? parsed.medicationId,
      medicationIds,
    }
  } catch {
    return null
  }
}

export async function clearPendingDoseAction(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}

export async function takePendingDoseAction(): Promise<PendingDoseAction | null> {
  const action = await peekPendingDoseAction()
  if (action) await clearPendingDoseAction()
  return action
}
