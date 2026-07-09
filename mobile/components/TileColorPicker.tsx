import { Pressable, Text, View } from 'react-native';
import type { ColorPalette } from '../constants/theme';
import {
  TILE_COLOR_IDS,
  TILE_COLOR_LABELS,
  tileBgKeyForFg,
  type TileColorId,
} from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  value: TileColorId;
  onChange: (next: TileColorId) => void;
};

export function TileColorPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <View style={styles.swatchRow} accessibilityRole="radiogroup">
        {TILE_COLOR_IDS.map((id) => {
          const fg = colors[id];
          const bg = colors[tileBgKeyForFg(id)];
          const selected = value === id;
          return (
            <Pressable
              key={id}
              style={[
                styles.swatch,
                { backgroundColor: bg, borderColor: selected ? fg : colors.border },
                selected && styles.swatchSelected,
              ]}
              onPress={() => onChange(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={TILE_COLOR_LABELS[id]}
            >
              <View style={[styles.swatchDot, { backgroundColor: fg }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.selectedLabel}>{TILE_COLOR_LABELS[value]}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    wrap: {
      gap: spacing.sm,
    },
    swatchRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    swatchSelected: {
      borderWidth: 2.5,
    },
    swatchDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    selectedLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
    },
  };
}
