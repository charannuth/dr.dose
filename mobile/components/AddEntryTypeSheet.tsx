import { Modal, Pressable, Text, View } from 'react-native';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

export type AddEntryType = 'daily_med' | 'prn_med' | 'supplement';

type Option = {
  id: AddEntryType;
  title: string;
  desc: string;
  accent: keyof ColorPalette;
  accentBg: keyof ColorPalette;
};

const OPTIONS: Option[] = [
  {
    id: 'daily_med',
    title: 'Daily medication',
    desc: 'Taken on a fixed schedule with reminder times',
    accent: 'accentBlue',
    accentBg: 'accentBlueBg',
  },
  {
    id: 'prn_med',
    title: 'As-needed medication',
    desc: 'PRN meds you log when you take them',
    accent: 'accentPurple',
    accentBg: 'accentPurpleBg',
  },
  {
    id: 'supplement',
    title: 'Supplement',
    desc: 'Vitamins, protein, creatine, and more',
    accent: 'accentGreen',
    accentBg: 'accentGreenBg',
  },
];

export function AddEntryTypeSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: AddEntryType) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.title}>What do you want to add?</Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.card,
                { borderColor: colors[option.accent], backgroundColor: colors[option.accentBg] },
              ]}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
            >
              <Text style={[styles.cardTitle, { color: colors[option.accent] }]}>
                {option.title}
              </Text>
              <Text style={styles.cardDesc}>{option.desc}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    grabber: {
      alignSelf: 'center' as const,
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    card: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderLeftWidth: 5,
      padding: spacing.lg,
      gap: 4,
    },
    cardTitle: { fontFamily: fonts.heading, fontSize: 17 },
    cardDesc: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    cancel: {
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    cancelText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textMuted },
  };
}
