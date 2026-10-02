import { useMemo, useState } from 'react';
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
import { fonts, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { CalendarMenu } from './CalendarMenu';
import { cellStylesFromClassNames, eventToneStyle } from './calendarCellStyles';
import { TrackingCalendarLegend } from './TrackingCalendarLegend';
import { useTrackingStyles } from './trackingStyles';

const MAX_VISIBLE_EVENTS = 3;
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
  hideDaySummary?: boolean;
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
      {markers.includes('heart') || markers.includes('dot') ? <View style={styles.markers}>
        {markers.includes('heart') ? <Text style={styles.heart}>♥</Text> : null}
        {markers.includes('dot') ? <View style={styles.symptomDot} /> : null}
      </View> : null}
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
  const extra = cell ? cellStylesFromClassNames(cell.classNames.filter((name) => name !== 'is-future' && name !== 'weight-off-schedule'), colors, isDark) : [];
  const showDetailed = detailed || variant === 'day' || variant === 'week';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${date}${isToday ? ', today' : ''}. ${cell?.events.map((event) => event.label).join('. ') || 'No entries'}`}
      style={[
        styles.dayBase,
        variant === 'month' && styles.dayMonth,
        variant === 'month' && showDetailed && styles.dayMonthDetailed,
        variant === 'week' && styles.dayWeek,
        variant === 'day' && styles.dayFocus,
        variant === 'compact' && styles.dayCompact,
      ]}
    >
      {weekdayLabel ? <Text style={styles.weekdayOverCell}>{weekdayLabel}</Text> : null}
        <View
          style={[
            styles.dayNumBadge,
            variant === 'compact' && styles.dayNumBadgeCompact,
            isToday && styles.dayNumBadgeToday,
            selected && styles.dayNumBadgeSelected,
          ]}
        >
          <Text
            style={[
              styles.dayNum,
              variant === 'compact' && styles.dayNumCompact,
              isToday && styles.dayNumOnBadge,
            ]}
          >
            {label}
          </Text>
        </View>
      {extra.length ? <View style={[styles.statusBand, ...extra]} /> : null}
      {variant !== 'compact' ? (
        <DayMarkers cell={cell} detailed={showDetailed} styles={styles} />
      ) : (
        <View style={styles.markers}>
          {cell?.events.length && !cell.markers.length && !extra.length ? cell.events.slice(0, 3).map((event) => <View key={event.id} style={[styles.symptomDot, { backgroundColor: eventToneStyle(event.tone, colors, isDark).text }]} />) : null}
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
          <View key={`week-${wi}`} style={[styles.weekRow, !compact && styles.weekDivider]}>
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
  hideDaySummary = false,
  onAnchorChange,
  onRangeChange,
  onSourceChange,
  onSelectDate,
}: Props) {
  const { colors, isDark } = useTheme();
  const track = useTrackingStyles();
  const styles = useThemedStyles(makeTrackingCalendarStyles);
  const [showLegend, setShowLegend] = useState(false);
  const window = useMemo(() => getCalendarWindow(anchor, range), [anchor, range]);
  const sourceOptions = useMemo(
    () => sourceOptionsOverride ?? calendarSourceOptions(enabledTrackers),
    [sourceOptionsOverride, enabledTrackers],
  );
  const activeSource = sourceOptions.find((o) => o.id === source);
  const showGrid = activeSource?.support === 'full';
  const visibleCells = loading ? new Map<string, TrackingCalendarCell>() : data.cells;
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
        <View style={styles.navigation}>
          <Pressable style={styles.navButton} onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, -1))} accessibilityRole="button" accessibilityLabel="Previous calendar range"><Text style={styles.navArrow}>‹</Text></Pressable>
          <Text style={styles.year}>{anchor.slice(0, 4)}</Text>
          <Pressable style={styles.navButton} onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, 1))} accessibilityRole="button" accessibilityLabel="Next calendar range"><Text style={styles.navArrow}>›</Text></Pressable>
        </View>
        <CalendarMenu title="Calendar view" value={range} options={rangeOptions} onChange={(v) => onRangeChange(v as CalendarViewRange)} />
      </View>
      {sourceOptions.length > 1 && source ? <View style={styles.sourceRow}>
        <CalendarMenu title="Show tracker" value={source} options={sourceSelectOptions} onChange={(v) => onSourceChange(v as CalendarSourceId)} />
      </View> : null}
      <View style={styles.headingRow}>
        <Text style={styles.windowTitle} accessibilityRole="header">{range === 'month' ? new Date(`${anchor}T12:00:00`).toLocaleDateString(undefined, { month: 'long' }) : window.title}</Text>
        {loading ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading calendar" /> : null}
      </View>

      {isOverview && !loading && !hideOverviewHint ? (
        <Text style={track.hint}>
          Birds-eye view — every enabled tracker on one calendar. Tap a day for details below.
        </Text>
      ) : null}

      {showPlannedHint && data.emptyMessage ? (
        <Text style={track.hint}>{data.emptyMessage}</Text>
      ) : null}

      {showGrid ? (
        window.isStripLayout ? (
          <StripLayout
            dates={window.dates}
            cells={visibleCells}
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
            cells={visibleCells}
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
                  cells={visibleCells}
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

      <View style={styles.footerRow}>
        <Pressable onPress={() => { onAnchorChange(today); onSelectDate(today); }} style={styles.todayJump} accessibilityRole="button"><Text style={styles.todayJumpText}>Today</Text></Pressable>
        {!loading && data.legend.length ? <Pressable onPress={() => setShowLegend((value) => !value)} style={styles.keyButton} accessibilityRole="button" accessibilityState={{ expanded: showLegend }}><Text style={styles.todayJumpText}>Calendar key {showLegend ? '−' : '+'}</Text></Pressable> : null}
      </View>
      {showLegend && !loading ? <TrackingCalendarLegend items={data.legend} /> : null}
      {!hideDaySummary && showGrid && !loading && window.dates.includes(selectedDate) ? <View style={styles.selectedDay}>
        <Text style={styles.selectedTitle}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        {data.cells.get(selectedDate)?.events.length ? data.cells.get(selectedDate)!.events.map((event) => {
          const tone = eventToneStyle(event.tone, colors, isDark);
          return <View key={event.id} style={styles.detailRow}><View style={[styles.detailMarker, { backgroundColor: tone.text }]} /><Text style={styles.detailText}>{event.label}</Text></View>;
        }) : <Text style={track.hint}>No entries for this day.</Text>}
      </View> : null}

      {!loading && data.footer ? <View style={{ marginTop: spacing.sm }}>{data.footer}</View> : null}
    </View>
  );
}

function makeTrackingCalendarStyles(colors: ColorPalette) {
  return {
    hub: { marginVertical: spacing.md, gap: 14 },
    toolbar: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
    navigation: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 24, backgroundColor: colors.surface },
    navButton: { minWidth: 44, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
    navArrow: { fontSize: 28, color: colors.text }, year: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
    sourceRow: { alignItems: 'flex-start' as const }, headingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    windowTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 30, letterSpacing: -0.8, color: colors.text, paddingVertical: 4 },
    footerRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: 8 },
    todayJump: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' as const, borderRadius: 24, backgroundColor: colors.surface },
    keyButton: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' as const },
    todayJumpText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.accent },
    focusWrap: { marginTop: spacing.sm }, stripRow: { flexDirection: 'row' as const, borderTopWidth: 1, borderColor: colors.border },
    multiMonth: { gap: 24 }, multiMonthGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, justifyContent: 'space-between' as const },
    miniMonthSlot: { width: '100%' as const },
    month: { gap: 8 }, monthSpacious: {}, monthCompact: {},
    monthTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text }, monthTitleLarge: { fontSize: 24 },
    weekdayRow: { flexDirection: 'row' as const, marginBottom: 8 },
    weekday: { flex: 1, minWidth: 0, textAlign: 'center' as const, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    weekdayCompact: { fontSize: 11 }, weekdayOverCell: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
    monthWeeks: { width: '100%' as const },
    weekRow: { flexDirection: 'row' as const, alignItems: 'stretch' as const, width: '100%' as const },
    weekDivider: { borderTopWidth: 1, borderColor: colors.border },
    dayBase: { padding: 2, paddingTop: 8, paddingBottom: 8, alignItems: 'center' as const },
    dayMonth: { flex: 1, minWidth: 0, minHeight: 84 },
    dayMonthDetailed: { alignItems: 'stretch' as const },
    dayWeek: { flex: 1, minWidth: 0, minHeight: 120, alignItems: 'stretch' as const },
    dayFocus: { width: '100%' as const, minHeight: 120, alignItems: 'stretch' as const },
    dayCompact: { flex: 1, minWidth: 0, minHeight: 52 },
    dayEmpty: { flex: 1, minWidth: 0, minHeight: 84 }, dayEmptyDetailed: {}, dayEmptyCompact: { minHeight: 52 },
    dayNumBadge: { minWidth: 32, minHeight: 32, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' as const, justifyContent: 'center' as const, alignSelf: 'center' as const, marginBottom: 4 },
    dayNumBadgeCompact: { minWidth: 28, minHeight: 28, marginBottom: 0 },
    dayNumBadgeToday: { backgroundColor: colors.accentRed }, dayNumBadgeSelected: { borderColor: colors.text },
    dayNum: { fontFamily: fonts.bodySemibold, fontSize: 18, color: colors.text }, dayNumCompact: { fontSize: 13 },
    dayNumOnBadge: { color: colors.onAccent },
    statusBand: { height: 6, width: '80%' as const, alignSelf: 'center' as const, borderRadius: 3 },
    markers: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, marginTop: 2, flexWrap: 'wrap' as const, justifyContent: 'center' as const },
    heart: { fontSize: 10, color: colors.brandCrimson }, heartCompact: { fontSize: 9, color: colors.brandCrimson },
    symptomDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.partial },
    eventList: { width: '100%' as const, marginTop: 4, gap: 3 },
    eventPill: { fontFamily: fonts.bodyMedium, fontSize: 10, paddingHorizontal: 3, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' as const },
    eventMore: { fontSize: 10, color: colors.textMuted },
    selectedDay: { gap: 10, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
    selectedTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.text },
    detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 4 },
    detailMarker: { width: 3, minHeight: 20, alignSelf: 'stretch' as const, borderRadius: 2 },
    detailText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: colors.text },
  };
}
