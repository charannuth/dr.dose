import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export function CollapsibleSection({ title, summary, children, initiallyOpen = false }: { title: string; summary?: string; children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const s = useThemedStyles(makeStyles);
  return <View style={s.section}>
    <Pressable style={s.header} onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={s.labels}><Text style={s.title}>{title}</Text>{summary ? <Text style={s.summary}>{summary}</Text> : null}</View>
      <Text style={s.chevron}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    <View style={{ display: open ? 'flex' : 'none', paddingBottom: 16 }}>{children}</View>
  </View>;
}
function makeStyles(c: ColorPalette) {
  return { section: { borderBottomWidth: 1, borderColor: c.border }, header: { minHeight: 64, flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 16, gap: 12 },
    labels: { flex: 1, gap: 5 }, title: { fontFamily: fonts.bodySemibold, fontSize: 17, color: c.text }, summary: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted }, chevron: { fontSize: 20, color: c.textMuted } };
}
