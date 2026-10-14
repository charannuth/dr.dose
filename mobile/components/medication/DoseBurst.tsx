import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PARTICLES = 10;
const DURATION_MS = 700;

type Particle = { angle: number; distance: number; size: number; color: string; round: boolean };

function buildParticles(colors: string[]): Particle[] {
  return Array.from({ length: PARTICLES }, (_, i) => ({
    // Even spread with a little jitter so it reads as confetti, not a clock face.
    angle: (i / PARTICLES) * Math.PI * 2 + (i % 2 ? 0.25 : -0.15),
    distance: 26 + (i % 3) * 9,
    size: 5 + (i % 3) * 1.5,
    color: colors[i % colors.length],
    round: i % 2 === 0,
  }));
}

function Piece({ particle, progress }: { particle: Particle; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const travel = particle.distance * p;
    return {
      opacity: p === 0 ? 0 : 1 - p * p,
      transform: [
        { translateX: Math.cos(particle.angle) * travel },
        // A touch of gravity so pieces arc down as they fade.
        { translateY: Math.sin(particle.angle) * travel + 10 * p * p },
        { rotate: `${p * 220}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: particle.size,
          height: particle.round ? particle.size : particle.size * 1.8,
          borderRadius: particle.round ? particle.size / 2 : 1.5,
          backgroundColor: particle.color,
          marginLeft: -particle.size / 2,
          marginTop: -particle.size / 2,
        },
        style,
      ]}
    />
  );
}

/**
 * Confetti pop centered on its parent. Bump `trigger` to fire it again; 0 means
 * "never fired", so a freshly mounted row stays still.
 */
export function DoseBurst({ trigger, colors }: { trigger: number; colors: string[] }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [trigger, progress]);

  const particles = buildParticles(colors);
  return (
    <View pointerEvents="none" style={styles.origin}>
      {particles.map((particle, i) => (
        <Piece key={i} particle={particle} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
    overflow: 'visible',
  },
  piece: {
    position: 'absolute',
  },
});
