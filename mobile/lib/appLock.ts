import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'

const ENABLED_KEY = 'app_lock_enabled'

/** Seconds in the background before the app asks for Face ID again. */
export const APP_LOCK_GRACE_MS = 30_000

/** True when this device can verify the user (Face ID / Touch ID, or a device passcode). */
export async function isAppLockAvailable(): Promise<boolean> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return false
    return await LocalAuthentication.isEnrolledAsync()
  } catch {
    return false
  }
}

/** "Face ID" or "Touch ID", for labels. Falls back to a generic name. */
export async function getAppLockLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID'
    }
  } catch {
    // fall through
  }
  return 'device lock'
}

export async function getAppLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) await AsyncStorage.setItem(ENABLED_KEY, '1')
    else await AsyncStorage.removeItem(ENABLED_KEY)
  } catch {
    // ignore
  }
}

/** Shows the system Face ID prompt (device passcode is the fallback). */
export async function authenticateForAppLock(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    })
    return result.success
  } catch {
    return false
  }
}
