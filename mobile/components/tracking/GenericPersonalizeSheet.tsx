import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { withAlpha } from '../../constants/theme';
import { tapFeedback } from '../../lib/haptics';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import {
  recommendedSectionsFor,
  sectionsFor,
  slugId,
  type CustomFieldDef,
  type CustomFieldType,
  type GenericPrefs,
  type TrackerDef,
} from '../../lib/tracking/genericTracker';
import { GenericFieldInput } from './GenericFieldInput';
import { PersonalizeGroup, PersonalizeSheet } from './PersonalizeSheet';
import { Chips, ToggleRow, useTrackerUIStyles } from './TrackerUI';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  def: TrackerDef;
  visible: boolean;
  prefs: GenericPrefs;
  accent: string;
  busy?: boolean;
  onCancel: () => void;
  onSave: (next: GenericPrefs) => void;
};

const FIELD_TYPES: { value: CustomFieldType; label: string; emoji: string; hint: string }[] = [
  { value: 'scale', label: 'Scale 0–10', emoji: '🎚️', hint: 'Severity, mood, energy' },
  { value: 'number', label: 'Number', emoji: '🔢', hint: 'With a unit, like mg or minutes' },
  { value: 'stepper', label: 'Counter', emoji: '➕', hint: 'Times something happened' },
  { value: 'toggle', label: 'Yes / no', emoji: '✅', hint: 'Did it happen today?' },
  { value: 'chips', label: 'Pick several', emoji: '🏷️', hint: 'Symptoms, triggers, places' },
  { value: 'choice', label: 'Pick one', emoji: '🔘', hint: 'One answer from a list' },
  { value: 'text', label: 'Note', emoji: '📝', hint: 'Free text' },
];

