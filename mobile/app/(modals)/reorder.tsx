import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, tileFgKey } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { PressableScale } from '../../components/PressableScale';
import { tapFeedback } from '../../lib/haptics';
import { formatDoseDisplay } from '../../lib/dose';
import { isAsNeededMed, isSupplement } from '../../lib/medicationSchedule';
import {
  applyCustomOrder,
  fetchMedicationsWithStatus,
  sortScheduledMedications,
} from '../../lib/medications';
import {
  getCustomOrders,
  setCustomOrder,
  setMedSort,
  type MedListTab,
} from '../../lib/settings';
import type { MedicationWithStatus } from '../../lib/types';

const TAB_TITLES: Record<MedListTab, string> = {
  scheduled: 'Daily medications',
  as_needed: 'As-needed medications',
  supplement: 'Supplements',
};

function makeStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: 4,
    },
    heading: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.text,
    },
    hint: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    listContent: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    rowActive: {
      borderColor: colors.accent,
    },
    position: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textMuted,
      minWidth: 22,
    },
    rowText: { flex: 1, gap: 2 },
    name: {
      fontFamily: fonts.bodySemibold,
      fontSize: 16,
    },
    detail: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      color: colors.textMuted,
    },
    handle: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      gap: 3,
    },
    handleBar: {
      width: 20,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    empty: {
      fontFamily: fonts.bodyRegular,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center' as const,
    },
  };
}

/** Press-and-hold target that hands the gesture to the list's drag machinery. */
function DragHandle({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  const drag = useReorderableDrag();
  return (
    <PressableScale
      style={styles.handle}
      scaleTo={0.88}
      onLongPress={drag}
      delayLongPress={140}
      accessibilityRole="button"
      accessibilityLabel="Hold and drag to reorder"
    >
      <View style={styles.handleBar} />
      <View style={styles.handleBar} />
      <View style={styles.handleBar} />
    </PressableScale>
  );
}

export default function ReorderScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: MedListTab =
    params.tab === 'as_needed' || params.tab === 'supplement' ? params.tab : 'scheduled';

  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<MedicationWithStatus[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const [meds, orders] = await Promise.all([
        fetchMedicationsWithStatus(user.id),
        getCustomOrders(user.id),
      ]);
      if (!active) return;
      const forTab = meds.filter((m) => {
        if (tab === 'supplement') return isSupplement(m);
        if (tab === 'as_needed') return !isSupplement(m) && isAsNeededMed(m);
        return !isSupplement(m) && !isAsNeededMed(m);
      });
      // Seed from the saved order when there is one, otherwise from the sort the
      // list already used, so the first drag starts from what the user last saw.
      setItems(
        orders[tab].length > 0
          ? applyCustomOrder(forTab, orders[tab])
          : sortScheduledMedications(forTab, 'time'),
      );
    })();
    return () => {
      active = false;
    };
  }, [user, tab]);

  function handleReorder({ from, to }: ReorderableListReorderEvent) {
    if (!user || !items) return;
    const ordered = reorderItems(items, from, to);
    setItems(ordered);
    tapFeedback();
    // Arriving on this screen is itself a request for a manual order, so switch
    // the list preference over rather than saving an order nothing displays.
    void setCustomOrder(user.id, tab, ordered.map((m) => m.id));
    void setMedSort('custom');
  }

  if (!user || items == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (items.length < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.empty}>
            You need at least two {TAB_TITLES[tab].toLowerCase()} before there is anything to
            reorder.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.heading}>{TAB_TITLES[tab]}</Text>
        <Text style={styles.hint}>
          Hold the handle and drag to set the order. Changes save as you go.
        </Text>
      </View>
      <ReorderableList
        data={items}
        keyExtractor={(m) => m.id}
        onReorder={handleReorder}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.position}>{index + 1}</Text>
            <View style={styles.rowText}>
              <Text
                style={[
                  styles.name,
                  { color: colors[tileFgKey(item.tile_color, item.medication_route)] },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {formatDoseDisplay(item) || 'No dose set'}
              </Text>
            </View>
            <DragHandle styles={styles} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
