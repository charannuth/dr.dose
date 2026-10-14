import { Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { withAlpha } from '../../constants/theme';
import type { CycleInsights } from '../../lib/tracking/cycleInsights';
import { NoticeCard, SectionCard, SubLabel, useTrackerUIStyles } from './TrackerUI';

type Props = {
  insights: CycleInsights;
  word: string;
};

const REGULARITY_COPY: Record<NonNullable<CycleInsights['regularity']>, string> = {
  regular: 'Your recent cycles are pretty steady (they vary by a week or less).',
  variable: 'Your cycles vary a bit. Totally common, especially with stress, travel or in your teens.',
  irregular:
    'Your cycles vary a lot. Predictions are rougher, and if this is new for you it is worth mentioning to a clinician.',
};

export function CycleInsightsCard({ insights, word }: Props) {
  const { colors } = useTheme();
  const ui = useTrackerUIStyles();
  const accent = colors.accentPurple;
  const maxLen = Math.max(35, ...insights.cycleLengths);
  const hasHistory = insights.cycleLengths.length > 0 || insights.avgPeriodLength != null;
  const summary = insights.avgCycle
    ? `Avg cycle ${insights.avgCycle} days`
    : hasHistory
      ? 'Building your patterns'
      : 'Log a couple of cycles to see patterns';

  return (
    <SectionCard emoji="📊" title="Your patterns" accent={accent} summary={summary} defaultOpen={hasHistory}>
      {insights.flags.map((f) => (
        <NoticeCard key={f.id} emoji="🩺" title={f.title} body={f.body} accent={colors.accentAmber} />
      ))}

      {insights.cycleLengths.length > 0 ? (
        <>
          <SubLabel>Recent cycle lengths</SubLabel>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96, marginBottom: 6 }}>
            {insights.cycleLengths.map((len, i) => {
              const last = i === insights.cycleLengths.length - 1;
              return (
                <View key={`${i}-${len}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>{len}</Text>
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(8, (len / maxLen) * 72),
                      borderRadius: 8,
                      backgroundColor: last ? accent : withAlpha(accent, 0.4),
                    }}
                  />
                </View>
              );
            })}
          </View>
          <Text style={[ui.toggleHint, { marginBottom: 10 }]}>Oldest to newest, in days.</Text>
        </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Stat label="Avg cycle" value={insights.avgCycle ? `${insights.avgCycle}d` : '—'} accent={accent} />
        <Stat
          label={`Avg ${word}`}
          value={insights.avgPeriodLength ? `${insights.avgPeriodLength}d` : '—'}
          accent={colors.accentRed}
        />
        <Stat
          label="Range"
          value={
            insights.shortestCycle != null && insights.longestCycle != null && insights.cycleLengths.length > 1
              ? `${insights.shortestCycle}–${insights.longestCycle}`
              : '—'
          }
          accent={colors.accentBlue}
        />
      </View>

      {insights.regularity ? <Text style={[ui.noticeBody, { marginBottom: 12 }]}>{REGULARITY_COPY[insights.regularity]}</Text> : null}

      {insights.topSymptoms.length > 0 ? (
        <>
          <SubLabel>Most logged lately</SubLabel>
          <View style={ui.chipWrap}>
            {insights.topSymptoms.map((s) => (
              <View key={s.label} style={[ui.chip, { borderColor: withAlpha(accent, 0.4) }]}>
                <Text style={ui.chipText}>
                  {s.label} · {s.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </SectionCard>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: withAlpha(accent, isDark ? 0.2 : 0.1),
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const BASICS: { title: string; body: string }[] = [
  {
    title: 'What is a cycle?',
    body: 'Your cycle starts on the first day of bleeding and ends the day before the next one. Hormones rise and fall through it, which is why energy, mood and skin can change from week to week.',
  },
  {
    title: 'The four phases',
    body: 'Menstrual (bleeding), follicular (energy often builds), ovulation (an egg is released, mid-cycle) and luteal (the week or two before your next period, when PMS can show up).',
  },
  {
    title: "What's typical",
    body: 'Bleeding usually lasts 2 to 7 days. Adult cycles are usually 21 to 35 days; in the first few years after your first period, 21 to 45 days is common and cycles can be unpredictable.',
  },
  {
    title: 'When to check in with a doctor',
    body: 'No period by age 15, soaking a pad or tampon every hour for several hours, bleeding longer than 7 days, pain that stops you doing normal things, or no period for 3 months. Asking is always okay.',
  },
];

export function CycleBasicsCard() {
  const { colors } = useTheme();
  const ui = useTrackerUIStyles();
  return (
    <SectionCard emoji="📚" title="Body basics" accent={colors.accentGreen} summary="Quick, judgment-free answers" defaultOpen={false}>
      {BASICS.map((b) => (
        <View key={b.title} style={{ marginBottom: 12 }}>
          <Text style={ui.toggleLabel}>{b.title}</Text>
          <Text style={[ui.noticeBody, { marginTop: 2 }]}>{b.body}</Text>
        </View>
      ))}
    </SectionCard>
  );
}
