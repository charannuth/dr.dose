import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { getExpoNotifications } from '../lib/expoNotifications'
import {
  DOSE_ACTION_MARK_TAKEN,
  DOSE_ACTION_SNOOZE_10,
} from '../lib/notificationSetup'
import { setPendingDoseAction } from '../lib/pendingDoseAction'
import { routes } from '../lib/routes'

type NotificationData = {
  screen?: string
  medicationId?: string
  medicationIds?: string[]
  scheduleTime?: string
  visitId?: string
  kind?: string
}

function routeForNotificationData(data: NotificationData | undefined): string | null {
  if (!data) return null
  if (data.screen === 'doctor-visits') return routes.doctorVisits
  if (data.screen === 'today' || data.medicationId || data.medicationIds?.length) {
    return routes.today
  }
  return null
}

function medicationIdsFromData(data: NotificationData): string[] {
  const ids = [
    ...(Array.isArray(data.medicationIds) ? data.medicationIds : []),
    typeof data.medicationId === 'string' ? data.medicationId : '',
  ].filter(Boolean)
  return [...new Set(ids)]
}

/**
 * Handle lock-screen / notification-center taps and action buttons.
 * Mark taken / Snooze queue a pending action so Today can run it after vault unlock.
 * Grouped same-time alerts pass every medicationId so Mark taken logs them all.
 */
export function useNotificationResponses() {
  const router = useRouter()
  const handledIds = useRef(new Set<string>())

  useEffect(() => {
    let subscription: { remove: () => void } | undefined
    let cancelled = false

    void (async () => {
      const Notifications = await getExpoNotifications()
      if (!Notifications || cancelled) return

      async function handleResponse(response: {
        actionIdentifier: string
        notification: {
          request: {
            identifier: string
            content: { data?: Record<string, unknown> }
          }
        }
      }) {
        const id = `${response.notification.request.identifier}:${response.actionIdentifier}`
        if (handledIds.current.has(id)) return
        handledIds.current.add(id)

        const data = (response.notification.request.content.data ??
          {}) as NotificationData
        const medicationIds = medicationIdsFromData(data)
        const medicationId = medicationIds[0] ?? null
        const scheduleTime =
          typeof data.scheduleTime === 'string' ? data.scheduleTime : null

        if (
          response.actionIdentifier === DOSE_ACTION_MARK_TAKEN &&
          medicationId &&
          scheduleTime
        ) {
          await setPendingDoseAction({
            type: 'mark_taken',
            medicationId,
            medicationIds,
            scheduleTime,
            createdAt: new Date().toISOString(),
          })
          router.push(routes.today as '/')
          return
        }

        if (
          response.actionIdentifier === DOSE_ACTION_SNOOZE_10 &&
          medicationId &&
          scheduleTime
        ) {
          await setPendingDoseAction({
            type: 'snooze',
            medicationId,
            medicationIds,
            scheduleTime,
            minutes: 10,
            createdAt: new Date().toISOString(),
          })
          router.push(routes.today as '/')
          return
        }

        const path = routeForNotificationData(data)
        if (path) router.push(path as '/')
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void handleResponse(response)
      })

      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && !cancelled) {
        void handleResponse(last)
      }
    })()

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [router])
}
