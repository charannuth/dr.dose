import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  CALENDAR_SOURCE_ALL,
  calendarSourceOptions,
  type CalendarSourceId,
  type CalendarSourceMeta,
} from '../../lib/tracking/calendarSources';
import {
  CALENDAR_RANGE_OPTIONS,
  getCalendarWindow,
  shiftCalendarAnchor,
  type CalendarViewRange,
} from '../../lib/tracking/calendarRange';
import type {
  TrackingCalendarCell,
  TrackingCalendarData,
  TrackingCalendarEvent,
} from '../../lib/tracking/calendarTypes';
import type { TrackerId } from '../../lib/tracking/catalog';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { SelectField } from './SelectField';
import { cellStylesFromClassNames, eventToneStyle } from './calendarCellStyles';
import { TrackingCalendarLegend } from './TrackingCalendarLegend';
import { useTrackingStyles } from './trackingStyles';

const MAX_VISIBLE_EVENTS = 4;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type CalendarUiStyles = ReturnType<typeof makeTrackingCalendarStyles>;

type Props = {
  today: string;
  anchor: string;
  range: CalendarViewRange;
  source: CalendarSourceId | null;
  selectedDate: string;
  enabledTrackers: TrackerId[];
  data: TrackingCalendarData;
  loading?: boolean;
  sourceOptions?: CalendarSourceMeta[];
  hideOverviewHint?: boolean;
  onAnchorChange: (date: string) => void;
  onRangeChange: (range: CalendarViewRange) => void;
  onSourceChange: (source: CalendarSourceId) => void;
  onSelectDate: (date: string) => void;
};

function EventPill({
  event,
  pillBase,
}: {
  event: TrackingCalendarEvent;
  pillBase: CalendarUiStyles['eventPill'];
}) {
  const { colors, isDark } = useTheme();
  const tone = eventToneStyle(event.tone, colors, isDark);
  return (
    <Text style={[pillBase, { backgroundColor: tone.bg, color: tone.text }]} numberOfLines={1}>
      {event.label}
    </Text>
  );
}

function DayMarkers({
  cell,
  detailed,
  styles,
}: {
  cell?: TrackingCalendarCell;
  detailed: boolean;
  styles: CalendarUiStyles;
}) {
  const events = cell?.events ?? [];
  const markers = cell?.markers ?? [];
  if (!detailed) {
    return (
      <View style={styles.markers}>
        {markers.includes('heart') ? <Text style={styles.heart}>♥</Text> : null}
        {markers.includes('dot') ? <View style={styles.symptomDot} /> : null}
      </View>
    );
  }
  const visible = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflow = events.length - visible.length;
  return (
    <View style={styles.eventList}>
      {visible.map((event) => (
        <EventPill key={event.id} event={event} pillBase={styles.eventPill} />
      ))}
      {overflow > 0 ? <Text style={styles.eventMore}>+{overflow} more</Text> : null}
    </View>
  );
}

