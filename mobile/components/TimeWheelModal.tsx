import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

function timeToDate(value: string): Date {
  const [h, m] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Apple Clock–style wheel time picker. On iOS it renders the spinner inside a
 * bottom sheet with Cancel/Done; on Android it uses the platform's native time
 * dialog. `value` is a 24h "HH:mm" string.
 */
export function TimeWheelModal({
  visible,
  value,
  title = 'Set time',
  onCancel,
  onDone,
}: {
  visible: boolean;
  value: string;
  title?: string;
  onCancel: () => void;
  onDone: (next: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [temp, setTemp] = useState<Date>(() => timeToDate(value));

  useEffect(() => {
    if (visible) setTemp(timeToDate(value));
  }, [visible, value]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={timeToDate(value)}
        mode="time"
        is24Hour={false}
        onChange={(event, date) => {
          if (event.type === 'set' && date) {
            onDone(dateToTime(date));
          } else {
            onCancel();
          }
        }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={() => onDone(dateToTime(temp))} accessibilityRole="button">
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={temp}
            mode="time"
            display="spinner"
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={colors.text}
            onChange={(_event, date) => {
              if (date) setTemp(date);
            }}
          />
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
    },
    title: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
    cancel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textMuted },
    done: { fontFamily: fonts.heading, fontSize: 15, color: colors.accentGreen },
  };
}
