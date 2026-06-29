import { Linking, Pressable, Text, View } from 'react-native';
import type { AppUpdateInfo } from '../../lib/appUpdate';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

function makeStyles(colors: ColorPalette) {
  return {
    banner: {
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      backgroundColor: colors.typeCardActiveBg,
      borderColor: colors.accent,
      gap: 6,
    },
    title: {
      fontWeight: '800' as const,
      fontSize: 16,
      color: colors.text,
    },
    body: {
      color: colors.text,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    updateBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
    },
    updateBtnText: {
      color: colors.onAccent,
      fontWeight: '800' as const,
      fontSize: 15,
    },
    later: {
      color: colors.textMuted,
      fontWeight: '700' as const,
    },
  };
}

export function UpdateBanner({
  info,
  onDismiss,
}: {
  info: AppUpdateInfo | null;
  onDismiss: () => void;
}) {
  const styles = useThemedStyles(makeStyles);

  if (!info?.updateAvailable) return null;

  async function openStore() {
    if (!info?.storeUrl) return;
    // Prefer the itms-apps scheme so it opens the App Store app directly (not Safari).
    const deepLink = info.storeUrl.replace(/^https?:\/\//, 'itms-apps://');
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      await Linking.openURL(canOpen ? deepLink : info.storeUrl);
    } catch {
      void Linking.openURL(info.storeUrl);
    }
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>Update Dr. Dose</Text>
      <Text style={styles.body}>
        A new version{info.latestVersion ? ` (${info.latestVersion})` : ''} is available on the App
        Store with the latest improvements. Please update to keep Dr. Dose working its best.
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={styles.updateBtn}
          onPress={() => void openStore()}
          accessibilityRole="button"
        >
          <Text style={styles.updateBtnText}>Update now</Text>
        </Pressable>
        <Pressable onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.later}>Later</Text>
        </Pressable>
      </View>
    </View>
  );
}
