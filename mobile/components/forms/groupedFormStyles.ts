import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export const useGroupedFormStyles = () => useThemedStyles(makeStyles);
function makeStyles(c: ColorPalette) {
  return {
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.bodySemibold, fontSize: 12, letterSpacing: 0.7, color: c.textMuted, marginLeft: 16 },
    group: { borderRadius: 18, backgroundColor: c.surface, overflow: 'hidden' as const },
    field: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 16 },
    label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    input: { minHeight: 32, padding: 0, fontFamily: fonts.bodyRegular, fontSize: 16, color: c.text },
    textarea: { minHeight: 80, textAlignVertical: 'top' as const, paddingTop: 4 },
    row: { minHeight: 54, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: c.text },
    rowValue: { flexShrink: 1, fontFamily: fonts.bodyRegular, fontSize: 15, color: c.accent },
    chevron: { color: c.textMuted, fontSize: 18 },
    hint: { fontFamily: fonts.bodyRegular, color: c.textMuted, fontSize: 12, lineHeight: 18, marginHorizontal: 16 },
    link: { minHeight: 44, justifyContent: 'center' as const, paddingHorizontal: 16 },
    linkText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.accent },
  };
}
