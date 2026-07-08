import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Mode = 'minutes' | 'time';

/** Quick "in X minutes" presets (all under an hour, per the two-mode design). */
const MINUTE_PRESETS = [10, 15, 30, 45];

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Snooze picker. Two modes: "In minutes" (1–59, with quick presets) for short
 * delays, and "At a time" (wheel) for anything an hour or more out. Returns the
 * absolute Date the reminder should fire at.
 */
export function SnoozeModal({
  visible,
  medName,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  medName: string;
  onCancel: () => void;
  onConfirm: (remindAt: Date) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>('minutes');
  const [minutes, setMinutes] = useState(15);
  const [timeValue, setTimeValue] = useState<Date>(
    () => new Date(Date.now() + 60 * 60 * 1000),
  );

  useEffect(() => {
    if (visible) {
      setMode('minutes');
      setMinutes(15);
      setTimeValue(new Date(Date.now() + 60 * 60 * 1000));
    }
  }, [visible]);

  const remindAt = useMemo(() => {
    if (mode === 'minutes') {
      return new Date(Date.now() + minutes * 60 * 1000);
    }
    const d = new Date();
    d.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    // A chosen clock time that already passed today means tomorrow.
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }, [mode, minutes, timeValue]);

  function adjustMinutes(delta: number) {
    setMinutes((m) => Math.min(59, Math.max(1, m + delta)));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              Snooze {medName}
            </Text>
            <Pressable onPress={() => onConfirm(remindAt)} accessibilityRole="button">
              <Text style={styles.done}>Snooze</Text>
            </Pressable>
          </View>

          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentBtn, mode === 'minutes' && styles.segmentBtnActive]}
              onPress={() => setMode('minutes')}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === 'minutes' && styles.segmentTextActive,
                ]}
              >
                In minutes
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, mode === 'time' && styles.segmentBtnActive]}
              onPress={() => setMode('time')}
            >
              <Text
                style={[styles.segmentText, mode === 'time' && styles.segmentTextActive]}
              >
                At a time
              </Text>
            </Pressable>
          </View>

          {mode === 'minutes' ? (
            <View style={styles.body}>
              <View style={styles.chipRow}>
                {MINUTE_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    style={[styles.chip, minutes === preset && styles.chipActive]}
                    onPress={() => setMinutes(preset)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        minutes === preset && styles.chipTextActive,
                      ]}
                    >
                      {preset}m
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => adjustMinutes(-1)}>
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>
                <View style={styles.stepValue}>
                  <Text style={styles.stepValueText}>{minutes}</Text>
                  <Text style={styles.stepValueUnit}>min</Text>
                </View>
                <Pressable style={styles.stepBtn} onPress={() => adjustMinutes(1)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.body}>
              <DateTimePicker
                value={timeValue}
                mode="time"
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                textColor={colors.text}
                onChange={(_event, date) => {
                  if (date) setTimeValue(date);
                }}
              />
            </View>
          )}

          <Text style={styles.preview}>Reminds you at {formatClock(remindAt)}</Text>
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
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    title: { flex: 1, textAlign: 'center' as const, fontFamily: fonts.heading, fontSize: 16, color: colors.text },
    cancel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textMuted },
    done: { fontFamily: fonts.heading, fontSize: 15, color: colors.accent },
    segment: {
      flexDirection: 'row' as const,
      gap: spacing.xs,
      margin: spacing.md,
      padding: 4,
      backgroundColor: colors.buttonSecondaryBg,
      borderRadius: radii.md,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center' as const,
      borderRadius: radii.sm,
    },
    segmentBtnActive: { backgroundColor: colors.accent },
    segmentText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textMuted },
    segmentTextActive: { color: colors.onAccent },
    body: { paddingHorizontal: spacing.md, gap: spacing.md },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.buttonSecondaryBg,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentPurpleBg },
    chipText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
    chipTextActive: { color: colors.accent },
    stepper: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.lg,
      paddingVertical: spacing.sm,
    },
    stepBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.accentPurpleBg,
    },
    stepBtnText: { fontFamily: fonts.display, fontSize: 26, color: colors.accent },
    stepValue: { alignItems: 'center' as const, minWidth: 72 },
    stepValueText: { fontFamily: fonts.display, fontSize: 34, color: colors.text },
    stepValueUnit: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    preview: {
      textAlign: 'center' as const,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
  };
}
