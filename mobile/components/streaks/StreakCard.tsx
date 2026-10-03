import { Text, View } from 'react-native';
import { streakMessage, type StreakStats } from '../../lib/streaks';
import { getActiveStreakBadge, getDisplayStreakDays } from '../../lib/streakBadges';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { TulipBadgeIcon } from './TulipBadgeIcon';

export function StreakCard({ stats, loading }: { stats: StreakStats; loading?: boolean }) {
  const s = useThemedStyles(makeStyles);
  const current = getDisplayStreakDays(stats);
  const badge = getActiveStreakBadge(current);
  if (loading) return <Text style={s.hint}>Loading streak…</Text>;
  return (
    <View style={s.section}>
      <View style={s.hero}>
        <View style={s.summary}>
          <Text style={s.eyebrow}>CURRENT STREAK</Text>
          <Text style={s.value}>{current}<Text style={s.unit}> {current === 1 ? 'day' : 'days'}</Text></Text>
          <Text style={s.hint}>Personal best · {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}</Text>
        </View>
        <TulipBadgeIcon earned={current > 0} minDays={badge?.minDays ?? 1} size={96} />
      </View>
      <Text style={s.message}>{streakMessage(stats)}</Text>
      <View style={s.divider} />
      <Text style={s.title}>Last 7 days</Text>
      <View style={s.week}>
        {stats.last7Days.map((day) => {
          const date = new Date(`${day.date}T12:00:00`);
          return <View key={day.date} style={s.day} accessible accessibilityLabel={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}: ${day.perfect ? 'All scheduled doses logged' : 'Not complete'}`}>
            <Text style={s.weekday}>{date.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
            <View style={[s.dayCircle, day.perfect && s.complete]}><Text style={[s.dayMark, day.perfect && s.completeMark]}>{day.perfect ? '✓' : '–'}</Text></View>
            <Text style={s.weekday}>{date.getDate()}</Text>
          </View>;
        })}
      </View>
      {stats.hasMedications ? <Text style={s.hint}>
        Today · {stats.todayTaken} of {stats.todayExpected} scheduled doses logged{stats.todayComplete ? ' · Complete' : ''}
        {stats.todayExtraLogs > 0 ? `\n${stats.todayExtraLogs} additional log${stats.todayExtraLogs === 1 ? '' : 's'} outside today’s schedule` : ''}
      </Text> : null}
      <Text style={s.note}>A complete day means every scheduled dose was logged.</Text>
    </View>
  );
}
function makeStyles(c: ColorPalette) {
  return {
    section: { gap: 16 }, hero: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 }, summary: { flex: 1, gap: 8 },
    eyebrow: { fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 1.5, color: c.textMuted },
    value: { fontFamily: fonts.heading, fontSize: 48, color: c.text }, unit: { fontFamily: fonts.bodyRegular, fontSize: 20, color: c.textMuted },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 21, color: c.textMuted },
    message: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 24, color: c.text },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 4 }, title: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.text },
    week: { flexDirection: 'row' as const, gap: 4 }, day: { flex: 1, alignItems: 'center' as const, gap: 9 }, weekday: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    dayCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.border, justifyContent: 'center' as const, alignItems: 'center' as const },
    complete: { backgroundColor: c.accent, borderColor: c.accent }, dayMark: { fontSize: 16, color: c.textMuted }, completeMark: { color: c.onAccent },
    note: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 19, color: c.textMuted },
  };
}
