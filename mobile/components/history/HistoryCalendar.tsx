import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { lastNDays, todayLocalDate } from '../../lib/dates';
import { STREAK_CALENDAR_DAYS, type StreakCalendarDay } from '../../lib/streaks';

const STATUS = { perfect: { symbol: '✓', label: 'Complete' }, partial: { symbol: '◐', label: 'Partial' }, missed: { symbol: '○', label: 'Not completed' }, none: { symbol: '–', label: 'No schedule' } };

/** Neutral history grid: status is a small symbol, never a full tile of color. */
export function HistoryCalendar({ days, selectedDate, onSelectDate }: { days: StreakCalendarDay[]; selectedDate: string | null; onSelectDate: (date: string | null) => void }) {
  const s = useThemedStyles(makeStyles);
  const [showKey, setShowKey] = useState(false);
  const today = todayLocalDate();
  const dates = useMemo(() => lastNDays(STREAK_CALENDAR_DAYS).reverse(), [today]);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const cells: (string | null)[] = [...Array(new Date(`${dates[0]}T12:00:00`).getDay()).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const format = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return <View style={s.calendar}>
    <View style={s.header}><View style={{ flex: 1, gap: 5 }}><Text style={s.title}>Daily record</Text><Text style={s.hint}>{format(dates[0])} – {format(dates.at(-1)!)}</Text></View>
      <Pressable style={s.control} onPress={() => setShowKey((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showKey }}><Text style={s.link}>Key {showKey ? '−' : '+'}</Text></Pressable>
    </View>
    {showKey ? <View style={s.key}>{Object.values(STATUS).map((status) => <Text key={status.label} style={s.hint}>{status.symbol} {status.label}</Text>)}<Text style={s.hint}>↺ Marked late</Text></View> : null}
    <View style={s.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={index} style={s.weekday}>{day}</Text>)}</View>
    {weeks.map((week, index) => <View key={index} style={s.week}>{week.map((date, column) => {
      if (!date) return <View key={column} style={s.empty} />;
      const day = dayMap.get(date);
      const status = day?.status ?? 'none';
      const selected = selectedDate === date;
      const isToday = date === today;
      const tone = status === 'perfect' ? s.complete : status === 'partial' ? s.partial : s.muted;
      return <Pressable key={date} style={[s.day, selected && s.selected]} accessibilityRole="button" accessibilityState={{ selected }}
        accessibilityLabel={`${format(date)}${isToday ? ', today' : ''}. ${STATUS[status].label}${day?.redeemed ? '. Some doses marked late' : ''}`}
        onPress={() => onSelectDate(selected ? null : date)}>
        <Text style={[s.number, isToday && s.today]}>{Number(date.slice(8))}</Text>
        <Text style={[s.status, tone]}>{day?.redeemed ? '↺' : STATUS[status].symbol}</Text>
      </Pressable>;
    })}</View>)}
    <Text style={s.hint}>Select a day to review doses and your check-in.</Text>
  </View>;
}
function makeStyles(c: ColorPalette) {
  return {
    calendar: { gap: 10 }, header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 }, title: { fontFamily: fonts.heading, fontSize: 18, color: c.text }, hint: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: c.textMuted },
    control: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' as const }, link: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.accent }, key: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
    weekdays: { flexDirection: 'row' as const, marginTop: 8 }, weekday: { flex: 1, textAlign: 'center' as const, fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    week: { flexDirection: 'row' as const, borderTopWidth: 1, borderColor: c.border, paddingTop: 6, gap: 2 }, empty: { flex: 1 },
    day: { flex: 1, minWidth: 0, minHeight: 60, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 6, gap: 4, borderWidth: 1, borderColor: 'transparent', borderRadius: 12 },
    selected: { borderColor: c.accent, backgroundColor: c.surface }, number: { fontFamily: fonts.bodyMedium, fontSize: 16, color: c.text }, today: { color: c.accent, fontFamily: fonts.bodyBold },
    status: { fontSize: 15, fontFamily: fonts.bodySemibold }, complete: { color: c.successText }, partial: { color: c.partialText }, muted: { color: c.textMuted },
  };
}
