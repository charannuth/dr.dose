import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeProvider';
import { applyCustomOrder, fetchMedicationsWithStatus } from '../../lib/medications';
import { isAsNeededMed, isSupplement } from '../../lib/medicationSchedule';
import { setCustomOrder, type MedListTab } from '../../lib/settings';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, routeColorKey, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { MedicationWithStatus } from '../../lib/types';

const TAB_TITLES: Record<MedListTab, string> = {
  scheduled: 'Reorder daily meds',
  as_needed: 'Reorder as-needed',
  supplement: 'Reorder supplements',
};

function parseTab(raw: string | string[] | undefined): MedListTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'as_needed' || value === 'supplement') return value;
  return 'scheduled';
}

function filterForTab(
  meds: MedicationWithStatus[],
  tab: MedListTab,
): MedicationWithStatus[] {
  if (tab === 'supplement') return meds.filter((m) => isSupplement(m));
  if (tab === 'as_needed')
    return meds.filter((m) => !isSupplement(m) && isAsNeededMed(m));
  return meds.filter((m) => !isSupplement(m) && !isAsNeededMed(m));
}

function subtitleFor(med: MedicationWithStatus, tab: MedListTab): string {
  if (tab === 'supplement') return 'Supplement';
  if (tab === 'as_needed') return 'As needed';
  const route = med.medication_route;
  if (!route) return 'Daily';
  return route.charAt(0).toUpperCase() + route.slice(1);
}

function DragHandle({ color }: { color: string }) {
  return (
    <View style={handleStyles.handle} accessible accessibilityLabel="Drag to reorder">
      <View style={[handleStyles.bar, { backgroundColor: color }]} />
      <View style={[handleStyles.bar, { backgroundColor: color }]} />
      <View style={[handleStyles.bar, { backgroundColor: color }]} />
    </View>
  );
}

const handleStyles = StyleSheet.create({
  handle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
    justifyContent: 'center',
  },
  bar: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
  },
});

function ReorderRow({
  med,
  tab,
}: {
  med: MedicationWithStatus;
  tab: MedListTab;
}) {
  const drag = useReorderableDrag();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accent = colors[routeColorKey(med.medication_route)];

  return (
    <View style={styles.row}>
      <View style={[styles.rowAccent, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: accent }]} numberOfLines={1}>
          {med.name}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitleFor(med, tab)}
        </Text>
      </View>
      <Pressable
        onPressIn={drag}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${med.name}`}
      >
        <DragHandle color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export default function ReorderScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; ids?: string }>();
  const tab = parseTab(params.tab);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [data, setData] = useState<MedicationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const seedIds = (params.ids ?? '').split(',').filter(Boolean);
    fetchMedicationsWithStatus(user.id)
      .then((meds) => {
        if (!active) return;
        const ordered = applyCustomOrder(filterForTab(meds, tab), seedIds);
        setData(ordered);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  const persist = useCallback(
    (ordered: MedicationWithStatus[]) => {
      if (!user) return;
      void setCustomOrder(
        user.id,
        tab,
        ordered.map((m) => m.id),
      );
    },
    [user, tab],
  );

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      setData((current) => {
        const next = reorderItems(current, from, to);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const renderItem = useCallback(
    ({ item }: { item: MedicationWithStatus }) => (
      <ReorderRow med={item} tab={tab} />
    ),
    [tab],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack.Screen options={{ title: TAB_TITLES[tab] }} />
      <SafeAreaView style={styles.root} edges={['bottom']}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : data.length < 2 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              You need at least two items to reorder.
            </Text>
          </View>
        ) : (
          <ReorderableList
            data={data}
            onReorder={handleReorder}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            autoscrollThreshold={0.15}
            autoscrollSpeedScale={1.5}
            ListHeaderComponent={
              <Text style={styles.hint}>
                Drag the handle on the right to reorder. Changes save
                automatically.
              </Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      fontFamily: fonts.bodyRegular,
      textAlign: 'center',
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: fonts.bodyRegular,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    rowAccent: {
      width: 4,
      alignSelf: 'stretch',
    },
    rowBody: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingLeft: spacing.md,
    },
    rowName: {
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
    },
    rowSubtitle: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: fonts.bodyRegular,
    },
  });
