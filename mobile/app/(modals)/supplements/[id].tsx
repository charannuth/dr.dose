import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ColorPalette } from '../../../constants/theme';
import { spacing } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeProvider';
import { supabase } from '../../../lib/supabase';
import { repairMedicationSchedule } from '../../../lib/medications';
import { useAuth } from '../../../hooks/useAuth';
import { SupplementForm } from '../../../components/supplements/SupplementForm';
import type { Medication } from '../../../lib/types';

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.bg,
    },
    muted: { color: colors.textMuted },
    error: { color: colors.error, fontWeight: '800' },
  });
}

export default function EditSupplementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [med, setMed] = useState<Medication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;

    async function load() {
      if (!supabase) throw new Error('Supabase is not configured');
      const { data, error: fetchError } = await supabase
        .from('medications')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      const row = data as Medication;
      await repairMedicationSchedule(row.id);
      if (active) setMed(row);
    }

    load()
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.muted}>Loading supplement…</Text>
      </View>
    );
  }

  if (error || !med || !user) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>{error ?? 'Supplement not found'}</Text>
      </View>
    );
  }

  return <SupplementForm initial={med} userId={user.id} onDone={() => router.back()} />;
}
