import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppUpdateInfo } from '../lib/appUpdate';

/**
 * Non-dismissible full-screen gate. Only action is opening the App Store.
 * Used when a newer App Store version is available than the installed build.
 */
export function ForceUpdateModal({ info }: { info: AppUpdateInfo | null }) {
  if (!info?.updateAvailable || !info.storeUrl) return null;

  const storeUrl = info.storeUrl;
  const latestVersion = info.latestVersion;

  async function openStore() {
    const deepLink = storeUrl.replace(/^https?:\/\//, 'itms-apps://');
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      await Linking.openURL(canOpen ? deepLink : storeUrl);
    } catch {
      void Linking.openURL(storeUrl);
    }
  }

  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.root}>
        <Text style={styles.brand}>Dr. Dose</Text>
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>
          A new version
          {latestVersion ? ` (${latestVersion})` : ''} is available on the App Store.
          Please update to continue using Dr. Dose. This version is no longer supported.
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => void openStore()}
          accessibilityRole="button"
          accessibilityLabel="Update on the App Store"
        >
          <Text style={styles.btnText}>Update</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0891b2',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748b',
    marginBottom: 8,
  },
  btn: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
});
