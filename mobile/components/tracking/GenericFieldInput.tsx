import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { tapFeedback } from '../../lib/haptics';
import {
  fieldUnit,
  list,
  num,
  optValue,
  parseClock,
  type FieldDef,
  type GenericPrefs,
  type Opt,
} from '../../lib/tracking/genericTracker';
import { IsoDateInput } from '../IsoDateInput';
import { Chips, ScaleRow, Stepper, SubLabel, ToggleRow, useTrackerUIStyles, type ChipOption } from './TrackerUI';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
  accent: string;
  prefs: GenericPrefs;
  /** Saves a user-added chip option for this field (chips with allowCustom). */
  onAddOption?: (fieldId: string, option: string) => void;
};

function toChip(o: Opt): ChipOption {
  return typeof o === 'string' ? o : { value: o.value, label: o.label, emoji: o.emoji };
}

/** Renders one field of a generic tracker (day log or setup question). */
export function GenericFieldInput({ field, value, onChange, accent, prefs, onAddOption }: Props) {
  const { colors } = useTheme();
  const ui = useTrackerUIStyles();
  const trackingStyles = useTrackingStyles();
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState('');
  const unit = fieldUnit(field, prefs);

  const label = (
    <>
      <SubLabel>
        {field.label}
        {unit && field.type === 'number' ? <Text style={{ color: colors.textMuted, fontWeight: '400' }}> ({unit})</Text> : null}
      </SubLabel>
      {field.hint ? <Text style={[ui.toggleHint, { marginBottom: 6 }]}>{field.hint}</Text> : null}
    </>
  );

  switch (field.type) {
    case 'toggle':
      return (
        <ToggleRow
          label={field.label}
          hint={field.hint}
          value={value === true}
          onChange={(v) => onChange(v || undefined)}
          accent={accent}
        />
      );

    case 'scale':
      return (
        <>
          {label}
          <ScaleRow
            label={field.label}
            min={field.min}
            max={field.max}
            value={num(value)}
            onChange={(v) => onChange(v)}
            accent={accent}
            lowLabel={field.low}
            highLabel={field.high}
            emojis={field.emojis}
          />
        </>
      );

    case 'stepper':
      return (
        <>
          {label}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Stepper
              value={num(value) ?? 0}
              onChange={(n) => onChange(n || undefined)}
              accent={accent}
              max={field.max ?? 30}
            />
            {field.unit ? <Text style={[ui.toggleHint, { marginBottom: 12 }]}>{field.unit}</Text> : null}
          </View>
        </>
      );

    case 'choice':
      return (
        <>
          {label}
          <Chips
            options={field.options.map(toChip)}
            accent={accent}
            selected={typeof value === 'string' ? value : value != null ? String(value) : undefined}
            onChange={(v) => onChange(v)}
          />
        </>
      );

    case 'chips': {
      const selected = list(value);
      const base = field.options.map(optValue);
      const extra = [...(prefs.customOptions[field.id] ?? []), ...selected].filter(
        (v, i, arr) => !base.includes(v) && arr.indexOf(v) === i,
      );
      const options = [...field.options.map(toChip), ...extra];
      function add() {
        const v = newOption.trim().slice(0, 40);
        if (!v) return;
        if (!selected.includes(v)) onChange([...selected, v]);
        if (!base.includes(v)) onAddOption?.(field.id, v);
        setNewOption('');
        setAdding(false);
      }
      return (
        <>
          {label}
          {options.length ? (
            <Chips multiple options={options} accent={accent} selected={selected} onChange={(next) => onChange(next)} />
          ) : null}
          {field.allowCustom ? (
            adding ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[trackingStyles.input, { flex: 1, marginBottom: 0 }]}
                  value={newOption}
                  onChangeText={setNewOption}
                  placeholder="Add your own"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={add}
                />
                <Pressable
                  onPress={add}
                  accessibilityRole="button"
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: accent }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setAdding(true);
                }}
                accessibilityRole="button"
                style={{ alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 4 }}
              >
                <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>＋ Add your own</Text>
              </Pressable>
            )
          ) : null}
        </>
      );
    }

    case 'number':
      return (
        <>
          {label}
          <TextInput
            style={trackingStyles.input}
            keyboardType={field.decimal ? 'decimal-pad' : 'number-pad'}
            value={value == null ? '' : String(value)}
            onChangeText={(v) => {
              const clean = v.replace(field.decimal ? /[^0-9.,]/g : /[^0-9]/g, '').slice(0, 8);
              onChange(clean || undefined);
            }}
            placeholder={field.placeholder ?? '—'}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={field.label}
          />
        </>
      );

    case 'time': {
      const text = typeof value === 'string' ? value : '';
      const invalid = text.length >= 4 && parseClock(text) == null;
      return (
        <>
          {label}
          <TextInput
            style={trackingStyles.input}
            value={text}
            onChangeText={(v) => onChange(v.slice(0, 8) || undefined)}
            placeholder={field.placeholder ?? 'HH:MM'}
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={field.label}
          />
          {invalid ? <Text style={[ui.toggleHint, { color: colors.error, marginTop: -4, marginBottom: 6 }]}>Use 24-hour time like 23:30, or 11:30 pm.</Text> : null}
        </>
      );
    }

    case 'date':
      return (
        <>
          {label}
          <IsoDateInput
            style={trackingStyles.input}
            value={typeof value === 'string' ? value : ''}
            onChangeText={(v) => onChange(v || undefined)}
          />
        </>
      );

    case 'text':
      return (
        <>
          {label}
          <TextInput
            style={[trackingStyles.input, field.multiline && trackingStyles.textarea]}
            multiline={field.multiline}
            value={typeof value === 'string' ? value : ''}
            onChangeText={(v) => onChange(v || undefined)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={field.label}
          />
        </>
      );
  }
}