function DayCell({
  date,
  label,
  cell,
  selected,
  isToday,
  variant,
  detailed = false,
  onPress,
  styles,
  colors,
  isDark,
  weekdayLabel,
}: {
  date: string;
  label: string;
  cell?: TrackingCalendarCell;
  selected: boolean;
  isToday: boolean;
  variant: 'month' | 'week' | 'day' | 'compact';
  detailed?: boolean;
  onPress: () => void;
  styles: CalendarUiStyles;
  colors: ColorPalette;
  isDark: boolean;
  weekdayLabel?: string;
}) {
  const extra = cell ? cellStylesFromClassNames(cell.classNames, colors, isDark) : [];
  const showDetailed = detailed || variant === 'day' || variant === 'week';
  const isLoggedPeriod = cell?.classNames.includes('logged-period') ?? false;
  const isPredictedPeriod = cell?.classNames.includes('predicted-period') ?? false;
  const useBadge = variant === 'month' || variant === 'compact' || variant === 'week';
  const badgeActive = selected || isToday;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayBase,
        variant === 'month' && styles.dayMonth,
        variant === 'month' && showDetailed && styles.dayMonthDetailed,
        variant === 'week' && styles.dayWeek,
        variant === 'day' && styles.dayFocus,
        variant === 'compact' && styles.dayCompact,
        ...extra,
        // Keep period/phase fills; don't replace with a flat "today" wash.
        isToday &&
          !selected &&
          !isLoggedPeriod &&
          !isPredictedPeriod &&
          !useBadge &&
          styles.dayToday,
      ]}
    >
      {weekdayLabel ? <Text style={styles.weekdayOverCell}>{weekdayLabel}</Text> : null}
      {useBadge ? (
        <View
          style={[
            styles.dayNumBadge,
            variant === 'compact' && styles.dayNumBadgeCompact,
            isToday && !selected && styles.dayNumBadgeToday,
            selected && styles.dayNumBadgeSelected,
          ]}
        >
          <Text
            style={[
              styles.dayNum,
              variant === 'compact' && styles.dayNumCompact,
              (selected || isToday) && styles.dayNumOnBadge,
            ]}
          >
            {label}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.dayNum,
            selected && styles.dayNumSelected,
            badgeActive && styles.dayNumOnBadge,
          ]}
        >
          {label}
        </Text>
      )}
      {variant !== 'compact' ? (
        <DayMarkers cell={cell} detailed={showDetailed} styles={styles} />
      ) : (
        <View style={styles.markers}>
          {(cell?.markers ?? []).includes('dot') ? (
            <View style={styles.symptomDot} />
          ) : null}
          {(cell?.markers ?? []).includes('heart') ? (
            <Text style={styles.heartCompact}>♥</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function MonthGrid({
  year,
  month,
  dates,
  cells,
  selectedDate,
  today,
  detailed,
  compact,
  showTitle,
  onSelectDate,
  styles,
  colors,
  isDark,
}: {
  year: number;
  month: number;
  dates: string[];
  cells: Map<string, TrackingCalendarCell>;
  selectedDate: string;
  today: string;
  detailed: boolean;
  compact: boolean;
  showTitle: boolean;
  onSelectDate: (date: string) => void;
  styles: CalendarUiStyles;
  colors: ColorPalette;
  isDark: boolean;
}) {
  // Local midnight of the 1st — same weekday math as the rest of the calendar.
  const firstDow = new Date(year, month - 1, 1).getDay();
  const gridCells: ({ date: string; label: string } | null)[] = [];
  for (let i = 0; i < firstDow; i++) gridCells.push(null);
  for (const date of dates) {
    gridCells.push({ date, label: String(parseInt(date.slice(8), 10)) });
  }
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const weeks: (typeof gridCells)[] = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  const title = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: compact ? 'short' : 'long',
    year: compact ? 'numeric' : undefined,
  });
  const headers = WEEKDAYS_SHORT;

  return (
    <View style={[styles.month, compact && styles.monthCompact, !compact && styles.monthSpacious]}>
      {showTitle ? (
        <Text style={[styles.monthTitle, !compact && styles.monthTitleLarge]}>{title}</Text>
      ) : null}
      <View style={styles.weekRow}>
        {headers.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.weekday, compact && styles.weekdayCompact]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.monthWeeks}>
        {weeks.map((week, wi) => (
          <View key={`week-${wi}`} style={styles.weekRow}>
            {week.map((cell, i) =>
              cell?.date ? (
                <DayCell
                  key={cell.date}
                  date={cell.date}
                  label={cell.label}
                  cell={cells.get(cell.date)}
                  selected={cell.date === selectedDate}
                  isToday={cell.date === today}
                  variant={compact ? 'compact' : 'month'}
                  detailed={!compact && detailed}
                  onPress={() => onSelectDate(cell.date)}
                  styles={styles}
                  colors={colors}
                  isDark={isDark}
                />
              ) : (
                <View
                  key={`pad-${wi}-${i}`}
                  style={[
                    styles.dayEmpty,
                    compact && styles.dayEmptyCompact,
                    !compact && detailed && styles.dayEmptyDetailed,
                  ]}
                />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function StripLayout({
  dates,
  cells,
  selectedDate,
  today,
  range,
  onSelectDate,
  styles,
  colors,
  isDark,
}: {
  dates: string[];
  cells: Map<string, TrackingCalendarCell>;
  selectedDate: string;
  today: string;
  range: CalendarViewRange;
  onSelectDate: (date: string) => void;
  styles: CalendarUiStyles;
  colors: ColorPalette;
  isDark: boolean;
}) {
  if (range === 'day') {
    const date = dates[0];
    if (!date) return null;
    const d = new Date(`${date}T12:00:00`);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    return (
      <View style={styles.focusWrap}>
        <DayCell
          date={date}
          label={String(d.getDate())}
          cell={cells.get(date)}
          selected={date === selectedDate}
          isToday={date === today}
          variant="day"
          weekdayLabel={weekday}
          onPress={() => onSelectDate(date)}
          styles={styles}
          colors={colors}
          isDark={isDark}
        />
      </View>
    );
  }

  // week / 4day — equal columns in one row
  return (
    <View>
      <View style={styles.weekdayRow}>
        {dates.map((date) => {
          const d = new Date(`${date}T12:00:00`);
          return (
            <Text key={`h-${date}`} style={styles.weekday}>
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </Text>
          );
        })}
      </View>
      <View style={styles.stripRow}>
        {dates.map((date) => {
          const d = new Date(`${date}T12:00:00`);
          return (
            <DayCell
              key={date}
              date={date}
              label={String(d.getDate())}
              cell={cells.get(date)}
              selected={date === selectedDate}
              isToday={date === today}
              variant="week"
              onPress={() => onSelectDate(date)}
              styles={styles}
              colors={colors}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

export function TrackingCalendar({
  today,
  anchor,
  range,
  source,
  selectedDate,
  enabledTrackers,
  data,
  loading = false,
  sourceOptions: sourceOptionsOverride,
  hideOverviewHint = false,
  onAnchorChange,
  onRangeChange,
  onSourceChange,
  onSelectDate,
}: Props) {
  const { colors, isDark } = useTheme();
  const track = useTrackingStyles();
  const styles = useThemedStyles(makeTrackingCalendarStyles);
  const window = useMemo(() => getCalendarWindow(anchor, range), [anchor, range]);
  const sourceOptions = useMemo(
    () => sourceOptionsOverride ?? calendarSourceOptions(enabledTrackers),
    [sourceOptionsOverride, enabledTrackers],
  );
  const activeSource = sourceOptions.find((o) => o.id === source);
  const showGrid = !loading && activeSource?.support === 'full';
  const showPlannedHint = !loading && activeSource?.support === 'planned';
  const isOverview = source === CALENDAR_SOURCE_ALL;
  const detailedMonth =
    !window.isStripLayout && window.months.length === 1 && (isOverview || range === 'month');
  const isMultiMonth = window.months.length > 1;
  const multiMonthCompact = window.months.length >= 6;

  const rangeOptions = CALENDAR_RANGE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const sourceSelectOptions = sourceOptions.map((meta: CalendarSourceMeta) => ({
    value: meta.id,
    label: meta.support === 'full' ? meta.label : `${meta.label} (coming soon)`,
    disabled: meta.support !== 'full',
  }));

  return (
    <View style={styles.hub}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, -1))}
          hitSlop={8}
        >
          <Text style={styles.navArrow}>←</Text>
        </Pressable>
        <View style={styles.toolbarCenter}>
          <SelectField
            label="View"
            value={range}
            options={rangeOptions}
            onChange={(v) => onRangeChange(v as CalendarViewRange)}
          />
          {sourceOptions.length > 1 && source ? (
            <SelectField
              label="Show"
              value={source}
              options={sourceSelectOptions}
              onChange={(v) => onSourceChange(v as CalendarSourceId)}
            />
          ) : null}
          <Text style={styles.windowTitle}>{window.title}</Text>
          {anchor !== today ? (
            <Pressable onPress={() => onAnchorChange(today)} style={styles.todayJump}>
              <Text style={styles.todayJumpText}>Today</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, 1))}
          hitSlop={8}
        >
          <Text style={styles.navArrow}>→</Text>
        </Pressable>
      </View>

      {isOverview && !loading && !hideOverviewHint ? (
        <Text style={track.hint}>
          Birds-eye view — every enabled tracker on one calendar. Tap a day for details below.
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.accent} />
      ) : null}

      {!loading && data.legend.length > 0 ? (
        <TrackingCalendarLegend items={data.legend} />
      ) : null}

      {showPlannedHint && data.emptyMessage ? (
        <Text style={track.hint}>{data.emptyMessage}</Text>
      ) : null}

      {showGrid ? (
        window.isStripLayout ? (
          <StripLayout
            dates={window.dates}
            cells={data.cells}
            selectedDate={selectedDate}
            today={today}
            range={range}
            onSelectDate={onSelectDate}
            styles={styles}
            colors={colors}
            isDark={isDark}
          />
        ) : window.months.length === 1 ? (
          <MonthGrid
            year={window.months[0].year}
            month={window.months[0].month}
            dates={window.months[0].dates}
            cells={data.cells}
            selectedDate={selectedDate}
            today={today}
            detailed={detailedMonth}
            compact={false}
            showTitle={false}
            onSelectDate={onSelectDate}
            styles={styles}
            colors={colors}
            isDark={isDark}
          />
        ) : (
          <View
            style={[
              styles.multiMonth,
              multiMonthCompact && styles.multiMonthGrid,
            ]}
          >
            {window.months.map((block) => (
              <View
                key={`${block.year}-${block.month}`}
                style={multiMonthCompact ? styles.miniMonthSlot : undefined}
              >
                <MonthGrid
                  year={block.year}
                  month={block.month}
                  dates={block.dates}
                  cells={data.cells}
                  selectedDate={selectedDate}
                  today={today}
                  detailed={false}
                  compact={isMultiMonth}
                  showTitle
                  onSelectDate={onSelectDate}
                  styles={styles}
                  colors={colors}
                  isDark={isDark}
                />
              </View>
            ))}
          </View>
        )
      ) : null}

      {data.footer ? <View style={{ marginTop: spacing.sm }}>{data.footer}</View> : null}
    </View>
  );
}

function makeTrackingCalendarStyles(colors: ColorPalette) {
  return {
    hub: {
      marginVertical: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
    },
    toolbar: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing.sm,
    },
    toolbarCenter: { flex: 1 },
    navArrow: { fontSize: 22, paddingVertical: 8, paddingHorizontal: 4, color: colors.text },
    windowTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginTop: spacing.sm,
    },
    todayJump: {
      alignSelf: 'center' as const,
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radii.md,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    todayJumpText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.accent,
    },
    focusWrap: { marginTop: spacing.sm },
    stripRow: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    multiMonth: { gap: spacing.md, marginTop: spacing.sm },
    multiMonthGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      justifyContent: 'space-between' as const,
    },
    miniMonthSlot: {
      width: '48%' as const,
    },
    month: { marginBottom: spacing.sm },
    monthSpacious: { marginTop: spacing.xs },
    monthCompact: { marginBottom: 0 },
    monthTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 6,
    },
    monthTitleLarge: {
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
      marginBottom: 6,
    },
    weekdayRow: { flexDirection: 'row' as const, marginBottom: 4, gap: 4 },
    weekday: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      textAlign: 'center' as const,
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textMuted,
    },
    weekdayCompact: { fontSize: 9 },
    weekdayOverCell: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textMuted,
      marginBottom: 4,
    },
    monthWeeks: { gap: 3, width: '100%' as const },
    weekRow: {
      flexDirection: 'row' as const,
      flexWrap: 'nowrap' as const,
      alignItems: 'stretch' as const,
      width: '100%' as const,
      gap: 3,
    },
    dayBase: {
      borderWidth: 0,
      borderColor: 'transparent',
      padding: 3,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      backgroundColor: colors.bg,
      borderRadius: 8,
    },
    dayMonth: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 44,
    },
    dayMonthDetailed: {
      minHeight: 72,
      alignItems: 'stretch' as const,
      paddingTop: 5,
      paddingHorizontal: 3,
      paddingBottom: 4,
    },
    dayWeek: {
      flex: 1,
      minHeight: 100,
      borderRadius: 12,
    },
    dayFocus: {
      width: '100%' as const,
      minHeight: 160,
      padding: spacing.md,
      alignItems: 'flex-start' as const,
      borderRadius: 12,
    },
    dayCompact: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      aspectRatio: 1,
      padding: 2,
      borderRadius: 8,
      minHeight: 0,
    },
    dayEmpty: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 44,
    },
    dayEmptyDetailed: {
      minHeight: 72,
    },
    dayEmptyCompact: {
      aspectRatio: 1,
      minHeight: 0,
    },
    dayToday: { backgroundColor: colors.surface },
    dayNumBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      alignSelf: 'center' as const,
      marginBottom: 4,
    },
    dayNumBadgeCompact: {
      width: 18,
      height: 18,
      borderRadius: 9,
      marginBottom: 0,
    },
    dayNumBadgeToday: {
      backgroundColor: '#e11d48',
    },
    dayNumBadgeSelected: {
      backgroundColor: colors.accent,
    },
    // When both today + selected, selected wins via style order in DayCell.
    dayNum: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    dayNumCompact: { fontSize: 10 },
    dayNumSelected: { color: colors.accent },
    dayNumOnBadge: {
      color: '#ffffff',
      fontWeight: '700' as const,
    },
    markers: {
      flexDirection: 'row' as const,
      gap: 2,
      marginTop: 2,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
    },
    heart: { fontSize: 10, color: colors.brandCrimson },
    heartCompact: { fontSize: 7, color: colors.brandCrimson },
    symptomDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.partial,
    },
    eventList: { width: '100%' as const, marginTop: 4, gap: 3 },
    eventPill: {
      fontSize: 10,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden' as const,
    },
    eventMore: { fontSize: 10, color: colors.textMuted },
  };
}
