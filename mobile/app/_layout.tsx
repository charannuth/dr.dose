import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  useEffect(() => {
    setReady(true);
    void SplashScreen.hideAsync();
  }, []);

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
