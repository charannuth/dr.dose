import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/build/react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { DrDoseWordmark } from '../../components/DrDoseWordmark';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../hooks/useAuth';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { OnboardingModal } from '../../components/OnboardingModal';
import { DemoTour } from '../../components/DemoTour';
import { useDemoTourTargets } from '../../context/DemoTourTargetsContext';
import { setDemoTourDone, type DemoTourStep } from '../../lib/demoTour';
import { isOnboardingDone, setOnboardingDone } from '../../lib/settings';
import { routes } from '../../lib/routes';
import { fetchMedicationsWithStatus } from '../../lib/medications';
import { useReminderBootstrap } from '../../hooks/useReminderBootstrap';
import { useNotificationResponses } from '../../hooks/useNotificationResponses';
import { useTheme } from '../../context/ThemeProvider';

type DrawerContentProps = DrawerContentComponentProps & {
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
};

function Hamburger({
  onPress,
  styles,
}: {
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      style={styles.iconButton}
    >
      <Text style={styles.iconText}>≡</Text>
    </Pressable>
  );
}

function Plus({
  onPress,
  styles,
}: {
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add medication"
      style={[styles.iconButton, styles.plusButton]}
    >
      <Text style={[styles.iconText, styles.plusText]}>＋</Text>
    </Pressable>
  );
}

function HeaderTitle({
  pageTitle,
  styles,
}: {
  pageTitle: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.titleWrap}>
      <DrDoseWordmark />
      <Text style={styles.pageTitle}>{pageTitle}</Text>
    </View>
  );
}

