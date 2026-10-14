import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const SWEEP_MS = 3200;
const REST_MS = 9000;
const BAND = 160;

/**
 * A wide, faint gloss that drifts diagonally across a tile now and then.
 * `delay` staggers neighbouring tiles so the shine ripples across the grid.
 */
export function ShineSweep({ delay = 0, radius = 20 }: { delay?: number; radius?: number }) {
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || !size.width) return;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: REST_MS }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress, reducedMotion, size.width]);

  // The band is tilted, so it has to start and finish fully outside the tile.
  const travel = size.width + size.height + BAND * 2;
  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -size.height - BAND + progress.value * travel },
      { rotate: '24deg' },
    ],
  }));

  if (reducedMotion) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
    >
      {size.width ? (
        <Animated.View
          style={[
            { position: 'absolute', top: -size.height, width: BAND, height: size.height * 3 },
            bandStyle,
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
