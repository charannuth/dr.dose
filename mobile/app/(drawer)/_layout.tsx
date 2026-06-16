import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { DrDoseWordmark } from '../../components/DrDoseWordmark';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../hooks/useAuth';
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

export default function MainLayout() {
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

  return <MainLayoutInner user={user} />;
}

function MainLayoutInner({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { registerTarget, unregisterTarget } = useDemoTourTargets();
  const addMedRef = useRef<View>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [openAddAfterTour, setOpenAddAfterTour] = useState(false);

  useReminderBootstrap(user.id);
  useNotificationResponses();

  useEffect(() => {
    registerTarget('add-medication', addMedRef);
    return () => unregisterTarget('add-medication');
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
    if (step.drawer === 'closed') {
      router.navigate(routes.today);
    }
  }

  function finishDemoTour() {
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
      <Stack
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: true,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <HeaderTitle
              pageTitle={titleByRoute[String(route.name)] ?? String(route.name)}
              styles={styles}
            />
          ),
          contentStyle: { backgroundColor: colors.bg },
        })}
      >
        <Stack.Screen
          name="today"
          options={{
            title: 'Today',
            headerRight: () => (
              <View ref={addMedRef} collapsable={false}>
                <Plus onPress={() => router.push(routes.medicationNew)} styles={styles} />
              </View>
            ),
          }}
        />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="wellness" options={{ title: 'Wellness' }} />
        <Stack.Screen name="doctor-visits" options={{ title: 'Doctor visits' }} />
        <Stack.Screen name="streaks" options={{ title: 'Streaks' }} />
        <Stack.Screen name="tracking" options={{ title: 'Tracking' }} />
        <Stack.Screen name="medical-records" options={{ title: 'Medical records' }} />
        <Stack.Screen name="interactions" options={{ title: 'Drug safety check' }} />
        <Stack.Screen name="help" options={{ title: 'Help & safety' }} />
        <Stack.Screen name="account" options={{ title: 'My account' }} />
      </Stack>
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
  });
}
