import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  groupedSupplements,
  searchSupplements,
  type SupplementEntry,
} from '../../lib/supplements';

const ADVANCED_CATEGORY = 'peptides-advanced';

export function SupplementPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (entry: SupplementEntry) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const groups = useMemo(() => groupedSupplements(), []);
  const results = query.trim() ? searchSupplements(query, 30) : null;

  function tierBadge(entry: SupplementEntry) {
    if (entry.safetyTier === 'advanced') {
      return { text: 'Advanced', color: colors.accentRed, bg: colors.accentRedBg };
    }
    if (entry.safetyTier === 'caution') {
      return { text: 'Caution', color: colors.accentAmber, bg: colors.accentAmberBg };
    }
    return null;
  }

  function renderItem(entry: SupplementEntry) {
    const badge = tierBadge(entry);
    return (
      <Pressable
        key={entry.name}
        style={styles.item}
        onPress={() => onSelect(entry)}
        accessibilityRole="button"
      >
        <View style={styles.itemMain}>
          <Text style={styles.itemName}>{entry.name}</Text>
          <Text style={styles.itemBenefit} numberOfLines={2}>
            {entry.benefit}
          </Text>
        </View>
        <View style={styles.itemRight}>
          {entry.commonDose ? <Text style={styles.itemDose}>{entry.commonDose}</Text> : null}
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Browse supplements</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search (e.g. creatine, vitamin d, ashwagandha)"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {results ? (
            results.length > 0 ? (
              results.map(renderItem)
            ) : (
              <Text style={styles.empty}>
                No match. You can type "{query.trim()}" as a custom supplement instead.
              </Text>
            )
          ) : (
            groups.map((group) => {
              const isAdvanced = group.category.id === ADVANCED_CATEGORY;
              if (isAdvanced) {
                return (
                  <View key={group.category.id}>
                    <Pressable
                      style={[styles.sectionHeader, styles.advancedHeader]}
                      onPress={() => setAdvancedOpen((v) => !v)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: advancedOpen }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.advancedTitle}>
                          {group.category.label} {advancedOpen ? '▾' : '▸'}
                        </Text>
                        <Text style={styles.advancedDesc}>
                          Prescription & research compounds — tap to {advancedOpen ? 'hide' : 'show'}. Requires medical supervision.
                        </Text>
                      </View>
                    </Pressable>
                    {advancedOpen ? group.items.map(renderItem) : null}
                  </View>
                );
              }
              return (
                <View key={group.category.id}>
                  <Text style={styles.sectionHeader}>{group.category.label}</Text>
                  {group.items.map(renderItem)}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
    close: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.accent },
    search: {
      margin: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: 4 },
    sectionHeader: {
      fontFamily: fonts.heading,
      fontSize: 14,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    advancedHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: spacing.md,
      marginTop: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accentRed,
      backgroundColor: colors.accentRedBg,
    },
    advancedTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.accentRed },
    advancedDesc: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
    item: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 6,
    },
    itemMain: { flex: 1, gap: 2 },
    itemName: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    itemBenefit: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
    itemRight: { alignItems: 'flex-end' as const, gap: 4 },
    itemDose: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm },
    badgeText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
    empty: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center' as const,
      marginTop: spacing.xl,
      lineHeight: 20,
    },
  };
}
