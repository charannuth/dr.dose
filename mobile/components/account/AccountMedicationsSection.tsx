import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';
import { formatScheduleTime } from '../../lib/dates';
import { formatDoseDisplay } from '../../lib/dose';
import { formatInventoryRemaining } from '../../lib/inventory';
import {
  formatMedicationDateRange,
  scheduleStatusLabel,
} from '../../lib/medicationDates';
import {
  deleteMedication,
  fetchMedicationsWithStatus,
  migrateMedicationToAsNeeded,
  migrateMedicationToScheduled,
} from '../../lib/medications';
import { routes } from '../../lib/routes';
import { isAsNeededMed, scheduleTypeLabel } from '../../lib/medicationSchedule';
import type { MedicationWithStatus } from '../../lib/types';
import { radii, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export function AccountMedicationsSection() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMedId, setBusyMedId] = useState<string | null>(null);
  const styles = makeStyles(colors);

  const reload = useCallback(async () => {
    if (!user) return;
    const data = await fetchMedicationsWithStatus(user.id, { includeInactive: true });
    setMedications(data);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMedicationsWithStatus(user.id, { includeInactive: true })
      .then((data) => {
        if (active) setMedications(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load medications');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user || loading) return;
      void reload();
    }, [user, loading, reload]),
  );

  function confirmDelete(med: MedicationWithStatus) {
    Alert.alert(
      `Delete ${med.name}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMedication(med.id);
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not delete');
              }
            })();
          },
        },
      ],
    );
  }

  function moveToAsNeeded(med: MedicationWithStatus) {
    Alert.alert(
      `Move ${med.name} to as needed?`,
      'Fixed dose times will be removed. Doses already logged today are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: () => {
            void (async () => {
              setBusyMedId(`${med.id}-prn`);
              setError(null);
              try {
                await migrateMedicationToAsNeeded(med.id);
                await reload();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not move medication to as needed',
                );
              } finally {
                setBusyMedId(null);
              }
            })();
          },
        },
      ],
    );
  }

  function moveToDaily(med: MedicationWithStatus) {
    Alert.alert(
      `Move ${med.name} to a daily schedule?`,
      'A default morning dose time (8:00 AM) will be added. Edit the medication to change or add times.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: () => {
            void (async () => {
              setBusyMedId(`${med.id}-daily`);
              setError(null);
              try {
                await migrateMedicationToScheduled(med.id);
                await reload();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not move medication to daily schedule',
                );
              } finally {
                setBusyMedId(null);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Medications</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push(routes.medicationNew)}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Manage your list here. Log daily doses on{' '}
        <Text style={styles.link} onPress={() => router.push(routes.today)}>
          Today
        </Text>
        .
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      ) : medications.length === 0 ? (
        <Text style={styles.hint}>No medications yet.</Text>
      ) : (
        medications.map((med) => (
          <View key={med.id} style={styles.medItem}>
            <View style={styles.medBody}>
              <View style={styles.titleRow}>
                <Text style={styles.medName}>{med.name}</Text>
                {med.scheduleStatus !== 'active' ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {scheduleStatusLabel(med.scheduleStatus)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.medMeta}>
                {formatDoseDisplay(med)} · {scheduleTypeLabel(med.schedule_type)}
                {med.tracking_sync === 'hrt' ? ' · HRT sync' : ''}
              </Text>
              <Text style={styles.medMeta}>{formatMedicationDateRange(med)}</Text>
              {med.schedule_times.length > 0 ? (
                <Text style={styles.medMeta}>
                  {med.schedule_times.map(formatScheduleTime).join(' · ')}
                </Text>
              ) : null}
              {med.pills_remaining != null ? (
                <Text style={styles.medMeta}>
                  {formatInventoryRemaining(med.pills_remaining, med)}
                </Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              {!isAsNeededMed(med) ? (
                <Pressable
                  disabled={busyMedId === `${med.id}-prn`}
                  onPress={() => moveToAsNeeded(med)}
                >
                  <Text style={styles.actionText}>
                    {busyMedId === `${med.id}-prn` ? '…' : 'As needed'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={busyMedId === `${med.id}-daily`}
                  onPress={() => moveToDaily(med)}
                >
                  <Text style={styles.actionText}>
                    {busyMedId === `${med.id}-daily` ? '…' : 'Daily'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() =>
                  router.push(
                    med.category === 'supplement'
                      ? routes.supplementEdit(med.id)
                      : routes.medicationEdit(med.id),
                  )
                }
              >
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(med)}>
                <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
    addBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      backgroundColor: colors.bg,
    },
    addBtnText: { fontWeight: '700', color: colors.text },
    hint: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    link: { color: colors.accent, fontWeight: '700' },
    error: { color: colors.error, fontWeight: '600' },
    medItem: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    medBody: { gap: 4 },
    titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
    medName: { fontSize: 16, fontWeight: '900', color: colors.text },
    statusBadge: {
      backgroundColor: colors.pendingBg,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    medMeta: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    actionText: { fontWeight: '700', color: colors.accent, fontSize: 14 },
    dangerText: { color: colors.error },
  });
}
