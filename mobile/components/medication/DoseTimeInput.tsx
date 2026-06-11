import { Pressable, Text, TextInput, View } from 'react-native';
import type { Meridiem } from '../../lib/dates';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  extractTimeDigits,
  formatTime12MaskFromDigits,
  normalizeTime12Display,
} from '../../lib/doseTimeInput';

type Props = {
  time12: string;
  period: Meridiem;
  label: string;
  onChange: (next: { time12: string; period: Meridiem }) => void;
};

function makeDoseTimeStyles(colors: ColorPalette) {
  return {
    row: { gap: spacing.xs, marginBottom: spacing.sm },
    label: { fontWeight: '700' as const, color: colors.text, fontSize: 14 },
    inputs: { flexDirection: 'row' as const, gap: spacing.sm, alignItems: 'center' as const },
    timeInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    periodWrap: { flexDirection: 'row' as const, gap: 4 },
    periodBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    periodText: { fontWeight: '700' as const, color: colors.textMuted },
    periodTextActive: { color: colors.onAccent },
  };
}

export function DoseTimeInput({ time12, period, label, onChange }: Props) {
  const styles = useThemedStyles(makeDoseTimeStyles);
  const { colors } = useTheme();

  function handleTimeChange(raw: string) {
    const digits = extractTimeDigits(raw);
    onChange({ time12: formatTime12MaskFromDigits(digits), period });
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputs}>
        <TextInput
          style={styles.timeInput}
          value={time12}
          onChangeText={handleTimeChange}
          onBlur={() => {
            if (!time12.trim()) return;
            try {
              onChange({ time12: normalizeTime12Display(time12), period });
            } catch {
              // keep partial until user fixes or taps Next
            }
          }}
          placeholder="00:00"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
        />
        <View style={styles.periodWrap}>
          {(['AM', 'PM'] as Meridiem[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodActive]}
              onPress={() => onChange({ time12, period: p })}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
