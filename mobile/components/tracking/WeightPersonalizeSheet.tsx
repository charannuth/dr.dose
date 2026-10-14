import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { WEIGHT_FOCUS_OPTIONS, type WeightPrefs } from '../../lib/tracking/weightPrefs';
import { PersonalizeGroup, PersonalizeSheet } from './PersonalizeSheet';
import { Chips, ToggleRow } from './TrackerUI';

type Props = {
  visible: boolean;
  prefs: WeightPrefs;
  onCancel: () => void;
  onSave: (next: WeightPrefs) => void;
};

export function WeightPersonalizeSheet({ visible, prefs, onCancel, onSave }: Props) {
  const { colors } = useTheme();
  const accent = colors.accentGreen;
  const [draft, setDraft] = useState(prefs);

  useEffect(() => {
    if (visible) setDraft(prefs);
  }, [visible, prefs]);

  return (
    <PersonalizeSheet
      visible={visible}
      title="Make it yours"
      subtitle="Bodies change for lots of reasons. Track in the way that feels good for you."
      accent={accent}
      onCancel={onCancel}
      onSave={() => onSave({ ...draft, configured: true })}
    >
      <PersonalizeGroup title="What's your focus?" plain>
        <Chips
          options={WEIGHT_FOCUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, emoji: o.emoji }))}
          accent={accent}
          selected={draft.focus ?? undefined}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              focus: (v as WeightPrefs['focus']) ?? null,
              showCalories: v === 'observe' ? false : d.showCalories,
            }))
          }
        />
      </PersonalizeGroup>
      <PersonalizeGroup title="Comfort">
        <ToggleRow
          emoji="🍽️"
          label="Calorie tracking"
          hint="Turn off to hide calorie targets and meal calories completely."
          value={draft.showCalories}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, showCalories: v }))}
        />
        <ToggleRow
          emoji="🙈"
          label="Hide my weight number"
          hint="Blind weigh-ins: log it without seeing it. Helpful in recovery or if numbers feel heavy."
          value={draft.hideWeightNumber}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, hideWeightNumber: v }))}
        />
      </PersonalizeGroup>
    </PersonalizeSheet>
  );
}
