import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import type { StreakStats } from '../../lib/streaks';
import { PressableScale } from '../PressableScale';
import { DrawerIcon } from './DrawerIcon';

const RING = 58;
const STROKE = 6;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function weekdayLetter(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

function headline(stats: StreakStats): string {
  if (!stats.hasMedications) return 'Add your first medication';
  if (stats.todayExpected === 0) return 'Nothing scheduled today';
  const left = Math.max(stats.todayExpected - stats.todayTaken, 0);
  if (left === 0) return 'All done for today!';
  return `${left} dose${left === 1 ? '' : 's'} left today`;
}

/**
 * Glanceable progress at the top of the side menu: today's doses, the current
 * streak, and the last week, so opening the menu doubles as a quick check-in.
 */
export function DrawerTodayCard({
  stats,
  onPress,
}: {
  stats: StreakStats | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const taken = stats?.todayTaken ?? 0;
  const expected = stats?.todayExpected ?? 0;
  const ratio = expected > 0 ? Math.min(taken / expected, 1) : 0;
  const done = expected > 0 && taken >= expected;
  const streak = stats?.currentStreak ?? 0;

  return (
    <PressableScale
      onPress={onPress}
      haptic
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={
        stats ? `${headline(stats)}. ${streak} day streak. Open Today.` : 'Open Today'
      }
      style={styles.shadow}
    >
      <LinearGradient
        colors={
          done
            ? [colors.accentGreen, colors.accentBlue]
            : [colors.accentPurple, colors.accentBlue]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={styles.ring}>
            <Svg width={RING} height={RING}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={STROKE}
                fill="none"
              />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RADIUS}
                stroke="#ffffff"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <Text style={styles.ringText}>
              {expected > 0 ? `${taken}/${expected}` : '—'}
            </Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.headline} numberOfLines={2}>
              {stats ? headline(stats) : 'Loading…'}
            </Text>
            <View style={styles.streakPill}>
              <DrawerIcon name="streaks" color="#ffffff" size={13} strokeWidth={2.4} />
              <Text style={styles.streakText}>
                {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
              </Text>
            </View>
          </View>
        </View>

        {stats && stats.last7Days.length > 0 ? (
          <View style={styles.week}>
            {stats.last7Days.map((day) => (
              <View key={day.date} style={styles.day}>
                <View style={[styles.dot, day.perfect && styles.dotPerfect]} />
                <Text style={styles.dayLabel}>{weekdayLetter(day.date)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    shadowColor: '#6d4a8a',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ring: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    position: 'absolute',
    fontFamily: fonts.heading,
    fontSize: 15,
    color: '#ffffff',
  },
  body: { flex: 1, gap: 4 },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.8)',
  },
  headline: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: '#ffffff',
  },
  streakPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  streakText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: '#ffffff',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  day: { alignItems: 'center', gap: 4 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  dotPerfect: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  dayLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
});
