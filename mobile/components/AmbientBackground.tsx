import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeProvider';

type Glow = {
  id: string;
  color: string;
  size: number;
  /** Resting position as fractions of the screen. */
  x: number;
  y: number;
  /** How far it drifts, in points, and how long one pass takes. */
  driftX: number;
  driftY: number;
  duration: number;
};

function SoftGlow({ glow, opacity, still }: { glow: Glow; opacity: number; still: boolean }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    t.value = withRepeat(
      withTiming(1, { duration: glow.duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [glow.duration, still, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * glow.driftX },
      { translateY: (t.value - 0.5) * glow.driftY },
      { scale: 1 + t.value * 0.08 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: width * glow.x - glow.size / 2,
          top: height * glow.y - glow.size / 2,
          width: glow.size,
          height: glow.size,
          opacity,
        },
        style,
      ]}
    >
      <Svg width={glow.size} height={glow.size}>
        <Defs>
          <RadialGradient id={glow.id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glow.color} stopOpacity={1} />
            <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={glow.size} height={glow.size} fill={`url(#${glow.id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The app's canvas: the theme background with a few soft color glows that
 * drift very slowly. It sits behind every screen and never takes touches.
 */
export function AmbientBackground() {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const big = Math.max(width * 1.1, 360);
  const opacity = isDark ? 0.22 : 0.3;

  const glows: Glow[] = [
    { id: 'glow-a', color: colors.accentPurple, size: big, x: 0.05, y: 0.12, driftX: 60, driftY: 40, duration: 18000 },
    { id: 'glow-b', color: colors.accentBlue, size: big * 0.9, x: 1.0, y: 0.5, driftX: -50, driftY: 70, duration: 23000 },
    { id: 'glow-c', color: colors.accentGreen, size: big * 0.8, x: 0.2, y: 0.95, driftX: 70, driftY: -40, duration: 27000 },
  ];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      {glows.map((glow) => (
        <SoftGlow key={glow.id} glow={glow} opacity={opacity} still={reducedMotion} />
      ))}
    </View>
  );
}

/** Navigator `screenLayout`: paints the ambient canvas under each screen. */
export function AmbientScreenLayout({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fill}>
      <AmbientBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
