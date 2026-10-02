import { Text, TextInput, View } from 'react-native';
import { IsoDateInput } from '../IsoDateInput';
import type { DoctorVisitInput } from '../../lib/doctorVisits';
import { useAppointmentStyles } from './appointmentStyles';

export function DoctorVisitNotesPanel({ value, onChange, busy = false }: {
  value: DoctorVisitInput; onChange: (next: DoctorVisitInput) => void; busy?: boolean;
}) {
  const s = useAppointmentStyles();
  return <View style={s.section}>
    <Text style={s.sectionTitle}>AFTER YOUR VISIT</Text>
    <View style={s.group}>
      <View style={s.field}>
        <Text style={s.label}>Visit notes</Text>
        <TextInput accessibilityLabel="Visit notes" style={[s.input, s.textarea]} value={value.notes} onChangeText={(notes) => onChange({ ...value, notes })}
          placeholder="Advice, next steps, and things to remember…" placeholderTextColor={s.label.color} multiline editable={!busy} />
      </View>
      <View style={s.divider} />
      <View style={s.field}>
        <Text style={s.label}>Follow-up date · optional</Text>
        <IsoDateInput style={s.input} value={value.follow_up_date} onChangeText={(follow_up_date) => onChange({ ...value, follow_up_date })} editable={!busy} />
      </View>
    </View>
  </View>;
}
