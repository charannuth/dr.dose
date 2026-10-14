import { createContext, useContext, useEffect, type ComponentProps, type ReactNode, type Ref } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { withAlpha, type AccentKey } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';

/** Scroll offset of the current screen, written by AmbientScrollView. */
const AmbientScrollContext = createContext<SharedValue<number> | null>(null);

type Orb = {
  accent: AccentKey;
  /** Diameter as a fraction of screen width. */
  size: number;
  /** Horizontal center as a fraction of screen width. */
  x: number;
  /** Vertical position as a fraction of the wrap span. */
  y: number;
  /** How much slower than the content the orb scrolls (0 = fixed, 1 = with content). */
  depth: number;
  phase: number;
};

// Spread across both sides and the full height so the whole page carries color.
const ORBS: Orb[] = [
  { accent: 'accentPurple', size: 0.75, x: 0.1, y: 0.02, depth: 0.18, phase: 0 },
  { accent: 'accentBlue', size: 0.6, x: 0.92, y: 0.14, depth: 0.3, phase: 1.3 },
  { accent: 'accentGreen', size: 0.5, x: 0.35, y: 0.3, depth: 0.42, phase: 2.1 },
  { accent: 'accentRed', size: 0.55, x: 0.85, y: 0.44, depth: 0.22, phase: 3.4 },
  { accent: 'accentAmber', size: 0.45, x: 0.08, y: 0.56, depth: 0.36, phase: 4.2 },
  { accent: 'accentPurple', size: 0.65, x: 0.6, y: 0.68, depth: 0.26, phase: 5.0 },
  { accent: 'accentBlue', size: 0.5, x: 0.15, y: 0.82, depth: 0.4, phase: 0.7 },
  { accent: 'accentGreen', size: 0.6, x: 0.9, y: 0.92, depth: 0.2, phase: 2.8 },
];

const FLOAT_MS = 24000;

function AmbientOrb({
  orb,
  color,
  opacity,
  scrollY,
  clock,
  still,
}: {
  orb: Orb;
  color: string;
  opacity: number;
  scrollY: SharedValue<number>;
  clock: SharedValue<number>;
  still: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const size = width * orb.size;
  // Orbs live on a loop taller than the screen and wrap off-screen, so a long
  // page never scrolls them all away.
  const span = height + size * 2;
  const baseY = orb.y * span - size;
  const id = `orb-${orb.accent}-${orb.x}-${orb.y}`;

  const style = useAnimatedStyle(() => {
    if (still) return { transform: [{ translateY: baseY }] };
    const angle = clock.value * Math.PI * 2 + orb.phase;
    const travelled = baseY + size - scrollY.value * orb.depth;
    const wrapped = (((travelled % span) + span) % span) - size;
    return {
      transform: [
        { translateX: Math.sin(angle) * 14 },
        { translateY: wrapped + Math.cos(angle) * 10 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: width * orb.x - size / 2, width: size, height: size, opacity },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The app's canvas: a full-page color wash plus soft orbs spread over the
 * whole screen. The orbs float slowly and drift at different depths as the
 * page scrolls, which gives a calm parallax. It never takes touches, and it
 * holds still when Reduce Motion is on.
 */
export function AmbientBackground({ paused = false }: { paused?: boolean }) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  // Screens kept alive in the background don't need to animate.
  const still = reducedMotion || paused;
  const contextScroll = useContext(AmbientScrollContext);
  const fallbackScroll = useSharedValue(0);
  const scrollY = contextScroll ?? fallbackScroll;
  const clock = useSharedValue(0);
  const orbOpacity = isDark ? 0.16 : 0.2;

  useEffect(() => {
    if (still) return;
    // Resume from where the float paused so orbs don't jump.
    const from = clock.value % 1;
    clock.value = from;
    clock.value = withRepeat(
      withTiming(from + 1, { duration: FLOAT_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [clock, still]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[
          withAlpha(colors.accentPurple, isDark ? 0.1 : 0.12),
          withAlpha(colors.accentBlue, isDark ? 0.04 : 0.05),
          withAlpha(colors.accentGreen, isDark ? 0.08 : 0.1),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {ORBS.map((orb, index) => (
        <AmbientOrb
          key={index}
          orb={orb}
          color={colors[orb.accent]}
          opacity={orbOpacity}
          scrollY={scrollY}
          clock={clock}
          still={reducedMotion}
        />
      ))}
    </View>
  );
}

/** Navigator `screenLayout`: paints the ambient canvas under each screen. */
export function AmbientScreenLayout({ children }: { children: ReactNode }) {
  const scrollY = useSharedValue(0);
  const focused = useIsFocused();
  return (
    <AmbientScrollContext.Provider value={scrollY}>
      <View style={styles.fill}>
        <AmbientBackground paused={!focused} />
        {children}
      </View>
    </AmbientScrollContext.Provider>
  );
}

/** ScrollView that also feeds its offset to the ambient background's parallax. */
export function AmbientScrollView({
  onScroll,
  scrollEventThrottle,
  ref,
  ...props
}: ComponentProps<typeof ScrollView> & { ref?: Ref<ScrollView> }) {
  const scrollY = useContext(AmbientScrollContext);
  return (
    <ScrollView
      {...props}
      ref={ref}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      onScroll={(event) => {
        if (scrollY) scrollY.value = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
