import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthProvider';
import { ThemeProvider, useTheme } from '../context/ThemeProvider';
import { DemoTourTargetsProvider } from '../context/DemoTourTargetsContext';
import { ConfigGuard } from '../components/ConfigGuard';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ConfigGuard>
            <AuthProvider>
              <DemoTourTargetsProvider>
                <ThemedStatusBar />
                <Stack screenOptions={{ headerShown: false }} />
              </DemoTourTargetsProvider>
            </AuthProvider>
          </ConfigGuard>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
});
