import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DrawerContentScrollView,
  useDrawerProgress,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from 'expo-router/build/react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import Constants from 'expo-constants';
import type { ColorPalette } from '../../constants/theme';
import { accentBgKey, fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useDemoTourTargets } from '../../context/DemoTourTargetsContext';
import { useAuth } from '../../hooks/useAuth';
import { useVault } from '../../hooks/useVault';
import { tapFeedback } from '../../lib/haptics';
import { getDisplayName } from '../../lib/profile';
import { routes } from '../../lib/routes';
import { fetchStreakStats, type StreakStats } from '../../lib/streaks';
import { PressableScale } from '../PressableScale';
import { ProfileAvatar } from '../ProfileAvatar';
import { DrawerIcon } from './DrawerIcon';
import { DrawerTodayCard } from './DrawerTodayCard';
import { DRAWER_SECTIONS, type DrawerNavEntry } from './drawerNav';

const STATS_MAX_AGE_MS = 15_000;
/** Roughly how long the drawer spring takes to settle. */
const OPEN_SETTLE_MS = 400;

function sameStats(a: StreakStats | null, b: StreakStats): boolean {
  return Boolean(
    a &&
      a.todayTaken === b.todayTaken &&
      a.todayExpected === b.todayExpected &&
      a.currentStreak === b.currentStreak &&
      a.hasMedications === b.hasMedications &&
      a.last7Days.every((d, i) => d.date === b.last7Days[i]?.date && d.perfect === b.last7Days[i]?.perfect),
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function NavRow({
  item,
  focused,
  badge,
  index,
  colors,
  styles,
  onPress,
}: {
  item: DrawerNavEntry;
  focused: boolean;
  badge?: string | null;
  index: number;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const accent = colors[item.accent];
  const accentBg = colors[accentBgKey(item.accent)];
  const progress = useDrawerProgress();
  const reducedMotion = useReducedMotion();
  // Rows slide in with the drawer itself, staggered, entirely on the UI thread.
  // Nothing re-renders or remounts when the menu opens, so the slide stays smooth.
  const start = Math.min(0.2 + index * 0.04, 0.6);
  const entrance = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    const t = interpolate(progress.value, [start, start + 0.4], [0, 1], Extrapolation.CLAMP);
    return { opacity: 0.35 + t * 0.65, transform: [{ translateX: (1 - t) * -18 }] };
  });

  return (
    <Animated.View style={entrance}>
      <PressableScale
        onPress={onPress}
        haptic
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={badge ? `${item.label}, ${badge}` : item.label}
        accessibilityState={{ selected: focused }}
        style={[styles.row, focused && { backgroundColor: accentBg }]}
      >
        {focused ? <View style={[styles.activeBar, { backgroundColor: accent }]} /> : null}
        <View style={[styles.iconTile, { backgroundColor: focused ? accent : accentBg }]}>
          <DrawerIcon name={item.icon} color={focused ? '#ffffff' : accent} size={18} />
        </View>
        <Text
          style={[styles.rowLabel, focused && { color: colors.text, fontFamily: fonts.bodyBold }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation, descriptors: _descriptors, ...scrollProps } = props;
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { lock: lockVault } = useVault();
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const lastFetch = useRef(0);
  const streaksRef = useRef<View>(null);
  const navRef = useRef<View>(null);
  const { registerTarget, unregisterTarget } = useDemoTourTargets();

  useEffect(() => {
    registerTarget('drawer-streaks', streaksRef);
    registerTarget('drawer-nav', navRef);
    return () => {
      unregisterTarget('drawer-streaks');
      unregisterTarget('drawer-nav');
    };
  }, [registerTarget, unregisterTarget]);

  // Refresh the progress card without competing with the open animation:
  // loading streaks reads and decrypts a year of dose logs on the JS thread,
  // so it runs once at start-up and then only after the menu has finished
  // opening, at most every 15 seconds.
  useEffect(() => {
    if (!user) return;
    if (lastFetch.current && drawerStatus !== 'open') return;
    if (Date.now() - lastFetch.current < STATS_MAX_AGE_MS) return;
    let active = true;
    let clearTimer = () => {};
    const task = InteractionManager.runAfterInteractions(() => {
      const timer = setTimeout(() => {
        fetchStreakStats(user.id)
          .then((next) => {
            if (!active) return;
            lastFetch.current = Date.now();
            setStats((prev) => (sameStats(prev, next) ? prev : next));
          })
          .catch(() => {});
      }, lastFetch.current ? OPEN_SETTLE_MS : 0);
      clearTimer = () => clearTimeout(timer);
    });
    return () => {
      active = false;
      task.cancel();
      clearTimer();
    };
  }, [drawerStatus, user]);

  const focusedRoute = state.routes[state.index]?.name;
  const dosesLeft = stats ? Math.max(stats.todayExpected - stats.todayTaken, 0) : 0;
  const badges: Record<string, string | null> = {
    today: dosesLeft > 0 ? `${dosesLeft} left` : null,
    streaks: stats && stats.currentStreak > 0 ? `${stats.currentStreak}d` : null,
  };

  function go(route: string) {
    navigation.navigate(route);
  }

  const firstName = getDisplayName(user)?.trim().split(/\s+/)[0];
  let rowIndex = 0;

  return (
    <DrawerContentScrollView
      {...scrollProps}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, spacing.md),
        paddingBottom: insets.bottom + spacing.md,
      }}
      style={{ backgroundColor: colors.bg }}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => go('account')}
          accessibilityRole="button"
          accessibilityLabel="Open my account"
          style={styles.headerUser}
        >
          <View style={[styles.avatarRing, { borderColor: colors.accentPurple }]}>
            <ProfileAvatar user={user} size="md" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting()}
              {firstName ? ',' : ''}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName ?? 'there'}
            </Text>
          </View>
        </Pressable>
        <PressableScale
          onPress={() => void setThemeMode(isDark ? 'light' : 'dark')}
          haptic
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={styles.themeButton}
        >
          <DrawerIcon
            name={isDark ? 'sun' : 'moon'}
            color={isDark ? colors.accentAmber : colors.accentPurple}
            size={18}
          />
        </PressableScale>
      </View>

      <DrawerTodayCard stats={stats} onPress={() => go('today')} />

      <View ref={navRef} collapsable={false}>
        {DRAWER_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => {
              const row = (
                <NavRow
                  item={item}
                  focused={focusedRoute === item.route}
                  badge={badges[item.route]}
                  index={rowIndex++}
                  colors={colors}
                  styles={styles}
                  onPress={() => go(item.route)}
                />
              );
              if (item.route === 'streaks') {
                return (
                  <View key={item.route} ref={streaksRef} collapsable={false}>
                    {row}
                  </View>
                );
              }
              return <View key={item.route}>{row}</View>;
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={async () => {
            tapFeedback();
            await lockVault();
            await signOut();
            navigation.closeDrawer();
            router.replace(routes.login);
          }}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <DrawerIcon name="signOut" color={colors.error} size={18} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.version}>Dr. Dose v{Constants.expoConfig?.version ?? ''}</Text>
      </View>
    </DrawerContentScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerUser: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarRing: {
      padding: 2,
      borderRadius: 999,
      borderWidth: 2,
    },
    headerText: { flex: 1 },
    greeting: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.text,
    },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    section: {
      marginTop: spacing.sm,
    },
    sectionTitle: {
      marginHorizontal: spacing.lg,
      marginBottom: 4,
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      letterSpacing: 1.4,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: spacing.sm,
      marginVertical: 1,
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
    },
    activeBar: {
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 2,
    },
    iconTile: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.textMuted,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    badgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: '#ffffff',
    },
    footer: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    signOut: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
    },
    signOutText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.error,
    },
    version: {
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.textMuted,
      opacity: 0.7,
    },
  });
}
