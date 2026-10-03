import { useEffect } from 'react';
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedProps,
  useReducedMotion, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeProvider';

const AnimatedG = Animated.createAnimatedComponent(G);
const DURATION = 5200;

function GardenButterfly({ clock, x, y, index, muted }: {
  clock: SharedValue<number>; x: number; y: number; index: number; muted?: string;
}) {
  const start = 700 + index * 280;
  const arrival = start + 2400;
  const flight = useAnimatedProps(() => {
    const t = interpolate(clock.value, [start, arrival], [0, 1], Extrapolation.CLAMP);
    const p = t * t * (3 - 2 * t);
    const q = 1 - p;
    const fromX = index % 2 ? 24 : 236;
    const fromY = 40 + index * 13;
    return {
      opacity: interpolate(clock.value, [start, start + 250], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: q * q * fromX + 2 * q * p * (x + (index % 2 ? -28 : 28)) + p * p * x },
        { translateY: q * q * fromY + 2 * q * p * 18 + p * p * y },
        { rotate: `${-12 + p * 6}deg` },
      ],
    };
  });
  const wings = useAnimatedProps(() => ({
    transform: [{ scaleX: 0.75 + Math.sin(Math.max(0, clock.value - start) / 95) * 0.22 * interpolate(clock.value, [arrival - 100, arrival + 650], [1, 0], Extrapolation.CLAMP) }],
  }));
  return <AnimatedG animatedProps={flight}>
    <AnimatedG animatedProps={wings}>
      <Path d="M0 0 C-5 -14 -16 -15 -15 -6 C-14 -1 -7 2 0 3 C-10 0 -12 6 -8 9 C-4 11 -1 6 0 4Z" fill={muted ?? '#E6C34C'} />
      <Path d="M0 0 C5 -13 13 -14 13 -6 C13 -1 7 2 0 3 C8 0 11 5 8 8 C4 11 1 6 0 4Z" fill={muted ?? '#F0D87A'} />
    </AnimatedG>
    <Path d="M0 -3 L0 6 M0 -3 Q-2 -6 -3 -6 M0 -3 Q2 -6 3 -6" stroke={muted ?? '#685731'} strokeWidth={1.2} strokeLinecap="round" fill="none" />
  </AnimatedG>;
}

