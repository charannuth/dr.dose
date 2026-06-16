import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthScreen } from '../components/AuthScreen';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { routes } from '../lib/routes';

/** Login lives at `/` — no Redirect, no route hop on cold start. */
export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(routes.today);
    }
  }, [user, loading, router]);

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Setup required</Text>
        <Text style={styles.body}>
          This build is missing Supabase environment variables. Rebuild after setting EAS production
          env vars.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.hint}>Opening Dr. Dose…</Text>
      </View>
    );
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 15,
    color: '#64748b',
  },
});
