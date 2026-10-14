import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, tileBgKey, tileFgKey, withAlpha } from '../../constants/theme';
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
    safe: { flex: 1, backgroundColor: 'transparent' },
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
      gap: spacing.md - 4,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderLeftWidth: 5,
      paddingVertical: 14,
      paddingLeft: spacing.sm + 4,
      paddingRight: spacing.sm,
    },
    rowShell: {
      marginBottom: spacing.sm + 2,
    },
    rowLifted: {
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    position: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    positionText: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.onAccent,
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
      paddingVertical: 8,
      paddingHorizontal: 10,
      gap: 3.5,
    },
    handleBar: {
      width: 18,
      height: 3,
      borderRadius: 2,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    doneBtn: {
      alignItems: 'center' as const,
      paddingVertical: 14,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    doneText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.onAccent,
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

/**
 * One draggable medication. Holding anywhere on the card picks it up, and the
 * card gets a shadow while it is being carried so it is obvious what is moving.
 */
function ReorderRow({
  item,
  index,
  styles,
}: {
  item: MedicationWithStatus;
  index: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { colors } = useTheme();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const accent = colors[tileFgKey(item.tile_color, item.medication_route)];
  const tint = colors[tileBgKey(item.tile_color, item.medication_route)];

  return (
    <View style={[styles.rowShell, active && styles.rowLifted]}>
      <PressableScale
        style={[
          styles.row,
          {
            backgroundColor: tint,
            borderColor: active ? accent : withAlpha(accent, 0.45),
            borderLeftColor: accent,
          },
        ]}
        scaleTo={0.99}
        onLongPress={drag}
        delayLongPress={160}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, position ${index + 1}. Hold and drag to reorder`}
      >
        <View style={[styles.position, { backgroundColor: accent }]}>
          <Text style={styles.positionText}>{index + 1}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.name, { color: accent }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {formatDoseDisplay(item) || 'No dose set'}
          </Text>
        </View>
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: withAlpha(accent, 0.7) }]} />
          <View style={[styles.handleBar, { backgroundColor: withAlpha(accent, 0.7) }]} />
          <View style={[styles.handleBar, { backgroundColor: withAlpha(accent, 0.7) }]} />
        </View>
      </PressableScale>
    </View>
  );
}

export default function ReorderScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: MedListTab =
    params.tab === 'as_needed' || params.tab === 'supplement' ? params.tab : 'scheduled';

  const { user } = useAuth();
  const router = useRouter();
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
          Press and hold a card, then drag it where you want it. Changes save as you go.
        </Text>
      </View>
      <ReorderableList
        data={items}
        keyExtractor={(m) => m.id}
        onReorder={handleReorder}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <ReorderRow item={item} index={index} styles={styles} />
        )}
      />
      <View style={styles.footer}>
        <PressableScale
          style={styles.doneBtn}
          scaleTo={0.96}
          haptic
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.doneText}>Done</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}
