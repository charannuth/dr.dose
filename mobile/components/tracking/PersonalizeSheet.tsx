import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  accent: string;
  busy?: boolean;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
};

function makeStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 64 },
    cancel: { fontSize: 16, color: colors.textMuted },
    save: { fontSize: 16, fontWeight: '700' as const, textAlign: 'right' as const },
    title: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: spacing.md },
    groupTitle: {
      fontFamily: fonts.heading,
      fontSize: 15,
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: 4,
    },
    groupHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },
    group: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
  };
}

/** Full-screen "Make it yours" sheet shared by every tracker. */
export function PersonalizeSheet({
  visible,
  title,
  subtitle,
  accent,
  busy,
  onCancel,
  onSave,
  children,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onCancel} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            style={styles.headerBtn}
            onPress={onSave}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={[styles.save, { color: accent, opacity: busy ? 0.5 : 1 }]}>Save</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function PersonalizeGroup({
  title,
  hint,
  children,
  plain,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  /** Render children without the card frame (e.g. chip grids). */
  plain?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <Text style={styles.groupTitle}>{title}</Text>
      {hint ? <Text style={styles.groupHint}>{hint}</Text> : null}
      {plain ? children : <View style={styles.group}>{children}</View>}
    </View>
  );
}
