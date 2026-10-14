import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { withAlpha } from '../../constants/theme';
import { tapFeedback } from '../../lib/haptics';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import {
  HRT_REGIMEN_OPTIONS,
  HRT_ROUTE_OPTIONS,
  HRT_SECTION_OPTIONS,
  recommendedHrtSections,
  type HrtPrefs,
  type HrtRoute,
} from '../../lib/tracking/hrtExtras';
import { IsoDateInput } from '../IsoDateInput';
import { PersonalizeGroup, PersonalizeSheet } from './PersonalizeSheet';
import { Chips, ToggleRow, useTrackerUIStyles } from './TrackerUI';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  visible: boolean;
  prefs: HrtPrefs;
  busy?: boolean;
  onCancel: () => void;
  onSave: (next: HrtPrefs) => void;
};

export function HrtPersonalizeSheet({ visible, prefs, busy, onCancel, onSave }: Props) {
  const { colors, isDark } = useTheme();
  const ui = useTrackerUIStyles();
  const trackingStyles = useTrackingStyles();
  const accent = colors.accentPurple;
  const [draft, setDraft] = useState<HrtPrefs>(prefs);
  const [startText, setStartText] = useState(prefs.startDate ?? '');
  const [everyText, setEveryText] = useState(prefs.everyDays ? String(prefs.everyDays) : '');

  useEffect(() => {
    if (!visible) return;
    setDraft(prefs);
    setStartText(prefs.startDate ?? '');
    setEveryText(prefs.everyDays ? String(prefs.everyDays) : '');
  }, [visible, prefs]);

  const usesSchedule = draft.routes.some((r) => r.startsWith('injection') || r === 'patch' || r === 'implant');

  function save() {
    const every = Number(everyText);
    onSave({
      ...draft,
      startDate: tryNormalizeIsoDate(startText) ?? null,
      everyDays: Number.isFinite(every) && every >= 1 && every <= 120 ? Math.round(every) : null,
      configured: true,
    });
  }

  return (
    <PersonalizeSheet
      visible={visible}
      title="Make it yours"
      subtitle="Your journey, your way. Set up what you're taking and what you want to keep an eye on."
      accent={accent}
      busy={busy}
      onCancel={onCancel}
      onSave={save}
    >
      <PersonalizeGroup title="What kind of HRT?" plain>
        <View style={{ gap: 8 }}>
          {HRT_REGIMEN_OPTIONS.map((r) => {
            const active = draft.regimen === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => {
                  tapFeedback();
                  setDraft((d) => {
                    const regimen = active ? null : r.value;
                    return { ...d, regimen, sections: recommendedHrtSections(regimen) };
                  });
                }}
                accessibilityRole="radio"
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
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ui.toggleLabel}>{r.label}</Text>
                  <Text style={ui.toggleHint}>{r.hint}</Text>
                </View>
                <Text style={{ fontSize: 18, color: active ? accent : colors.textMuted }}>{active ? '●' : '○'}</Text>
              </Pressable>
            );
          })}
        </View>
      </PersonalizeGroup>

      <PersonalizeGroup title="When did you start?" hint="Optional. Unlocks your day count and milestones." plain>
        <IsoDateInput style={trackingStyles.input} value={startText} onChangeText={setStartText} />
      </PersonalizeGroup>

      <PersonalizeGroup title="How do you take it?" hint="Pick everything you use." plain>
        <Chips
          multiple
          options={HRT_ROUTE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
          accent={accent}
          selected={draft.routes}
          onChange={(next) => setDraft((d) => ({ ...d, routes: next as HrtRoute[] }))}
        />
      </PersonalizeGroup>

      {usesSchedule ? (
        <PersonalizeGroup
          title="How often? (days)"
          hint="e.g. 7 for a weekly injection, 3 or 4 for a twice-weekly patch. Powers the next-dose countdown."
          plain
        >
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={everyText}
            onChangeText={setEveryText}
            placeholder="7"
            placeholderTextColor={colors.textMuted}
          />
        </PersonalizeGroup>
      ) : null}

      <PersonalizeGroup title="Show these on my log">
        {HRT_SECTION_OPTIONS.map((s) => (
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

      <PersonalizeGroup title="Extras">
        <ToggleRow
          emoji="💡"
          label="Explain things simply"
          hint="Short notes on what each section is for."
          value={draft.explainers}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, explainers: v }))}
        />
        <View style={{ paddingVertical: 8 }}>
          <Text style={ui.toggleLabel}>Measurement unit</Text>
          <Chips
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'in', label: 'in' },
            ]}
            accent={accent}
            selected={draft.measurementUnit}
            onChange={(v) => v && setDraft((d) => ({ ...d, measurementUnit: v as 'cm' | 'in' }))}
          />
        </View>
      </PersonalizeGroup>
    </PersonalizeSheet>
  );
}
