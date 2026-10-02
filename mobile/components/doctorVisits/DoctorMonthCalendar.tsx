import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { CALENDAR_RANGE_OPTIONS, getCalendarWindow, shiftCalendarAnchor } from '../../lib/tracking/calendarRange';
import type { TrackingCalendarData } from '../../lib/tracking/calendarTypes';
import { CalendarMenu } from '../tracking/CalendarMenu';
import { eventToneStyle } from '../tracking/calendarCellStyles';

export type DoctorCalendarRange = 'month' | '3month' | '6month' | '12month';

type Props = {
  range: DoctorCalendarRange;
  onRangeChange: (range: DoctorCalendarRange) => void;
  anchor: string;
  today: string;
  selectedDate: string;
  data: TrackingCalendarData;
  loading: boolean;
  onAnchorChange: (date: string) => void;
  onSelectDate: (date: string) => void;
};

export function DoctorMonthCalendar({ anchor, today, range, onRangeChange, selectedDate, data, loading, onAnchorChange, onSelectDate }: Props) {
  const { colors, isDark } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [agenda, setAgenda] = useState(false);
  const window = getCalendarWindow(anchor, range);
  const month = new Date(`${window.start}T12:00:00`);
  const eventDates = window.dates.filter((date) => data.cells.get(date)?.events.length);

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <View style={s.navigation}>
          <Pressable style={s.control} onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, -1))} accessibilityRole="button" accessibilityLabel="Previous calendar range"><Text style={s.controlText}>‹</Text></Pressable>
          <Text style={s.year}>{month.getFullYear()}</Text>
          <Pressable style={s.control} onPress={() => onAnchorChange(shiftCalendarAnchor(anchor, range, 1))} accessibilityRole="button" accessibilityLabel="Next calendar range"><Text style={s.controlText}>›</Text></Pressable>
        </View>
        <View style={s.navigation}>
          <Pressable style={s.control} onPress={() => setAgenda((v) => !v)} accessibilityRole="button" accessibilityLabel={agenda ? 'Show calendar grid' : 'Show calendar agenda'}><Text style={s.toggleText}>{agenda ? 'Grid' : 'List'}</Text></Pressable>
        </View>
      </View>
      <View style={s.rangeRow}><CalendarMenu title="Calendar view" value={range} options={CALENDAR_RANGE_OPTIONS.filter((option) => ['month', '3month', '6month', '12month'].includes(option.value))} onChange={(value) => onRangeChange(value as DoctorCalendarRange)} /></View>
      <View style={s.headingRow}>
        <Text style={s.month} accessibilityRole="header">{range === 'month' ? month.toLocaleDateString(undefined, { month: 'long' }) : window.title}</Text>
        {loading ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading appointments" /> : null}
      </View>
      {agenda ? (
        <View style={s.agenda}>
          {!loading && !eventDates.length ? <Text style={s.muted}>No appointments in this range. Tap + to add one.</Text> : null}
          {(!loading ? eventDates : []).map((date) => (
            <Pressable key={date} style={s.agendaDay} onPress={() => onSelectDate(date)} accessibilityRole="button">
              <Text style={s.agendaDate}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              <View style={{ flex: 1, gap: 6 }}>{data.cells.get(date)?.events.map((event) => {
                const tone = eventToneStyle(event.tone, colors, isDark);
                return <Text key={event.id} style={[s.agendaEvent, { color: tone.text, borderLeftColor: tone.text, backgroundColor: tone.bg }]}>{event.label}</Text>;
              })}</View>
            </Pressable>
          ))}
        </View>
      ) : window.months.map((block) => {
        const first = new Date(block.year, block.month - 1, 1);
        const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...block.dates];
        while (cells.length % 7) cells.push(null);
        const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
        return <View key={`${block.year}-${block.month}`} style={s.monthBlock}>
          {window.months.length > 1 ? <Text style={s.blockTitle} accessibilityRole="header">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text> : null}
          <View style={s.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => <Text key={i} style={s.weekday}>{label}</Text>)}</View>
          {weeks.map((week, i) => (
            <View key={i} style={s.week}>
              {week.map((date, dayIndex) => {
                if (!date) return <View key={dayIndex} style={s.day} />;
                const events = loading ? [] : data.cells.get(date)?.events ?? [];
                const isToday = date === today;
                const selected = date === selectedDate;
                return (
                  <Pressable key={date} style={s.day} onPress={() => onSelectDate(date)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${date}${isToday ? ', today' : ''}. ${events.map((e) => e.label).join('. ') || 'No appointments'}`}>
                    <View style={[s.dateCircle, isToday && { backgroundColor: colors.accentRed }, selected && { borderColor: colors.text }]}>
                      <Text style={[s.dateText, (dayIndex === 0 || dayIndex === 6) && { color: colors.textMuted }, isToday && { color: colors.onAccent }]}>{Number(date.slice(8))}</Text>
                    </View>
                    {events.slice(0, 3).map((event) => {
                      const tone = eventToneStyle(event.tone, colors, isDark);
                      return <Text key={event.id} numberOfLines={1} style={[s.event, { backgroundColor: tone.bg, color: tone.text }]}>{event.label}</Text>;
                    })}
                    {events.length > 3 ? <Text style={s.more}>+{events.length - 3} more</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>;
      })}
      <View style={s.footer}>
        <Pressable style={s.today} onPress={() => { onAnchorChange(today); onSelectDate(today); }} accessibilityRole="button"><Text style={s.todayText}>Today</Text></Pressable>
        <Text style={s.hint}>Select a day, then tap + to add a visit</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    rangeRow: { alignItems: 'flex-start' as const }, monthBlock: { gap: 8, marginBottom: 16 }, blockTitle: { fontFamily: fonts.heading, fontSize: 22, color: c.text },
    container: { gap: 12 }, toolbar: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8 },
    navigation: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 28, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 4 },
    control: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
    controlText: { fontSize: 30, color: c.text }, toggleText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.text }, year: { fontFamily: fonts.bodyMedium, fontSize: 17, color: c.text },
    headingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 8 },
    month: { flex: 1, fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, color: c.text },
    weekdays: { flexDirection: 'row' as const }, weekday: { flex: 1, textAlign: 'center' as const, fontFamily: fonts.bodySemibold, fontSize: 12, color: c.textMuted },
    week: { flexDirection: 'row' as const, borderTopWidth: 1, borderColor: c.border, paddingTop: 8, minHeight: 98 },
    day: { flex: 1, minWidth: 0, gap: 3, paddingHorizontal: 1, paddingBottom: 8 },
    dateCircle: { alignSelf: 'center' as const, minWidth: 34, minHeight: 34, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 4 },
    dateText: { fontFamily: fonts.bodySemibold, fontSize: 18, color: c.text },
    event: { fontFamily: fonts.bodyMedium, fontSize: 10, borderRadius: 5, paddingHorizontal: 3, paddingVertical: 2 }, more: { fontSize: 9, color: c.textMuted },
    footer: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12 },
    today: { minHeight: 44, paddingHorizontal: 22, justifyContent: 'center' as const, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    todayText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text }, hint: { flexShrink: 1, fontSize: 12, color: c.textMuted },
    agenda: { minHeight: 180, gap: 12 }, muted: { color: c.textMuted, lineHeight: 22 },
    agendaDay: { flexDirection: 'row' as const, gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: c.border },
    agendaDate: { width: 72, color: c.text, fontFamily: fonts.bodySemibold, fontSize: 14 },
    agendaEvent: { borderLeftWidth: 3, borderRadius: 6, padding: 10, fontFamily: fonts.bodyMedium, fontSize: 14 },
  };
}
