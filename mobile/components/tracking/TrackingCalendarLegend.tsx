import { Text, View } from 'react-native';
import type { TrackingCalendarLegendItem } from '../../lib/tracking/calendarTypes';
import type { ColorPalette } from '../../constants/theme';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { legendDotStyle, legendHeartStyle, legendSwatchStyle } from './calendarLegendStyles';

type Props = {
  items: TrackingCalendarLegendItem[];
  title?: string;
};

function LegendSwatch({ swatchClass }: { swatchClass: string }) {
  const { colors, isDark } = useTheme();
  return <View style={legendSwatchStyle(swatchClass, colors, isDark)} accessibilityElementsHidden />;
}

function LegendIcon({ icon }: { icon: 'heart' | 'dot' }) {
  const { isDark } = useTheme();
  if (icon === 'heart') {
    return (
      <Text style={legendHeartStyle(isDark)} accessibilityElementsHidden>
        ♥
      </Text>
    );
  }
  return <View style={legendDotStyle(isDark)} accessibilityElementsHidden />;
}

export function TrackingCalendarLegend({ items, title = 'Calendar key' }: Props) {
  const styles = useThemedStyles(makeLegendWrapStyles);

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={title}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.indicator}>
              {item.swatchClass ? <LegendSwatch swatchClass={item.swatchClass} /> : null}
              {item.icon ? <LegendIcon icon={item.icon} /> : null}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeLegendWrapStyles(colors: ColorPalette) {
  return {
    wrap: {
      marginBottom: spacing.md,
      paddingVertical: spacing.sm,
    },
    title: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: spacing.sm,
      letterSpacing: 0.4,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    item: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      minWidth: '46%' as const,
      flexGrow: 1,
      maxWidth: '100%' as const,
      paddingVertical: 2,
    },
    indicator: {
      width: 20,
      height: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    label: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
  };
}
