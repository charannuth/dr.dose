import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SUBSTANCE_USE_LEVELS, type SubstanceUseLevel, type WellnessProfileInput } from '../../lib/wellness';
import { useGroupedFormStyles } from '../forms/groupedFormStyles';
import { CollapsibleSection } from '../forms/CollapsibleSection';
import { CalendarMenu } from '../tracking/CalendarMenu';
import { TimeWheelModal } from '../TimeWheelModal';
import { parseAppointmentTime } from '../../lib/appointmentCalendar';

export function WellnessBaselineForm({ value, onChange, onSubmit, busy = false, hideSubmit = false }: {
  value: WellnessProfileInput; onChange: (next: WellnessProfileInput) => void; onSubmit: () => void; busy?: boolean; hideSubmit?: boolean;
}) {
  const s = useGroupedFormStyles();
  const [timeField, setTimeField] = useState<'usual_bedtime' | 'usual_wake_time' | null>(null);
  const [symptomText, setSymptomText] = useState(value.symptom_focus.join(', '));
  const patch = (next: Partial<WellnessProfileInput>) => onChange({ ...value, ...next });
  let timeValue = '22:00';
  if (timeField) { try { const t = parseAppointmentTime(value[timeField]); if (t) timeValue = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`; } catch {} }
  const field = (key: 'eating_notes' | 'profile_notes', label: string, placeholder: string) => <View style={s.group}><View style={s.field}>
    <Text style={s.label}>{label}</Text><TextInput style={[s.input, s.textarea]} accessibilityLabel={label} value={value[key]} onChangeText={(text) => patch({ [key]: text })} editable={!busy} multiline placeholder={placeholder} placeholderTextColor={s.label.color} />
  </View></View>;
  return <View>
    <CollapsibleSection title="Sleep routine" summary={[value.usual_bedtime && `Bed ${value.usual_bedtime}`, value.usual_wake_time && `Wake ${value.usual_wake_time}`].filter(Boolean).join(' · ') || 'Your usual bedtime and wake time'} initiallyOpen>
      <View style={s.group}>{(['usual_bedtime', 'usual_wake_time'] as const).map((key, i) => <View key={key}>
        {i > 0 ? <View style={s.divider} /> : null}
        <Pressable style={s.row} onPress={() => setTimeField(key)} disabled={busy} accessibilityRole="button"><Text style={s.rowLabel}>{i === 0 ? 'Bedtime' : 'Wake time'}</Text><Text style={s.rowValue}>{value[key] || 'Set time'}</Text><Text style={s.chevron}>›</Text></Pressable>
        {value[key] ? <Pressable style={s.link} disabled={busy} onPress={() => patch({ [key]: '' })} accessibilityRole="button"><Text style={s.linkText}>Clear {i === 0 ? 'bedtime' : 'wake time'}</Text></Pressable> : null}
      </View>)}</View>
    </CollapsibleSection>
    <CollapsibleSection title="Food & habits" summary="Eating patterns and substance use">
      <View style={{ gap: 16 }}>{field('eating_notes', 'Eating habits · optional', 'Your usual meals and eating patterns')}
        <View style={s.group}>{([{ key: 'alcohol', label: 'Alcohol' }, { key: 'cannabis', label: 'Cannabis' }, { key: 'tobacco', label: 'Tobacco / nicotine' }] as const).map(({ key, label }, i) => <View key={key}>
          {i > 0 ? <View style={s.divider} /> : null}<View style={s.field}><Text style={s.label}>{label}</Text>
            <CalendarMenu title={label} value={value.substance_use[key] ?? ''} options={[{ value: '', label: 'Prefer not to say' }, ...SUBSTANCE_USE_LEVELS]} onChange={(level) => {
              const substance_use = { ...value.substance_use };
              if (!level) delete substance_use[key]; else substance_use[key] = level as SubstanceUseLevel;
              patch({ substance_use });
            }} />
          </View>
        </View>)}</View>
      </View>
    </CollapsibleSection>
    <CollapsibleSection title="Symptoms to follow" summary={value.symptom_focus.length ? `${value.symptom_focus.length} in your tracking list` : 'Choose what matters to you'}>
      <View style={s.group}><View style={s.field}><Text style={s.label}>Separate symptoms with commas</Text><TextInput accessibilityLabel="Symptoms to track" style={[s.input, s.textarea]} value={symptomText} editable={!busy} multiline placeholder="e.g. Wheezing, joint pain" placeholderTextColor={s.label.color} onChangeText={(text) => { setSymptomText(text); patch({ symptom_focus: [...new Set(text.split(',').map((v) => v.trim()).filter(Boolean))] }); }} /></View></View>
    </CollapsibleSection>
    <CollapsibleSection title="Clinician notes" summary="Anything else your care team should know">{field('profile_notes', 'Notes · optional', 'Add context for your clinician')}</CollapsibleSection>
    {!hideSubmit ? <Pressable style={s.link} disabled={busy} onPress={onSubmit} accessibilityRole="button"><Text style={s.linkText}>{busy ? 'Saving…' : 'Save baseline'}</Text></Pressable> : null}
    <TimeWheelModal visible={timeField !== null} title={timeField === 'usual_bedtime' ? 'Usual bedtime' : 'Usual wake time'} value={timeValue} onCancel={() => setTimeField(null)} onDone={(time) => {
      const [hour, minute] = time.split(':').map(Number);
      if (timeField) patch({ [timeField]: `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}` });
      setTimeField(null);
    }} />
  </View>;
}
