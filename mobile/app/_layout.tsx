import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { routes } from '../lib/routes';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthProvider';
import { ThemeProvider, useTheme } from '../context/ThemeProvider';
import { ConfigGuard } from '../components/ConfigGuard';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';

function RootNavigator() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace(routes.login);
    } else if (user && inAuthGroup) {
      router.replace(routes.today);
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ConfigGuard>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ConfigGuard>
    </ThemeProvider>
  );
}
