import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import {
  APP_LOCK_GRACE_MS,
  authenticateForAppLock,
  getAppLockEnabled,
  getAppLockLabel,
  isAppLockAvailable,
  setAppLockEnabled,
} from '../lib/appLock'

/**
 * Optional Face ID lock. When the user turns it on (Account > Face ID), the app asks for
 * Face ID on launch and after being in the background for a while. The content stays
 * mounted underneath, so nothing is lost; it is just covered until unlocked.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [locked, setLocked] = useState(false)
  const [label, setLabel] = useState('Face ID')
  const [failed, setFailed] = useState(false)
  const coldChecked = useRef(false)
  const backgroundedAt = useRef<number | null>(null)
  const prompting = useRef(false)

  const unlock = useCallback(async () => {
    if (prompting.current) return
    prompting.current = true
    setFailed(false)
    try {
      const ok = await authenticateForAppLock('Unlock Dr. Dose')
      if (ok) setLocked(false)
      else setFailed(true)
    } finally {
      prompting.current = false
    }
  }, [])

  const lockIfEnabled = useCallback(async () => {
    if (!(await getAppLockEnabled())) return
    if (!(await isAppLockAvailable())) {
      // User removed Face ID / passcode from the phone: never lock them out.
      await setAppLockEnabled(false)
      return
    }
    setLabel(await getAppLockLabel())
    setLocked(true)
    void unlock()
  }, [unlock])

  // Cold start: lock once the signed-in user is known.
  useEffect(() => {
    if (!user) {
      setLocked(false)
      return
    }
    if (coldChecked.current) return
    coldChecked.current = true
    void lockIfEnabled()
  }, [user, lockIfEnabled])

  // Returning from the background after the grace period.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now()
        return
      }
      if (state === 'active' && backgroundedAt.current != null) {
        const away = Date.now() - backgroundedAt.current
        backgroundedAt.current = null
        if (user && away >= APP_LOCK_GRACE_MS) void lockIfEnabled()
      }
    })
    return () => sub.remove()
  }, [user, lockIfEnabled])

  return (
    <>
      {children}
      {locked && user ? (
        <View style={styles.overlay} accessibilityViewIsModal>
          <Text style={styles.brand}>Dr. Dose</Text>
          <Text style={styles.title}>Locked</Text>
          <Text style={styles.body}>
            {failed ? `Could not verify. Try ${label} again.` : `Use ${label} to open your health data.`}
          </Text>
          <Pressable style={styles.button} onPress={() => void unlock()} accessibilityRole="button">
            <Text style={styles.buttonText}>{`Unlock with ${label}`}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    zIndex: 1000,
  },
  brand: { color: '#a78bfa', fontSize: 28, fontWeight: '800', marginBottom: 20 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: { color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 28 },
  button: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
