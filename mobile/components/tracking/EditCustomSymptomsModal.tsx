import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { normalizeCustomSymptoms } from '../../lib/tracking/cycle';

type Props = {
  visible: boolean;
  defaults: readonly string[];
  custom: string[];
  onCancel: () => void;
  onSave: (next: string[]) => void;
};

/**
 * Compact popup from the trailing "+" chip: manage user-added symptom labels
 * (defaults stay on the main list). Corner × deletes; + opens an input; Done saves.
 */
export function EditCustomSymptomsModal({
  visible,
  defaults,
  custom,
  onCancel,
  onSave,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const [draftCustoms, setDraftCustoms] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftCustoms(normalizeCustomSymptoms(custom, defaults));
    setAdding(false);
    setDraft('');
  }, [visible, custom, defaults]);

  useEffect(() => {
    if (adding) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [adding]);

  function removeCustom(label: string) {
    setDraftCustoms((prev) => prev.filter((s) => s !== label));
  }

  function commitDraft() {
    const next = normalizeCustomSymptoms([...draftCustoms, draft], defaults);
    setDraftCustoms(next);
    setDraft('');
    setAdding(false);
  }

  function startAdding() {
    setAdding(true);
  }

  function handleDone() {
    const merged = adding
      ? normalizeCustomSymptoms([...draftCustoms, draft], defaults)
      : normalizeCustomSymptoms(draftCustoms, defaults);
    onSave(merged);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Add symptoms</Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Text style={styles.closeX}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipWrap}
          >
            {draftCustoms.map((label) => (
              <View key={label} style={styles.customChip}>
                <Text style={styles.customChipText}>{label}</Text>
                <Pressable
                  onPress={() => removeCustom(label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label}`}
                  hitSlop={6}
                  style={styles.chipDelete}
                >
                  <Text style={styles.chipDeleteX}>×</Text>
                </Pressable>
              </View>
            ))}

            {adding ? (
              <TextInput
                ref={inputRef}
                style={styles.dashedInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Type symptom…"
                placeholderTextColor={styles.placeholder.color}
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={commitDraft}
                onBlur={() => {
                  if (draft.trim()) commitDraft();
                  else setAdding(false);
                }}
              />
            ) : (
              <Pressable
                onPress={startAdding}
                style={styles.plusChip}
                accessibilityRole="button"
                accessibilityLabel="Add a symptom"
              >
                <Text style={styles.plusText}>+</Text>
              </Pressable>
            )}
          </ScrollView>

          <Pressable onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: spacing.lg,
    },
    card: {
      width: '100%' as const,
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.text,
    },
    closeBtn: {
      width: 28,
      height: 28,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    closeX: {
      fontSize: 24,
      lineHeight: 26,
      color: colors.textMuted,
      fontWeight: '500' as const,
    },
    scroll: { maxHeight: 220 },
    chipWrap: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      paddingBottom: spacing.sm,
    },
    customChip: {
      position: 'relative' as const,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 8,
      paddingRight: 22,
      backgroundColor: colors.bg,
    },
    customChipText: { fontSize: 14, color: colors.text },
    chipDelete: {
      position: 'absolute' as const,
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    chipDeleteX: {
      fontSize: 12,
      lineHeight: 13,
      color: colors.error,
      fontWeight: '700' as const,
    },
    dashedInput: {
      minWidth: 110,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    placeholder: { color: colors.textMuted },
    plusChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.bg,
      minWidth: 40,
      alignItems: 'center' as const,
    },
    plusText: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
      lineHeight: 20,
    },
    doneBtn: {
      alignSelf: 'center' as const,
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      minWidth: 120,
      alignItems: 'center' as const,
    },
    doneBtnText: {
      color: colors.onAccent,
      fontWeight: '700' as const,
      fontSize: 15,
    },
  };
}
