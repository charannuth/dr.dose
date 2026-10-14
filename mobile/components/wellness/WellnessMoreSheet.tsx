import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, spacing, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { CollapsibleSection } from '../forms/CollapsibleSection';

export type MoreSection = { key: string; title: string; summary?: string; content: ReactNode };

/**
 * Everything on Wellness you reach for now and then (detailed charts, the
 * doctor report, medication guidance, baseline, sources) in one sheet, so the
 * page itself stays short.
 */
export function WellnessMoreSheet({
  visible,
  onClose,
  baselineSummary,
  onEditBaseline,
  sections,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  baselineSummary: string;
  onEditBaseline: () => void;
  sections: MoreSection[];
  footer?: ReactNode;
}) {
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheet}>
        <View style={s.header}>
          <Text style={s.title}>More</Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={s.done} hitSlop={8}>
            <Text style={s.doneText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          <Pressable style={s.baseline} onPress={onEditBaseline} accessibilityRole="button">
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.rowTitle}>Your baseline</Text>
              <Text style={s.hint}>{baselineSummary}</Text>
            </View>
            <Text style={s.link}>Edit ›</Text>
          </Pressable>
          {sections.map((section) => (
            <CollapsibleSection key={section.key} title={section.title} summary={section.summary}>
              {section.content}
            </CollapsibleSection>
          ))}
          {footer}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    sheet: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    title: { flex: 1, fontFamily: fonts.heading, fontSize: 22, color: c.text },
    done: { paddingVertical: 6, paddingHorizontal: 4 },
    doneText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.accent },
    content: { padding: spacing.lg, gap: 16 },
    baseline: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      padding: 16,
      borderRadius: radii.lg,
      backgroundColor: c.surface,
    },
    rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: c.textMuted },
    link: { fontFamily: fonts.bodySemibold, color: c.accent, fontSize: 14 },
  };
}
