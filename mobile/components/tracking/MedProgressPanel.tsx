import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { fetchMedProgressSnapshot, type MedProgressSnapshot } from '../../lib/tracking/medProgress';
import { routes } from '../../lib/routes';
import { useTrackingStyles } from './trackingStyles';

export function MedProgressPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const trackingStyles = useTrackingStyles();
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<MedProgressSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMedProgressSnapshot(user.id)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load progress');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  }
  if (error) return <Text style={trackingStyles.errorBanner}>{error}</Text>;
  if (!snapshot) return null;

  const { dosesTaken, dosesTotal, streak, refillAlerts } = snapshot;

  return (
    <View>
      <Text style={trackingStyles.hint}>
        Read-only summary from Today. Log doses there — this view updates automatically.
      </Text>
      <View style={trackingStyles.row}>
        <View style={[trackingStyles.card, { flex: 1, minWidth: 140 }]}>
          <Text style={trackingStyles.cardLabel}>Today&apos;s doses</Text>
          <Text style={trackingStyles.cardValue}>
            {dosesTotal === 0 ? 'No scheduled doses' : `${dosesTaken} / ${dosesTotal}`}
          </Text>
        </View>
        {streak ? (
          <View style={[trackingStyles.card, { flex: 1, minWidth: 140 }]}>
            <Text style={trackingStyles.cardLabel}>Current streak</Text>
            <Text style={trackingStyles.cardValue}>
              {streak.currentStreak} day{streak.currentStreak === 1 ? '' : 's'}
            </Text>
            <Pressable onPress={() => router.push(routes.streaks)}>
              <Text style={trackingStyles.ghostBtnText}>View streaks →</Text>
            </Pressable>
          </View>
        ) : null}
        {refillAlerts.length > 0 ? (
          <View style={[trackingStyles.card, { flex: 1, minWidth: 140 }]}>
            <Text style={trackingStyles.cardLabel}>Refills</Text>
            <Text style={trackingStyles.cardValue}>{refillAlerts.length} low</Text>
            <Pressable onPress={() => router.push(routes.account)}>
              <Text style={trackingStyles.ghostBtnText}>Update supply →</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Pressable style={trackingStyles.primaryBtn} onPress={() => router.push(routes.today)}>
        <Text style={trackingStyles.primaryBtnText}>Go to Today</Text>
      </Pressable>
      <Pressable style={trackingStyles.secondaryBtn} onPress={() => router.push(routes.history)}>
        <Text style={trackingStyles.secondaryBtnText}>View history</Text>
      </Pressable>
    </View>
  );
}
