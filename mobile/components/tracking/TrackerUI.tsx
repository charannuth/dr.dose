import { useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, withAlpha } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { tapFeedback } from '../../lib/haptics';

/**
 * Shared building blocks for every tracker panel: collapsible section cards,
 * colorful chips, 0–10 / 1–5 scales, toggles and gentle notice cards.
 */

function makeStyles(colors: ColorPalette) {
  return {
    card: {
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.sm + 4,
      overflow: 'hidden' as const,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconText: { fontSize: 18 },
    title: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
    summary: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    chevron: { fontSize: 14, color: colors.textMuted, paddingLeft: 4 },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    explainer: {
      borderRadius: radii.md,
      padding: 12,
      marginBottom: spacing.sm + 4,
    },
    explainerText: { fontSize: 13, lineHeight: 19, color: colors.text },
    whatsThis: { fontSize: 13, fontWeight: '600' as const, marginBottom: spacing.sm },
    subLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textMuted,
      marginBottom: 6,
      marginTop: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
    },
    chipWrap: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      marginBottom: spacing.sm + 4,
    },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipText: { fontSize: 14, color: colors.text },
    chipTextActive: { fontWeight: '700' as const, color: '#fff' },
    chipEmoji: { fontSize: 15 },
    scaleRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: 4,
    },
    scaleDot: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
    },
    scaleText: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
    scaleEnds: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: 4,
      marginBottom: spacing.sm + 4,
    },
    scaleEndText: { fontSize: 12, color: colors.textMuted },
    toggleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 8,
    },
    toggleLabel: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
    toggleHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    notice: {
      flexDirection: 'row' as const,
      gap: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: 12,
      marginBottom: spacing.sm + 4,
    },
    noticeTitle: { fontSize: 14, fontWeight: '700' as const, color: colors.text, marginBottom: 2 },
    noticeBody: { fontSize: 13, lineHeight: 19, color: colors.text },
  };
}

export function useTrackerUIStyles() {
  return useThemedStyles(makeStyles);
}

