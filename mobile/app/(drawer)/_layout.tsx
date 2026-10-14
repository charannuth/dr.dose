import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { fonts, spacing } from '../../constants/theme';
import { DrDoseWordmark } from '../../components/DrDoseWordmark';
import { AddEntryTypeSheet, type AddEntryType } from '../../components/AddEntryTypeSheet';
import { LoadingScreen } from '../../components/LoadingScreen';
import { VaultGate } from '../../components/VaultGate';
import { useAuth } from '../../hooks/useAuth';
import { MenuAvatarButton } from '../../components/MenuAvatarButton';
import { AppDrawerContent } from '../../components/navigation/AppDrawerContent';
import { AmbientScreenLayout } from '../../components/AmbientBackground';
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

export default function DrawerLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <VaultGate>
      <DrawerLayoutInner user={user} />
    </VaultGate>
  );
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
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  function handleAddEntry(type: AddEntryType) {
    setAddSheetOpen(false);
    if (type === 'supplement') {
      router.push(routes.supplementNew);
      return;
    }
    router.push({
      pathname: routes.medicationNew,
      params: {
        scheduleType: type === 'prn_med' ? 'as_needed' : 'scheduled',
        category: 'medication',
      },
    });
  }

  useReminderBootstrap(user.id);
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
  }, [user.id]);

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
    interactions: 'Drug safety check',
    help: 'Help & safety',
  };

  return (
    <>
      <AddEntryTypeSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onSelect={handleAddEntry}
      />
      {showOnboarding ? (
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
      {showDemoTour ? (
        <DemoTour
          active={showDemoTour}
          userId={user.id}
          onComplete={finishDemoTour}
          onPrepareStep={prepareTourStep}
        />
      ) : null}
      <Drawer
        screenLayout={({ children }) => <AmbientScreenLayout>{children}</AmbientScreenLayout>}
        drawerContent={(props) => {
          drawerNavRef.current = props.navigation;
          return <AppDrawerContent {...props} />;
        }}
        screenOptions={({ navigation, route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: true,
          headerTitleAlign: 'center',
          drawerStyle: { backgroundColor: colors.bg, width: 312 },
          // Slide the menu over the page instead of moving the whole page (and
          // its animated background) with it: far less to redraw each frame.
          drawerType: 'front',
          // Pages left in the background stop re-rendering until you come back.
          freezeOnBlur: true,
          sceneStyle: { backgroundColor: colors.bg },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textMuted,
          drawerActiveBackgroundColor: colors.pendingBg,
          headerLeft: () => (
            <View ref={menuRef} collapsable={false}>
              <MenuAvatarButton user={user} onPress={() => navigation.toggleDrawer()} />
            </View>
          ),
          headerRight: () =>
            route.name === 'today' ? (
              <View ref={addMedRef} collapsable={false}>
                <Plus onPress={() => setAddSheetOpen(true)} styles={styles} />
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
    titleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      marginTop: 2,
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
      color: colors.textMuted,
      letterSpacing: 0.3,
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
  });
}