function DrawerNavItem({
  label,
  focused,
  onPress,
  colors,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  colors: ColorPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      style={{
        marginHorizontal: spacing.sm,
        marginVertical: 2,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        backgroundColor: focused ? colors.pendingBg : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: focused ? ('700' as const) : ('500' as const),
          color: focused ? colors.accent : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DrawerContent(props: DrawerContentProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { styles, colors, state, navigation, descriptors, ...drawerProps } = props;
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

  return (
    <DrawerContentScrollView
      {...drawerProps}
      contentContainerStyle={[
        styles.drawerScroll,
        { paddingTop: Math.max(insets.top, spacing.md), paddingBottom: insets.bottom + spacing.md },
      ]}
      style={{ backgroundColor: styles.drawerBg.backgroundColor }}
    >
      <View style={styles.drawerHeader}>
        <ProfileAvatar user={user} size="lg" />
        <View style={styles.drawerUser}>
          <Text style={styles.drawerSignedIn}>Signed in</Text>
          <Text style={styles.drawerEmail} numberOfLines={1}>
            {user?.email ?? ''}
          </Text>
        </View>
      </View>

      <View ref={navRef} collapsable={false}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.drawerLabel ?? options.title ?? route.name;
          const focused = state.index === index;
          const item = (
            <DrawerNavItem
              label={String(label)}
              focused={focused}
              colors={colors}
              onPress={() => navigation.navigate(route.name)}
            />
          );

          if (route.name === 'streaks') {
            return (
              <View key={route.key} ref={streaksRef} collapsable={false}>
                {item}
              </View>
            );
          }

          return <View key={route.key}>{item}</View>;
        })}
      </View>

      <Pressable
        onPress={async () => {
          await signOut();
          navigation.closeDrawer();
          router.replace(routes.login);
        }}
        style={styles.signOutRow}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const { user, loading } = useAuth();

  // "/" resolves to this layout — never mount the native Drawer until signed in.
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href={routes.login} />;
  }

  return <DrawerLayoutInner user={user} />;
}

function DrawerLayoutInner({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { registerTarget, unregisterTarget } = useDemoTourTargets();
  const addMedRef = useRef<View>(null);
  const menuRef = useRef<View>(null);
  const drawerNavRef = useRef<{ openDrawer: () => void; closeDrawer: () => void } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [openAddAfterTour, setOpenAddAfterTour] = useState(false);

  useReminderBootstrap(user?.id);
  useNotificationResponses();

  useEffect(() => {
    registerTarget('add-medication', addMedRef);
    registerTarget('profile-menu', menuRef);
    return () => {
      unregisterTarget('add-medication');
      unregisterTarget('profile-menu');
    };
  }, [registerTarget, unregisterTarget]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void (async () => {
      const done = await isOnboardingDone(user.id);
      if (done) return;
      const meds = await fetchMedicationsWithStatus(user.id);
      if (!active) return;
      if (meds.length > 0) {
        await setOnboardingDone(user.id);
        await setDemoTourDone(user.id);
        return;
      }
      setShowOnboarding(true);
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  function startDemoTour(openAddOnFinish = false) {
    setOpenAddAfterTour(openAddOnFinish);
    setShowOnboarding(false);
    setShowDemoTour(true);
    router.navigate(routes.today);
  }

  function prepareTourStep(step: DemoTourStep) {
    if (step.drawer === 'open') {
      drawerNavRef.current?.openDrawer();
    } else {
      drawerNavRef.current?.closeDrawer();
    }
    if (step.drawer === 'closed') {
      router.navigate(routes.today);
    }
  }

  function finishDemoTour() {
    drawerNavRef.current?.closeDrawer();
    setShowDemoTour(false);
    if (openAddAfterTour) {
      setOpenAddAfterTour(false);
      router.push(routes.medicationNew);
    }
  }

  const titleByRoute: Record<string, string> = {
    today: 'Today',
    history: 'History',
    tracking: 'Tracking',
    wellness: 'Wellness',
    'doctor-visits': 'Doctor visits',
    streaks: 'Streaks',
    account: 'My account',
    'medical-records': 'Medical records',
    help: 'Help & safety',
  };

  return (
    <>
      {user && showOnboarding ? (
        <OnboardingModal
          userId={user.id}
          visible={showOnboarding}
          onDone={() => {
            void setDemoTourDone(user.id);
            setShowOnboarding(false);
          }}
          onStartTour={() => startDemoTour(false)}
          onAddMedication={() => startDemoTour(true)}
        />
      ) : null}
      {user && showDemoTour ? (
        <DemoTour
          active={showDemoTour}
          userId={user.id}
          onComplete={finishDemoTour}
          onPrepareStep={prepareTourStep}
        />
      ) : null}
      <Drawer
        drawerContent={(props) => {
          drawerNavRef.current = props.navigation;
          return <DrawerContent {...props} styles={styles} colors={colors} />;
        }}
        screenOptions={({ navigation, route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: true,
          headerTitleAlign: 'center',
          drawerStyle: { backgroundColor: colors.bg },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textMuted,
          drawerActiveBackgroundColor: colors.pendingBg,
          headerLeft: () => (
            <View ref={menuRef} collapsable={false}>
              <Hamburger onPress={() => navigation.toggleDrawer()} styles={styles} />
            </View>
          ),
          headerRight: () =>
            route.name === 'today' ? (
              <View ref={addMedRef} collapsable={false}>
                <Plus onPress={() => router.push(routes.medicationNew)} styles={styles} />
              </View>
            ) : null,
          headerTitle: () => (
            <HeaderTitle
              pageTitle={titleByRoute[String(route.name)] ?? String(route.name)}
              styles={styles}
            />
          ),
        })}
      >
        <Drawer.Screen name="today" options={{ title: 'Today' }} />
        <Drawer.Screen name="history" options={{ title: 'History' }} />
        <Drawer.Screen name="wellness" options={{ title: 'Wellness' }} />
        <Drawer.Screen name="doctor-visits" options={{ title: 'Doctor visits' }} />
        <Drawer.Screen name="streaks" options={{ title: 'Streaks' }} />
        <Drawer.Screen name="tracking" options={{ title: 'Tracking' }} />
        <Drawer.Screen name="medical-records" options={{ title: 'Medical records' }} />
        <Drawer.Screen
          name="interactions"
          options={{
            title: 'Interactions',
            drawerLabel: 'Drug safety check',
          }}
        />
        <Drawer.Screen name="help" options={{ title: 'Help & safety' }} />
        <Drawer.Screen name="account" options={{ title: 'My account' }} />
      </Drawer>
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    drawerBg: { backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.surface,
    },
    drawerScroll: {},
    drawerHeader: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    drawerUser: {
      flex: 1,
      gap: 2,
    },
    drawerSignedIn: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 13,
    },
    drawerEmail: {
      color: colors.text,
      fontWeight: '800',
    },
    titleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
    iconButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    iconText: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    plusButton: {
      paddingRight: spacing.lg,
    },
    plusText: {
      color: colors.accent,
    },
    signOutRow: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    signOutText: {
      color: colors.error,
      fontWeight: '900',
    },
  });
}
