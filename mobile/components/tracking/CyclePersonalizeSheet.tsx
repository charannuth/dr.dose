import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { withAlpha } from '../../constants/theme';
import { tapFeedback } from '../../lib/haptics';
import {
  BIRTH_CONTROL_OPTIONS,
  CONDITION_OPTIONS,
  CYCLE_GOAL_OPTIONS,
  CYCLE_SECTION_OPTIONS,
  recommendedSections,
  type BirthControlMethod,
  type CycleGoal,
  type CyclePrefs,
} from '../../lib/tracking/cycleExtras';
import { PersonalizeGroup, PersonalizeSheet } from './PersonalizeSheet';
import { Chips, ToggleRow, useTrackerUIStyles } from './TrackerUI';

type Props = {
  visible: boolean;
  prefs: CyclePrefs;
  busy?: boolean;
  onCancel: () => void;
  onSave: (next: CyclePrefs) => void;
};

export function CyclePersonalizeSheet({ visible, prefs, busy, onCancel, onSave }: Props) {
  const { colors, isDark } = useTheme();
  const ui = useTrackerUIStyles();
  const accent = colors.accentRed;
  const [draft, setDraft] = useState<CyclePrefs>(prefs);

  useEffect(() => {
    if (visible) setDraft(prefs);
  }, [visible, prefs]);

  function toggleGoal(goal: CycleGoal) {
    tapFeedback();
    setDraft((d) => {
      const goals = d.goals.includes(goal) ? d.goals.filter((g) => g !== goal) : [...d.goals, goal];
      // Picking goals re-applies the recommended sections; the toggles below
      // still let the user override any of them.
      const fertility = goals.includes('conceive') || goals.includes('avoid');
      return {
        ...d,
        goals,
        sections: recommendedSections(goals, d.birthControl),
        explainers: goals.includes('learning') ? true : d.explainers,
        showFertileWindow: fertility ? true : goals.includes('learning') ? false : d.showFertileWindow,
      };
    });
  }

  return (
    <PersonalizeSheet
      visible={visible}
      title="Make it yours"
      subtitle="Track what matters to you and hide the rest. You can change any of this whenever you like."
      accent={accent}
      busy={busy}
      onCancel={onCancel}
      onSave={() => onSave({ ...draft, configured: true })}
    >
      <PersonalizeGroup title="What are you tracking for?" hint="Pick as many as you like." plain>
        <View style={{ gap: 8 }}>
          {CYCLE_GOAL_OPTIONS.map((g) => {
            const active = draft.goals.includes(g.value);
            return (
              <Pressable
                key={g.value}
                onPress={() => toggleGoal(g.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: active ? accent : colors.border,
                  backgroundColor: active ? withAlpha(accent, isDark ? 0.22 : 0.1) : colors.surface,
                }}
              >
                <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ui.toggleLabel}>{g.label}</Text>
                  <Text style={ui.toggleHint}>{g.hint}</Text>
                </View>
                <Text style={{ fontSize: 18, color: active ? accent : colors.textMuted }}>
                  {active ? '✓' : '+'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </PersonalizeGroup>

      <PersonalizeGroup title="Show these on my log">
        {CYCLE_SECTION_OPTIONS.map((s) => (
          <ToggleRow
            key={s.key}
            emoji={s.emoji}
            label={s.label}
            value={draft.sections[s.key]}
            accent={accent}
            onChange={(v) => setDraft((d) => ({ ...d, sections: { ...d.sections, [s.key]: v } }))}
          />
        ))}
      </PersonalizeGroup>

      <PersonalizeGroup title="Words & privacy">
        <View style={{ paddingVertical: 8 }}>
          <Text style={ui.toggleLabel}>What do you call it?</Text>
          <Text style={[ui.toggleHint, { marginBottom: 8 }]}>Used across this tracker.</Text>
          <Chips
            options={[
              { value: 'period', label: 'Period' },
              { value: 'bleed', label: 'Bleed' },
            ]}
            accent={accent}
            selected={draft.periodWord}
            onChange={(v) => v && setDraft((d) => ({ ...d, periodWord: v as CyclePrefs['periodWord'] }))}
          />
        </View>
        <ToggleRow
          emoji="🔒"
          label="Discreet mode"
          hint="Neutral wording, private sections start collapsed, no fertility estimates."
          value={draft.discreet}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, discreet: v }))}
        />
        <ToggleRow
          emoji="💡"
          label="Explain things simply"
          hint="Friendly notes on what each section means and what's typical."
          value={draft.explainers}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, explainers: v }))}
        />
      </PersonalizeGroup>

      <PersonalizeGroup title="Predictions">
        <ToggleRow
          emoji="📅"
          label="Show next period estimate"
          hint="Turn off if predictions stress you out or don't fit your body."
          value={draft.showPredictions}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, showPredictions: v }))}
        />
        <ToggleRow
          emoji="🌼"
          label="Show fertile window"
          hint="An estimate only. Never use it as contraception."
          value={draft.showFertileWindow}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, showFertileWindow: v }))}
        />
        <ToggleRow
          emoji="〰️"
          label="My cycles are irregular"
          hint="Shows a date range instead of one exact day."
          value={draft.irregular}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, irregular: v }))}
        />
        <View style={{ paddingVertical: 8 }}>
          <Text style={ui.toggleLabel}>Temperature unit</Text>
          <Chips
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
            accent={accent}
            selected={draft.tempUnit}
            onChange={(v) => v && setDraft((d) => ({ ...d, tempUnit: v as 'C' | 'F' }))}
          />
        </View>
      </PersonalizeGroup>

      <PersonalizeGroup title="Birth control" hint="Optional. Used for your daily check-off." plain>
        <Chips
          options={BIRTH_CONTROL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          accent={accent}
          selected={draft.birthControl}
          onChange={(v) =>
            setDraft((d) => {
              const birthControl = (v ?? 'none') as BirthControlMethod;
              return {
                ...d,
                birthControl,
                sections: { ...d.sections, birthControl: birthControl !== 'none' || d.goals.includes('birth_control') },
              };
            })
          }
        />
      </PersonalizeGroup>

      <PersonalizeGroup
        title="Conditions (optional)"
        hint="Helps tailor insights. Only you can see this."
        plain
      >
        <Chips
          multiple
          options={CONDITION_OPTIONS}
          accent={accent}
          selected={draft.conditions}
          onChange={(next) =>
            setDraft((d) => ({
              ...d,
              conditions: next,
              irregular: next.includes('Irregular periods') || next.includes('PCOS') ? true : d.irregular,
            }))
          }
        />
      </PersonalizeGroup>
    </PersonalizeSheet>
  );
}
