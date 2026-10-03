import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { TulipGarden } from './TulipGarden';
import { useTheme } from '../../context/ThemeProvider';

const AnimatedG = Animated.createAnimatedComponent(G);
const DURATION = 4100;
const ARRIVAL = 3300;

/** A quiet entrance, one curved flight, and a settled butterfly. No looping motion. */
export function StreakCelebrationScene({ dual, minDays = 1 }: { dual: boolean; minDays?: number }) {
  if (minDays >= 30) return <View accessible accessibilityRole="image" accessibilityLabel="Yellow butterflies land in a garden of tulips" style={{ width: '100%', maxWidth: 260, aspectRatio: 260 / 220 }}>
    <TulipGarden minDays={minDays} animate width="100%" height="100%" />
  </View>;
  return <SingleBloomScene dual={dual} />;
}

function SingleBloomScene({ dual }: { dual: boolean }) {
  const { isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const clock = useSharedValue(reducedMotion ? DURATION : 0);
  const purple = isDark ? '#B69AD4' : '#9263B1';
  const green = isDark ? '#8BAF9C' : '#527B68';

  useEffect(() => {
    clock.value = reducedMotion ? DURATION : 0;
    if (!reducedMotion) {
      clock.value = withTiming(DURATION, { duration: DURATION, easing: Easing.linear });
    }
    return () => cancelAnimation(clock);
  }, [clock, dual, reducedMotion]);

  const flowerProps = useAnimatedProps(() => ({
    opacity: interpolate(clock.value, [0, 650], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(clock.value, [0, 900], [6, 0], Extrapolation.CLAMP) }],
  }));

  const butterflyProps = useAnimatedProps(() => {
    const t = interpolate(clock.value, [850, ARRIVAL], [0, 1], Extrapolation.CLAMP);
    // Smoothstep stops the flight gently at the petal, without overshooting.
    const p = t * t * (3 - 2 * t);
    const q = 1 - p;
    const x = q * q * q * 221 + 3 * q * q * p * 185 + 3 * q * p * p * 135 + p * p * p * 126;
    const y = q * q * q * 114 + 3 * q * q * p * 36 + 3 * q * p * p * 35 + p * p * p * 66;
    return {
      opacity: interpolate(clock.value, [850, 1150], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${-18 + 10 * p}deg` }],
    };
  });

  const wingProps = useAnimatedProps(() => {
    const elapsed = Math.max(0, clock.value - 850);
    const settling = interpolate(clock.value, [ARRIVAL - 200, DURATION], [1, 0], Extrapolation.CLAMP);
    const fold = 0.72 + Math.sin(elapsed / 95) * 0.22 * settling;
    return { transform: [{ scaleX: fold }] };
  });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="A yellow butterfly lands on a purple tulip" style={{ width: '100%', maxWidth: 260, aspectRatio: 260 / 220 }}>
      <Svg width="100%" height="100%" viewBox="0 0 260 220" accessible={false}>
        <AnimatedG animatedProps={flowerProps}>
          {dual ? <G opacity={0.7}>
            <Path d="M137 196 C139 162 156 142 160 110" fill="none" stroke={green} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M159 85 C149 91 149 100 152 106 L169 106 C171 98 169 90 159 85Z" fill="#D9B76B" />
            <Path d="M144 94 C146 111 148 117 160 118 C174 117 178 106 177 94 C168 96 163 101 160 106 C156 100 151 96 144 94Z" fill="#D9B76B" />
          </G> : null}
          <Path d="M121 197 C116 163 124 131 119 96" fill="none" stroke={green} strokeWidth={3} strokeLinecap="round" />
          <Path d="M120 174 C95 167 83 146 85 132 C104 141 115 154 120 174Z" fill={green} />
          <Path d="M121 151 C144 145 153 127 151 115 C135 124 126 138 121 151Z" fill={green} opacity={0.8} />
          <Path d="M119 48 C104 60 101 74 106 87 L133 87 C138 73 132 58 119 48Z" fill={purple} />
          <Path d="M95 61 C97 85 99 101 119 102 C142 101 145 83 144 61 C132 64 124 72 119 82 C112 70 104 64 95 61Z" fill={purple} />
          <Path d="M97 64 C99 86 104 95 118 98 C114 80 107 70 97 64Z" fill="#FFFFFF" opacity={0.16} />
          <Path d="M121 98 C134 90 140 79 143 64" fill="none" stroke={isDark ? '#FFFFFF' : '#38223D'} strokeOpacity={0.12} strokeWidth={1.5} strokeLinecap="round" />
        </AnimatedG>
        <AnimatedG animatedProps={butterflyProps}>
          <AnimatedG animatedProps={wingProps}>
            <Path d="M0 0 C-8 -23 -27 -25 -26 -11 C-25 -2 -13 3 0 4Z" fill="#E6C34C" />
            <Path d="M0 4 C-14 -1 -23 5 -18 13 C-13 19 -4 13 0 6Z" fill="#F0D87A" />
            <Path d="M0 0 C6 -19 18 -23 20 -12 C22 -5 11 2 0 4Z" fill="#F0D87A" />
            <Path d="M0 4 C11 0 17 4 14 11 C10 16 3 11 0 6Z" fill="#E6C34C" />
          </AnimatedG>
          <Path d="M0 -5 Q-1 1 0 10 M0 -5 Q-3 -10 -5 -10 M0 -5 Q3 -10 5 -10" fill="none" stroke="#685731" strokeWidth={1.8} strokeLinecap="round" />
        </AnimatedG>
      </Svg>
    </View>
  );
}