/** Shared milestone artwork: 9/15/23 flowers and 2/3/5 butterflies. */
export function TulipGarden({ minDays, earned = true, animate = false, width = 260, height = 220 }: {
  minDays: number; earned?: boolean; animate?: boolean; width?: number | string; height?: number | string;
}) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(DURATION);
  const tier = minDays >= 100 ? 2 : minDays >= 60 ? 1 : 0;
  const rowCounts = [[4, 5], [4, 5, 6], [5, 6, 6, 6]][tier];
  const butterflyCount = [2, 3, 5][tier];
  const palette = [isDark ? '#B69AD4' : '#9263B1', '#D9B76B', '#CE8FA7', '#D89D77', isDark ? '#E6DFD4' : '#BEB09E', '#BA737E'];
  const green = earned ? (isDark ? '#8BAF9C' : '#527B68') : colors.textMuted;
  const grass = earned ? (isDark ? '#638B75' : '#71967B') : colors.textMuted;
  const meadow = earned ? (isDark ? '#294C3E' : '#DFEADF') : colors.border;
  // Stagger a compact planting bed; every stem reaches the shared ground plane.
  const flowers = rowCounts.flatMap((count, row) => Array.from({ length: count }, (_, column) => {
    const depth = row / (rowCounts.length - 1);
    const spread = 132 + depth * 26;
    const y = 64 + depth * 42 + [0, 8, -5, 4, -3, 6][column];
    const scale = 0.78 + depth * 0.12;
    return {
      x: 130 - spread / 2 + column * (spread / (count - 1)) + (row % 2 ? 3 : -3),
      y,
      scale,
      stemEnd: (185 + depth * 12 - y) / scale,
      color: column === 0 ? palette[0] : palette[(column + row) % (tier + 4)],
      row,
    };
  }));
  // Land the first butterfly on the front purple tulip; spread the others through the garden.
  const front = flowers.slice(-rowCounts[rowCounts.length - 1]);
  const targets = Array.from({ length: butterflyCount }, (_, index) => front[Math.round(index * (front.length - 1) / (butterflyCount - 1))]);

  useEffect(() => {
    clock.value = animate && !reduceMotion ? 0 : DURATION;
    if (animate && !reduceMotion) clock.value = withTiming(DURATION, { duration: DURATION, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [animate, reduceMotion, tier, clock]);
  const reveal = useAnimatedProps(() => ({
    opacity: interpolate(clock.value, [0, 700], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(clock.value, [0, 900], [5, 0], Extrapolation.CLAMP) }],
  }));

  return <Svg width={width} height={height} viewBox="0 0 260 220" accessible={false}>
    <G opacity={earned ? 1 : 0.5}>
      <AnimatedG animatedProps={reveal}>
        <Path d="M23 190 C30 172 73 166 119 171 C161 161 224 171 238 188 C248 204 196 211 137 211 C73 214 15 206 23 190Z" fill={meadow} />
        {/* Taller edge grasses sit behind the planting, framing the flowers. */}
        <Path d="M39 194 Q26 173 28 151 Q42 167 43 189 Q39 158 49 143 Q53 166 47 192 Q52 174 64 164 Q60 185 51 198Z M211 197 Q200 177 197 161 Q211 169 215 190 Q213 160 225 148 Q226 174 220 193 Q229 176 239 172 Q235 190 223 200Z" fill={grass} opacity={0.7} />
        {flowers.map((flower, index) => <G key={index} transform={`translate(${flower.x},${flower.y}) scale(${flower.scale})`} opacity={flower.row === rowCounts.length - 1 ? 1 : 0.75}>
          <Path d={`M0 ${flower.stemEnd} C-3 77 3 47 0 27`} fill="none" stroke={green} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M0 77 C-15 72 -21 62 -21 52 C-9 59 -2 68 0 77Z M0 62 C14 58 20 46 19 39 C8 46 2 55 0 62Z" fill={green} />
          <Path d="M0 0 C-9 7 -10 16 -8 21 L9 21 C11 14 8 6 0 0Z M-15 8 C-14 25 -11 32 0 33 C13 32 16 22 15 8 C8 10 3 15 0 21 C-4 14 -9 10 -15 8Z" fill={earned ? flower.color : colors.textMuted} />
          <Path d="M-13 11 C-12 23 -8 29 -1 30 C-4 20 -8 14 -13 11Z" fill="#FFFFFF" opacity={0.16} />
        </G>)}
        {/* Overlapping grass tufts conceal stem ends and connect the garden bed. */}
        {Array.from({ length: 15 }, (_, index) => {
          const x = 29 + index * 14;
          const y = 199 + Math.sin(index * 1.7) * 4;
          const tall = 15 + (index % 4) * 3;
          return <Path key={`grass-${index}`} transform={`translate(${x},${y})`}
            d={`M-7 0 Q-12 -10 -12 -17 Q-3 -12 0 -2 Q-3 -${tall} 3 -${tall + 7} Q7 -14 4 -2 Q10 -15 16 -17 Q13 -5 8 2Z`}
            fill={index % 3 === 0 ? green : grass} opacity={0.8} />;
        })}
        <Path d="M48 204 Q79 209 101 207 M159 207 Q192 208 213 201" fill="none" stroke={green} strokeWidth={1.4} strokeLinecap="round" opacity={0.3} />
      </AnimatedG>
      {targets.map((flower, index) => <GardenButterfly key={index} clock={clock} x={flower.x + 4 * flower.scale} y={flower.y + 13 * flower.scale} index={index} muted={earned ? undefined : colors.textMuted} />)}
    </G>
  </Svg>;
}
