import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

// Simulators and devices with the Taptic Engine disabled reject these promises.
// A missing buzz is never worth surfacing as an error, so failures stay silent.
function play(effect: () => Promise<void>) {
  if (!supported) return;
  effect().catch(() => {});
}

/** Light tick for pressing a control. */
export function tapFeedback() {
  play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Confirmation for an action that changed the record, e.g. logging a dose. */
export function successFeedback() {
  play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Used when an action was rolled back after failing to save. */
export function errorFeedback() {
  play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Softer than errorFeedback: the user is being stopped, not told something broke. */
export function warningFeedback() {
  play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