type SectionCardProps = {
  emoji: string;
  title: string;
  accent: string;
  summary?: string | null;
  explainer?: string;
  /** Show the explainer open by default (teen / learning mode). */
  showExplainer?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SectionCard({
  emoji,
  title,
  accent,
  summary,
  explainer,
  showExplainer,
  defaultOpen = true,
  children,
}: SectionCardProps) {
  const styles = useTrackerUIStyles();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [explainerOpen, setExplainerOpen] = useState(Boolean(showExplainer));
  return (
    <View
      style={[
        styles.card,
        { borderColor: withAlpha(accent, open ? 0.45 : 0.25) },
      ]}
    >
      <Pressable
        style={[styles.header, open && { backgroundColor: withAlpha(accent, isDark ? 0.14 : 0.08) }]}
        onPress={() => {
          tapFeedback();
          setOpen((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${summary ? `, ${summary}` : ''}`}
      >
        <View style={[styles.iconTile, { backgroundColor: withAlpha(accent, isDark ? 0.3 : 0.18) }]}>
          <Text style={styles.iconText}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {summary ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.body, { paddingTop: 12 }]}>
          {explainer ? (
            explainerOpen ? (
              <Pressable
                onPress={() => setExplainerOpen(false)}
                style={[styles.explainer, { backgroundColor: withAlpha(accent, isDark ? 0.18 : 0.1) }]}
                accessibilityHint="Hides this explanation"
              >
                <Text style={styles.explainerText}>💡 {explainer}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setExplainerOpen(true)} hitSlop={6}>
                <Text style={[styles.whatsThis, { color: accent }]}>What's this?</Text>
              </Pressable>
            )
          ) : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function SubLabel({ children }: { children: ReactNode }) {
  const styles = useTrackerUIStyles();
  return <Text style={styles.subLabel}>{children}</Text>;
}

export type ChipOption = string | { value: string; label?: string; emoji?: string };

function optionParts(opt: ChipOption): { value: string; label: string; emoji?: string } {
  if (typeof opt === 'string') return { value: opt, label: opt };
  return { value: opt.value, label: opt.label ?? opt.value, emoji: opt.emoji };
}

type ChipsProps = {
  options: readonly ChipOption[];
  accent: string;
  disabled?: boolean;
} & (
  | { multiple: true; selected: string[]; onChange: (next: string[]) => void }
  | { multiple?: false; selected: string | undefined; onChange: (next: string | undefined) => void }
);

/** Colorful single- or multi-select chips. Tapping a selected single chip clears it. */
export function Chips(props: ChipsProps) {
  const styles = useTrackerUIStyles();
  const { options, accent, disabled } = props;
  const isSelected = (value: string) =>
    props.multiple ? props.selected.includes(value) : props.selected === value;
  function press(value: string) {
    tapFeedback();
    if (props.multiple) {
      const next = props.selected.includes(value)
        ? props.selected.filter((v) => v !== value)
        : [...props.selected, value];
      props.onChange(next);
    } else {
      props.onChange(props.selected === value ? undefined : value);
    }
  }
  return (
    <View style={[styles.chipWrap, disabled && { opacity: 0.5 }]}>
      {options.map((opt) => {
        const { value, label, emoji } = optionParts(opt);
        const active = isSelected(value);
        return (
          <Pressable
            key={value}
            disabled={disabled}
            onPress={() => press(value)}
            style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
            accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={label}
          >
            {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ScaleProps = {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  accent: string;
  lowLabel: string;
  highLabel: string;
  /** Optional face per value, e.g. moods. */
  emojis?: string[];
  disabled?: boolean;
  label: string;
};

export function ScaleRow({
  min,
  max,
  value,
  onChange,
  accent,
  lowLabel,
  highLabel,
  emojis,
  disabled,
  label,
}: ScaleProps) {
  const styles = useTrackerUIStyles();
  const { colors } = useTheme();
  const steps: number[] = [];
  for (let n = min; n <= max; n++) steps.push(n);
  return (
    <View style={disabled ? { opacity: 0.5 } : undefined}>
      <View style={styles.scaleRow} accessibilityRole="adjustable" accessibilityLabel={label}>
        {steps.map((n, i) => {
          const active = value === n;
          // Fill deepens with the value so the row reads as a gradient.
          const strength = 0.12 + (0.5 * (n - min)) / Math.max(1, max - min);
          return (
            <Pressable
              key={n}
              disabled={disabled}
              onPress={() => {
                tapFeedback();
                onChange(active ? undefined : n);
              }}
              style={[
                styles.scaleDot,
                {
                  backgroundColor: active ? accent : withAlpha(accent, strength * 0.5),
                  borderColor: active ? accent : withAlpha(accent, 0.3),
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label} ${n}`}
            >
              <Text style={[styles.scaleText, active && { color: '#fff' }]}>
                {emojis?.[i] ?? n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleEnds}>
        <Text style={styles.scaleEndText}>{lowLabel}</Text>
        <Text style={[styles.scaleEndText, { color: colors.textMuted }]}>{highLabel}</Text>
      </View>
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  accent: string;
  disabled?: boolean;
  emoji?: string;
};

export function ToggleRow({ label, hint, value, onChange, accent, disabled, emoji }: ToggleRowProps) {
  const styles = useTrackerUIStyles();
  return (
    <View style={[styles.toggleRow, disabled && { opacity: 0.5 }]}>
      {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          tapFeedback();
          onChange(v);
        }}
        disabled={disabled}
        trackColor={{ true: accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

type NoticeProps = {
  emoji: string;
  title?: string;
  body: string;
  accent: string;
};

export function NoticeCard({ emoji, title, body, accent }: NoticeProps) {
  const styles = useTrackerUIStyles();
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: withAlpha(accent, isDark ? 0.16 : 0.09), borderColor: withAlpha(accent, 0.4) },
      ]}
      accessibilityRole="text"
    >
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.noticeTitle}>{title}</Text> : null}
        <Text style={styles.noticeBody}>{body}</Text>
      </View>
    </View>
  );
}

/** Round − n + counter. */
export function Stepper({
  value,
  onChange,
  accent,
  max = 30,
}: {
  value: number;
  onChange: (n: number) => void;
  accent: string;
  max?: number;
}) {
  const { colors } = useTheme();
  const btn = {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
      <Pressable
        style={btn}
        onPress={() => {
          tapFeedback();
          onChange(Math.max(0, value - 1));
        }}
        accessibilityLabel="Fewer"
      >
        <Text style={{ fontSize: 20, color: accent }}>−</Text>
      </Pressable>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 28, textAlign: 'center' }}>
        {value}
      </Text>
      <Pressable
        style={btn}
        onPress={() => {
          tapFeedback();
          onChange(Math.min(max, value + 1));
        }}
        accessibilityLabel="More"
      >
        <Text style={{ fontSize: 20, color: accent }}>＋</Text>
      </Pressable>
    </View>
  );
}