export function GenericPersonalizeSheet({ def, visible, prefs, accent, busy, onCancel, onSave }: Props) {
  const { colors, isDark } = useTheme();
  const ui = useTrackerUIStyles();
  const trackingStyles = useTrackingStyles();
  const [draft, setDraft] = useState<GenericPrefs>(prefs);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('scale');
  const [fieldUnit, setFieldUnit] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDraft(prefs);
    setFieldLabel('');
    setFieldUnit('');
    setFieldOptions('');
  }, [visible, prefs]);

  const isCustom = def.id === 'custom';

  function setGoals(goals: string[]) {
    setDraft((d) => ({ ...d, goals, sections: recommendedSectionsFor(def, goals, d.setup, d.customFields) }));
  }

  function setCustomFields(customFields: CustomFieldDef[]) {
    setDraft((d) => {
      const recommended = recommendedSectionsFor(def, d.goals, d.setup, customFields);
      const sections: Record<string, boolean> = {};
      for (const key of Object.keys(recommended)) sections[key] = d.sections[key] ?? recommended[key];
      return { ...d, customFields, sections };
    });
  }

  function addField() {
    const label = fieldLabel.trim().slice(0, 40);
    if (!label) return;
    const options = fieldOptions
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (fieldType === 'choice' && options.length === 0) return;
    tapFeedback();
    setCustomFields([
      ...draft.customFields,
      {
        id: slugId(label, draft.customFields.map((f) => f.id)),
        label,
        type: fieldType,
        unit: fieldType === 'number' || fieldType === 'stepper' ? fieldUnit.trim().slice(0, 12) || undefined : undefined,
        options: fieldType === 'chips' || fieldType === 'choice' ? options : undefined,
      },
    ]);
    setFieldLabel('');
    setFieldUnit('');
    setFieldOptions('');
  }

  function moveField(index: number, by: -1 | 1) {
    const next = [...draft.customFields];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCustomFields(next);
  }

  function save() {
    const setup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft.setup)) {
      const field = def.setup?.find((f) => f.id === k);
      if (field?.type === 'date') {
        const iso = typeof v === 'string' ? tryNormalizeIsoDate(v) : null;
        if (iso) setup[k] = iso;
      } else if (v != null && v !== '' && v !== false) {
        setup[k] = v;
      }
    }
    onSave({ ...draft, setup, configured: true });
  }

  const sections = sectionsFor(def, draft);
  const needsOptions = fieldType === 'chips' || fieldType === 'choice';
  const needsUnit = fieldType === 'number' || fieldType === 'stepper';

  return (
    <PersonalizeSheet
      visible={visible}
      title="Make it yours"
      subtitle={isCustom ? 'Name your tracker and add the fields you want to log.' : `Set up ${def.label.toLowerCase()} around you. Change it any time.`}
      accent={accent}
      busy={busy}
      onCancel={onCancel}
      onSave={save}
    >
      {def.goals.length ? (
        <PersonalizeGroup title="What's this for?" hint="Pick any that fit. We'll turn on the right sections." plain>
          <View style={{ gap: 8 }}>
            {def.goals.map((g) => {
              const active = draft.goals.includes(g.value);
              return (
                <Pressable
                  key={g.value}
                  onPress={() => {
                    tapFeedback();
                    setGoals(active ? draft.goals.filter((x) => x !== g.value) : [...draft.goals, g.value]);
                  }}
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
                    {g.hint ? <Text style={ui.toggleHint}>{g.hint}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 18, color: active ? accent : colors.textMuted }}>{active ? '✓' : '○'}</Text>
                </Pressable>
              );
            })}
          </View>
        </PersonalizeGroup>
      ) : null}

      {def.setup?.length ? (
        <PersonalizeGroup title={isCustom ? 'Your tracker' : 'About you'} hint={isCustom ? undefined : 'All optional. These power countdowns, targets and units.'} plain>
          {def.setup.map((f) => (
            <GenericFieldInput
              key={f.id}
              field={f}
              value={draft.setup[f.id]}
              onChange={(v) => setDraft((d) => ({ ...d, setup: { ...d.setup, [f.id]: v } }))}
              accent={accent}
              prefs={draft}
            />
          ))}
        </PersonalizeGroup>
      ) : null}

      {isCustom ? (
        <PersonalizeGroup title="Fields" hint="Whatever you need to log, in the order you want it." plain>
          {draft.customFields.map((f, i) => {
            const type = FIELD_TYPES.find((t) => t.value === f.type);
            return (
              <View
                key={f.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 18 }}>{type?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ui.toggleLabel}>{f.label}</Text>
                  <Text style={ui.toggleHint}>
                    {type?.label}
                    {f.unit ? ` · ${f.unit}` : ''}
                    {f.options?.length ? ` · ${f.options.join(', ')}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => moveField(i, -1)} accessibilityLabel={`Move ${f.label} up`} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>↑</Text>
                </Pressable>
                <Pressable onPress={() => moveField(i, 1)} accessibilityLabel={`Move ${f.label} down`} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>↓</Text>
                </Pressable>
                <Pressable
                  onPress={() => setCustomFields(draft.customFields.filter((x) => x.id !== f.id))}
                  accessibilityLabel={`Remove ${f.label}`}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
          {draft.customFields.length < 30 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={trackingStyles.label}>New field</Text>
              <TextInput
                style={trackingStyles.input}
                value={fieldLabel}
                onChangeText={setFieldLabel}
                placeholder="e.g. Seizures, Tics, Itch, Supplement taken"
                placeholderTextColor={colors.textMuted}
              />
              <Chips
                options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label, emoji: t.emoji }))}
                accent={accent}
                selected={fieldType}
                onChange={(v) => v && setFieldType(v as CustomFieldType)}
              />
              <Text style={[ui.toggleHint, { marginBottom: 8 }]}>{FIELD_TYPES.find((t) => t.value === fieldType)?.hint}</Text>
              {needsUnit ? (
                <TextInput
                  style={trackingStyles.input}
                  value={fieldUnit}
                  onChangeText={setFieldUnit}
                  placeholder="Unit (optional): mg, min, puffs…"
                  placeholderTextColor={colors.textMuted}
                />
              ) : null}
              {needsOptions ? (
                <TextInput
                  style={trackingStyles.input}
                  value={fieldOptions}
                  onChangeText={setFieldOptions}
                  placeholder="Options, separated by commas"
                  placeholderTextColor={colors.textMuted}
                />
              ) : null}
              <Pressable
                onPress={addField}
                disabled={!fieldLabel.trim() || (fieldType === 'choice' && !fieldOptions.trim())}
                accessibilityRole="button"
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: accent,
                  opacity: !fieldLabel.trim() || (fieldType === 'choice' && !fieldOptions.trim()) ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>＋ Add field</Text>
              </Pressable>
            </View>
          ) : null}
        </PersonalizeGroup>
      ) : null}

      <PersonalizeGroup title="Show these on my log">
        {sections.map((s) => (
          <ToggleRow
            key={s.key}
            emoji={s.emoji}
            label={s.label}
            value={draft.sections[s.key] !== false}
            accent={accent}
            onChange={(v) => setDraft((d) => ({ ...d, sections: { ...d.sections, [s.key]: v } }))}
          />
        ))}
      </PersonalizeGroup>

      <PersonalizeGroup title="Extras">
        <ToggleRow
          emoji="💡"
          label="Explain things simply"
          hint="Short notes on what each section is for and what to look out for."
          value={draft.explainers}
          accent={accent}
          onChange={(v) => setDraft((d) => ({ ...d, explainers: v }))}
        />
      </PersonalizeGroup>
    </PersonalizeSheet>
  );
}
