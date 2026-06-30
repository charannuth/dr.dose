import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from '../context/AuthProvider';
import { ThemeProvider, useTheme } from '../context/ThemeProvider';
import { DemoTourTargetsProvider } from '../context/DemoTourTargetsContext';
import { ConfigGuard } from '../components/ConfigGuard';
import { RootErrorBoundary } from '../components/RootErrorBoundary';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AppShell() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Render once fonts resolve. If a font fails to load we still proceed so the
  // app is never blocked — React Native falls back to the system face.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!fontsReady) return;
    setReady(true);
    void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootText}>Dr. Dose</Text>
      </View>
    );
  }

  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RootErrorBoundary>
          <ThemeProvider>
            <ConfigGuard>
              <AuthProvider>
                <DemoTourTargetsProvider>
                  <AppShell />
                </DemoTourTargetsProvider>
              </AuthProvider>
            </ConfigGuard>
          </ThemeProvider>
        </RootErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
  },
  bootText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
});
