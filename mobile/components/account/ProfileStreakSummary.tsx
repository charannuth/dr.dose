import { StyleSheet, Text, View } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { useTheme } from '../../context/ThemeProvider';
import { getEarnedStreakBadges } from '../../lib/streakBadges';
import type { StreakStats } from '../../lib/streaks';
import { ProfileAvatar } from '../ProfileAvatar';
import { fonts, radii, spacing } from '../../constants/theme';

type Props = {
  user: User | null | undefined;
  displayName: string | undefined;
  email: string | undefined;
  stats: StreakStats;
};

export function ProfileStreakSummary({ user, displayName, email, stats }: Props) {
  const { colors } = useTheme();
  const earned = getEarnedStreakBadges(stats.longestStreak);
  const showRing = stats.currentStreak > 0 || earned.length > 0;
  const styles = makeStyles(colors);

  return (
    <View style={[styles.card, showRing && styles.cardGlow]}>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar user={user} displayName={displayName} email={email} size="lg" />
          {stats.currentStreak > 0 ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>×{stats.currentStreak}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.name}>{displayName?.trim() || 'Your profile'}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
          <Text style={styles.streakLine}>
            {earned.length === 0
              ? 'No badges yet — finish every dose today for your first tulip.'
              : `${earned.length} badge${earned.length === 1 ? '' : 's'} earned · longest ${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { paddingVertical: 16 },
    cardGlow: {},
    row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    avatarWrap: { position: 'relative' },
    pill: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    pillText: { color: colors.onAccent, fontWeight: '900', fontSize: 12 },
    textCol: { flex: 1, gap: 4 },
    name: { fontSize: 20, fontFamily: fonts.heading, color: colors.text },
    email: { fontSize: 14, color: colors.textMuted },
    streakLine: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  });
}
