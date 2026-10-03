import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeProvider';
import { TulipGarden } from './TulipGarden';
import { bouquetColorsForMinDays } from '../../lib/streakBadges';

/** One fixed coordinate system keeps the bouquet intact at every display size. */
export function TulipBadgeIcon({ earned, minDays, size = 48 }: {
  earned: boolean;
  minDays: number;
  size?: number;
}) {
  const { colors, isDark } = useTheme();
  const petals = bouquetColorsForMinDays(minDays);
  const stem = earned ? (isDark ? '#8BAF9C' : '#527B68') : colors.textMuted;
  const palette: Record<string, string> = {
    '#7c3aed': isDark ? '#BCA0D8' : '#9263B1',
    '#facc15': '#D9B76B', '#fb923c': '#D89D77', '#f472b6': '#CE8FA7',
    '#f8fafc': isDark ? '#E6DFD4' : '#C5B8A5', '#ef4444': '#BA737E',
  };
  if (minDays >= 30) return <TulipGarden minDays={minDays} earned={earned} width={size} height={size * 1.25} />;
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125" accessible={false}>
      {petals.map((color, index) => {
        const angle = petals.length === 1 ? 0 : (index - (petals.length - 1) / 2) * 9;
        const fill = earned ? palette[color] ?? colors.accent : colors.textMuted;
        return (
          <G key={index} rotation={angle} origin="50,108" opacity={earned ? 1 : 0.5}>
            <Path d="M50 109 C48 87 53 69 50 46" fill="none" stroke={stem} strokeWidth={2.8} strokeLinecap="round" />
            <Path d="M50 94 C31 91 25 77 27 66 C41 72 48 83 50 94Z" fill={stem} />
            <Path d="M51 83 C66 78 72 65 70 57 C58 64 53 73 51 83Z" fill={stem} opacity={0.8} />
            <Path d="M50 17 C39 25 37 35 40 42 L60 42 C63 33 59 23 50 17Z" fill={fill} />
            <Path d="M32 25 C33 43 34 54 50 55 C67 54 69 41 68 25 C59 27 53 33 50 40 C45 32 39 27 32 25Z" fill={fill} />
            <Path d="M33 27 C35 44 38 50 49 52 C46 39 41 32 33 27Z" fill="#FFFFFF" opacity={0.16} />
            <Path d="M50 52 C59 48 64 40 67 28" fill="none" stroke={isDark ? '#FFFFFF' : '#38223D'} strokeOpacity={0.12} strokeWidth={1.3} strokeLinecap="round" />
          </G>
        );
      })}
    </Svg>
  );
}
