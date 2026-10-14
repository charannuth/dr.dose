import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, withAlpha } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { tapFeedback } from '../../lib/haptics';

const RING = 92;
const STROKE = 9;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

export type HeroPill = { label: string; color?: string };

type Props = {
  accent: string;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  /** 0–1; omit to show the center text without a progress arc. */
  progress?: number | null;
  centerValue: string;
  centerCaption?: string;
  pills?: HeroPill[];
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

function makeStyles(colors: ColorPalette) {
  return {
    card: {
      borderRadius: radii.xl,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md },
    ring: { width: RING, height: RING, alignItems: 'center' as const, justifyContent: 'center' as const },
    center: { position: 'absolute' as const, alignItems: 'center' as const },
    centerValue: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
    centerCaption: { fontSize: 11, color: colors.textMuted, marginTop: -2 },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    title: { fontFamily: fonts.heading, fontSize: 19, color: colors.text, marginTop: 2 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
    pills: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: spacing.sm + 4 },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    pillText: { fontSize: 12, fontWeight: '700' as const },
    action: {
      alignSelf: 'flex-start' as const,
      marginTop: spacing.sm + 4,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    actionText: { fontSize: 13, fontWeight: '700' as const, color: '#fff' },
  };
}

/** Colorful summary card at the top of a tracker panel. */
export function TrackerHero({
  accent,
  eyebrow,
  title,
  subtitle,
  progress,
  centerValue,
  centerCaption,
  pills,
  actionLabel,
  onAction,
  children,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const clamped = progress == null ? null : Math.min(1, Math.max(0, progress));
  return (
    <LinearGradient
      colors={[withAlpha(accent, isDark ? 0.4 : 0.28), colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: withAlpha(accent, 0.5) }]}
    >
      <View style={styles.row}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={withAlpha(accent, 0.22)}
              strokeWidth={STROKE}
              fill="none"
            />
            {clamped != null ? (
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={accent}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - clamped)}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            ) : null}
          </Svg>
          <View style={styles.center}>
            <Text style={styles.centerValue}>{centerValue}</Text>
            {centerCaption ? <Text style={styles.centerCaption}>{centerCaption}</Text> : null}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {pills && pills.length > 0 ? (
        <View style={styles.pills}>
          {pills.map((p) => {
            const c = p.color ?? accent;
            return (
              <View key={p.label} style={[styles.pill, { backgroundColor: withAlpha(c, isDark ? 0.3 : 0.18) }]}>
                <Text style={[styles.pillText, { color: isDark ? colors.text : c }]}>{p.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {children}
      {actionLabel && onAction ? (
        <Pressable
          style={[styles.action, { backgroundColor: accent }]}
          onPress={() => {
            tapFeedback();
            onAction();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}
