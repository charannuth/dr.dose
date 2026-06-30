import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { lastNDays } from '../../lib/dates';
import { STREAK_CALENDAR_DAYS, type StreakCalendarDay } from '../../lib/streaks';

const COLS = 7;

const STATUS_LABEL: Record<StreakCalendarDay['status'], string> = {
  perfect: 'Perfect day — all doses logged',
  partial: 'Partial — some doses logged',
  missed: 'Missed — scheduled doses not completed',
  none: 'No doses scheduled',
};

/** Diagonal hatch overlay that marks a "redeemed" (marked-late) perfect day. */
function RedeemedStripes({ color }: { color: string }) {
  const lines = [];
  for (let x = -100; x <= 100; x += 16) {
    lines.push(
      <Line
        key={x}
        x1={x}
        y1={0}
        x2={x + 100}
        y2={100}
        stroke={color}
        strokeWidth={4}
        strokeOpacity={0.45}
      />,
    );
  }
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines}
    </Svg>
  );
}

/** Match web streak calendar colors (palette-driven streak tokens). */
function cellStyle(status: StreakCalendarDay['status'], selected: boolean, colors: ColorPalette) {
  const base = {
    borderWidth: 1,
    borderRadius: radii.sm,
  } as const;

  switch (status) {
    case 'perfect':
      return {
        ...base,
        backgroundColor: colors.streakPerfectBg,
        borderColor: selected ? colors.accent : colors.streakPerfectBorder,
      };
    case 'partial':
      return {
        ...base,
        backgroundColor: colors.streakPartialBg,
        borderColor: selected ? colors.accent : colors.streakPartialBorder,
      };
    case 'missed':
      return {
        ...base,
        backgroundColor: colors.streakMissedBg,
        borderColor: selected ? colors.accent : colors.streakMissedBorder,
      };
    case 'none':
    default:
      return {
        ...base,
        backgroundColor: colors.surface,
        borderColor: selected ? colors.accent : colors.border,
        opacity: 0.55,
      };
  }
}

function makeCalendarLayoutStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    h3: { fontSize: 18, fontWeight: '900' as const, color: colors.text },
    hint: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xs },
    legend: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
      borderWidth: 1,
    },
    legendText: { color: colors.textMuted, fontWeight: '600' as const, fontSize: 13 },
    calendar: {
      width: '100%' as const,
      gap: 6,
    },
    weekRow: {
      flexDirection: 'row' as const,
      gap: 6,
      width: '100%' as const,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
      overflow: 'hidden' as const,
    },
    cellSelected: {
      borderWidth: 2,
    },
    cellText: {
      color: colors.text,
      fontWeight: '700' as const,
      fontSize: 15,
    },
    cellTextMuted: {
      color: colors.textMuted,
      fontWeight: '600' as const,
    },
  };
}

export function StreakConsistencyCalendar({
  days,
  selectedDate,
  onSelectDate,
}: {
  days: StreakCalendarDay[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCalendarLayoutStyles);

  function LegendSwatch({ status }: { status: StreakCalendarDay['status'] }) {
    const s = cellStyle(status, false, colors);
    return (
      <View
        style={[
          styles.legendSwatch,
          {
            backgroundColor: s.backgroundColor,
            borderColor: s.borderColor,
            opacity: status === 'none' ? 0.55 : 1,
          },
        ]}
      />
    );
  }

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const calendarDates = useMemo(
    () => lastNDays(STREAK_CALENDAR_DAYS).reverse(),
    [],
  );

  const weeks = useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < calendarDates.length; i += COLS) {
      chunks.push(calendarDates.slice(i, i + COLS));
    }
    return chunks;
  }, [calendarDates]);

  return (
    <View style={styles.card}>
      <Text style={styles.h3}>{STREAK_CALENDAR_DAYS}-day consistency</Text>
      <Text style={styles.hint}>
        Green = perfect adherence. Striped green = streak redeemed (a dose marked late). Tap a day
        to see doses and notes.
      </Text>

      <View style={styles.legend} accessibilityLabel="Legend">
        <View style={styles.legendItem}>
          <LegendSwatch status="perfect" />
          <Text style={styles.legendText}>Perfect</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: cellStyle('perfect', false, colors).backgroundColor,
                borderColor: colors.streakPerfectBorder,
                overflow: 'hidden',
              },
            ]}
          >
            <RedeemedStripes color={colors.success} />
          </View>
          <Text style={styles.legendText}>Redeemed</Text>
        </View>
        <View style={styles.legendItem}>
          <LegendSwatch status="partial" />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <LegendSwatch status="missed" />
          <Text style={styles.legendText}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <LegendSwatch status="none" />
          <Text style={styles.legendText}>—</Text>
        </View>
      </View>

      <View
        style={styles.calendar}
        accessibilityLabel={`${STREAK_CALENDAR_DAYS} day adherence calendar`}
      >
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((date) => {
              const day = dayMap.get(date);
              const status = day?.status ?? 'none';
              const redeemed = Boolean(day?.redeemed);
              const isSelected = selectedDate === date;
              const dayNum = Number(date.split('-')[2]);
              const cell = cellStyle(status, isSelected, colors);

              return (
                <Pressable
                  key={date}
                  onPress={() => onSelectDate(isSelected ? null : date)}
                  style={[styles.cell, cell, isSelected && styles.cellSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}. ${STATUS_LABEL[status]}${
                    redeemed ? '. Streak redeemed — marked late' : ''
                  }`}
                >
                  {redeemed ? <RedeemedStripes color={colors.success} /> : null}
                  <Text
                    style={[
                      styles.cellText,
                      status === 'none' && styles.cellTextMuted,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
