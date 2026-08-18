import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import type { SameTimeDoseGroup } from '../lib/sameTimeDoseGroups';
import { sameTimePendingItemKey } from '../lib/sameTimeDoseGroups';
import type { SameTimeDoseMode } from '../lib/settings';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';

type GroupBarProps = {
  group: SameTimeDoseGroup;
  mode: SameTimeDoseMode;
  disabled: boolean;
  busy: boolean;
  onTakeAll: () => void;
  onChoose: () => void;
};

export function SameTimeDoseGroupBar({
  group,
  mode,
  disabled,
  busy,
  onTakeAll,
  onChoose,
}: GroupBarProps) {
  const styles = useThemedStyles(makeBarStyles);
  if (mode === 'individual' || group.pending.length < 2) return null;

  if (mode === 'take_all') {
    return (
      <Pressable
        style={[styles.takeAllBtn, (disabled || busy) && styles.disabled]}
        disabled={disabled || busy}
        onPress={onTakeAll}
        accessibilityRole="button"
        accessibilityLabel={`Take all ${group.pending.length} doses at ${group.label}`}
      >
        {busy ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={styles.takeAllBtnText}>Take all ({group.pending.length})</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.chooseBtn, (disabled || busy) && styles.disabled]}
      disabled={disabled || busy}
      onPress={onChoose}
      accessibilityRole="button"
      accessibilityLabel={`Choose doses at ${group.label}`}
    >
      <Text style={styles.chooseBtnText}>Choose doses</Text>
    </Pressable>
  );
}

type ChooseModalProps = {
  visible: boolean;
  group: SameTimeDoseGroup | null;
  selectedKeys: Set<string>;
  busy: boolean;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function SameTimeDoseChooseModal({
  visible,
  group,
  selectedKeys,
  busy,
  onToggle,
  onSelectAll,
  onClearAll,
  onConfirm,
  onClose,
}: ChooseModalProps) {
  const styles = useThemedStyles(makeModalStyles);
  if (!group) return null;

  const selectedCount = group.pending.filter((item) =>
    selectedKeys.has(sameTimePendingItemKey(item.med.id, item.time)),
  ).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Doses at {group.label}</Text>
          <Text style={styles.subtitle}>
            Select the medications you took. Each logs the same as Mark taken on that med.
          </Text>

          <View style={styles.quickRow}>
            <Pressable onPress={onSelectAll} disabled={busy}>
              <Text style={styles.quickLink}>Select all</Text>
            </Pressable>
            <Pressable onPress={onClearAll} disabled={busy}>
              <Text style={styles.quickLink}>Clear</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {group.pending.map((item) => {
              const key = sameTimePendingItemKey(item.med.id, item.time);
              const checked = selectedKeys.has(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.row, checked && styles.rowChecked]}
                  onPress={() => onToggle(key)}
                  disabled={busy}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.medName}>{item.med.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmBtn,
                (busy || selectedCount === 0) && styles.confirmDisabled,
              ]}
              disabled={busy || selectedCount === 0}
              onPress={onConfirm}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Mark {selectedCount} taken</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeBarStyles(colors: ColorPalette) {
  return {
    takeAllBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
      minWidth: 88,
      alignItems: 'center' as const,
    },
    takeAllBtnText: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.onAccent,
    },
    chooseBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    chooseBtnText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.accent,
    },
    disabled: { opacity: 0.55 },
  };
}

function makeModalStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    quickRow: {
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    quickLink: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.accent,
    },
    list: { gap: 6, marginVertical: spacing.xs },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowChecked: {
      borderColor: colors.accent,
      backgroundColor: colors.accentPurpleBg,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkboxChecked: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    checkmark: { color: colors.onAccent, fontSize: 14, fontWeight: '700' as const },
    medName: {
      flex: 1,
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
      color: colors.text,
    },
    actions: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center' as const,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
    confirmBtn: {
      flex: 2,
      paddingVertical: 12,
      alignItems: 'center' as const,
      borderRadius: radii.md,
      backgroundColor: colors.accent,
    },
    confirmDisabled: { opacity: 0.5 },
    confirmText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.onAccent,
    },
  };
}
