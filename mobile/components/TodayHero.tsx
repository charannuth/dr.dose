import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 76;
const RING_STROKE = 7;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function makeStyles(colors: ColorPalette) {
  return {
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      // Depth instead of a border: the hero should sit above the cards below it.
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ringLabel: {
      position: 'absolute' as const,
      alignItems: 'center' as const,
    },
    ringValue: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.text,
    },
    ringUnit: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.4,
    },
    body: { flex: 1, gap: 3 },
    headline: {
      fontFamily: fonts.heading,
      fontSize: 19,
      color: colors.text,
    },
    detail: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 19,
    },
    footer: {
      marginTop: 2,
    },
  };
}

type Props = {
  /** Doses logged so far out of what is scheduled. Both zero hides the ring. */
  taken: number;
  total: number;
  headline: string;
  detail: string;
  accent: string;
  /** Streak snippet or similar, rendered under the detail line. */
  footer?: ReactNode;
};

export function TodayHero({ taken, total, headline, detail, accent, footer }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const ratio = total > 0 ? Math.min(taken / total, 1) : 0;
  // Spring the dash offset so logging a dose sweeps the ring instead of jumping.
  const progress = useDerivedValue(
    () => withSpring(ratio, { damping: 20, stiffness: 120 }),
    [ratio],
  );
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.card}>
      {total > 0 ? (
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={colors.border}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={accent}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              // Start the sweep at 12 o'clock rather than 3 o'clock.
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringLabel}>
            <Text style={styles.ringValue}>
              {taken}/{total}
            </Text>
            <Text style={styles.ringUnit}>DOSES</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}
