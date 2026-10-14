import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, radii, spacing, withAlpha, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { tapFeedback } from '../../lib/haptics';
import type { WeekStat, WellnessInsight } from '../../lib/wellnessSummary';

function statColor(key: WeekStat['key'], colors: ColorPalette): string {
  if (key === 'sleep') return colors.accentPurple;
  if (key === 'energy') return colors.accentAmber;
  return colors.accentGreen;
}

function Sparkline({ series, max, color, empty }: { series: (number | null)[]; max: number; color: string; empty: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 26 }}>
      {series.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: v == null ? 3 : Math.max(5, (Math.min(v, max) / max) * 26),
            borderRadius: 2,
            backgroundColor: v == null ? empty : color,
            opacity: v == null ? 1 : 0.55 + 0.45 * (i / Math.max(1, series.length - 1)),
          }}
        />
      ))}
    </View>
  );
}

function deltaLabel(stat: WeekStat): string | null {
  if (stat.delta == null || stat.delta === 0) return null;
  const arrow = stat.delta > 0 ? '↑' : '↓';
  const n = Math.abs(stat.delta);
  return stat.key === 'logged' ? `${arrow} ${n}` : `${arrow} ${n}${stat.unit}`;
}

/**
 * The top of the Wellness page: this week at a glance (sleep, energy, days
 * logged with 7-day sparklines and week-over-week change) and the single most
 * useful insight, with the rest one tap away.
 */
export function WellnessWeekCard({ stats, insights }: { stats: WeekStat[]; insights: WellnessInsight[] }) {
  const { colors, isDark } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [showAll, setShowAll] = useState(false);
  const [top, ...rest] = insights;
  const toneColor = (t: WellnessInsight['tone']) =>
    t === 'good' ? colors.accentGreen : t === 'watch' ? colors.accentAmber : colors.accentBlue;

  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>THIS WEEK</Text>
      <View style={s.stats}>
        {stats.map((stat) => {
          const color = statColor(stat.key, colors);
          const delta = deltaLabel(stat);
          // More sleep, energy and logging are all good directions.
          const deltaColor = stat.delta != null && stat.delta < 0 ? colors.textMuted : color;
          return (
            <View key={stat.key} style={s.stat} accessible accessibilityLabel={`${stat.label} ${stat.value}${delta ? `, ${delta} vs last week` : ''}`}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={[s.statValue, { color }]}>{stat.value}</Text>
              <Sparkline series={stat.series} max={stat.max} color={color} empty={withAlpha(colors.textMuted, isDark ? 0.3 : 0.2)} />
              <Text style={[s.delta, { color: deltaColor }]}>{delta ?? ' '}</Text>
            </View>
          );
        })}
      </View>

      {top ? (
        <View style={[s.insight, { backgroundColor: withAlpha(toneColor(top.tone), isDark ? 0.16 : 0.1) }]}>
          <Text style={s.insightEmoji}>{top.emoji}</Text>
          <Text style={s.insightText}>{top.text}</Text>
        </View>
      ) : null}

      {showAll
        ? rest.map((i) => (
            <View key={i.id} style={s.moreRow}>
              <Text style={s.insightEmoji}>{i.emoji}</Text>
              <Text style={s.moreText}>{i.text}</Text>
            </View>
          ))
        : null}

      {rest.length ? (
        <Pressable
          onPress={() => {
            tapFeedback();
            setShowAll((v) => !v);
          }}
          accessibilityRole="button"
          style={s.seeAll}
        >
          <Text style={s.seeAllText}>{showAll ? 'Show less' : `See ${rest.length} more insight${rest.length === 1 ? '' : 's'}`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.lg, gap: 14 },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
    stats: { flexDirection: 'row' as const, gap: 14 },
    stat: { flex: 1, gap: 4 },
    statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    statValue: { fontFamily: fonts.heading, fontSize: 22 },
    delta: { fontFamily: fonts.bodySemibold, fontSize: 11 },
    insight: { flexDirection: 'row' as const, gap: 10, padding: 12, borderRadius: radii.md, alignItems: 'flex-start' as const },
    insightEmoji: { fontSize: 18, lineHeight: 22 },
    insightText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: c.text },
    moreRow: { flexDirection: 'row' as const, gap: 10, paddingHorizontal: 12, alignItems: 'flex-start' as const },
    moreText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    seeAll: { alignSelf: 'flex-start' as const, paddingVertical: 2, minHeight: 32, justifyContent: 'center' as const },
    seeAllText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.accent },
  };
}
