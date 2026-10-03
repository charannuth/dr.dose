import { Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export function NavigationRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles);
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }]}>
    <View style={s.labels}><Text style={s.title}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>
    <Text style={s.arrow}>›</Text>
  </Pressable>;
}
function makeStyles(c: ColorPalette) {
  return { row: { minHeight: 64, paddingVertical: 16, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16 }, labels: { flex: 1, gap: 5 }, title: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text }, subtitle: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: c.textMuted }, arrow: { fontSize: 24, color: c.textMuted } };
}
