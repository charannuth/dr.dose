import { useState } from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { DOCTOR_APPOINTMENT_TYPES, formatAppointmentTypeLabel, type DoctorVisitInput } from '../../lib/doctorVisits';
import { parseAppointmentTime } from '../../lib/appointmentCalendar';
import { getTimezone } from '../../lib/settings';
import { TimeWheelModal } from '../TimeWheelModal';
import { useAppointmentStyles } from './appointmentStyles';

type Props = { value: DoctorVisitInput; onChange: (next: DoctorVisitInput) => void; busy?: boolean };

/** Inset grouped fields; the screen owns Save/Cancel, so the form stays quiet. */
export function DoctorAppointmentPanel({ value, onChange, busy = false }: Props) {
  const s = useAppointmentStyles();
  const [showTime, setShowTime] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  let wheelTime = '09:00';
  try {
    const time = parseAppointmentTime(value.visit_time);
    if (time) wheelTime = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  } catch { /* Legacy free-text times remain visible until the user changes them. */ }
  const set = (key: keyof DoctorVisitInput, text: string) => onChange({ ...value, [key]: text });
  const field = (key: 'provider_name' | 'specialty' | 'location' | 'reason', label: string, placeholder: string, multiline = false) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={[s.input, multiline && s.textarea]} value={value[key]} onChangeText={(text) => set(key, text)}
        placeholder={placeholder} placeholderTextColor={s.label.color} editable={!busy} multiline={multiline} />
    </View>
  );
  return <>
    <View style={s.section}>
      <Text style={s.sectionTitle}>APPOINTMENT</Text>
      <View style={s.group}>
        {field('provider_name', 'Doctor or clinic', 'Name of your care provider')}
        <View style={s.divider} />
        {field('specialty', 'Specialty · optional', 'e.g. Primary care')}
        <View style={s.divider} />
        <Pressable style={s.row} disabled={busy} accessibilityRole="button" accessibilityState={{ expanded: showTypes }} accessibilityLabel="Choose appointment type"
          onPress={() => { Keyboard.dismiss(); setShowTypes((v) => !v); }}>
          <Text style={s.rowLabel}>Type</Text><Text style={s.rowValue}>{formatAppointmentTypeLabel(value.appointment_type) ?? 'Choose'}</Text><Text style={s.chevron}>{showTypes ? '⌃' : '⌄'}</Text>
        </Pressable>
        {showTypes ? [{ id: '', label: 'Not specified' }, ...DOCTOR_APPOINTMENT_TYPES].map((option) => <View key={option.id}>
          <View style={s.divider} />
          <Pressable style={s.row} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: value.appointment_type === option.id }}
            onPress={() => { onChange({ ...value, appointment_type: option.id as DoctorVisitInput['appointment_type'] }); setShowTypes(false); }}>
            <Text style={s.rowLabel}>{option.label}</Text>{value.appointment_type === option.id ? <Text style={s.rowValue}>✓</Text> : null}
          </Pressable>
        </View>) : null}
      </View>
    </View>
    <View style={s.section}>
      <Text style={s.sectionTitle}>WHEN & WHERE</Text>
      <View style={s.group}>
        <View style={s.row}><Text style={s.rowLabel}>Date</Text><Text style={s.rowValue}>{new Date(`${value.visit_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
        <View style={s.divider} />
        {Platform.OS === 'web' ? <View style={s.field}><Text style={s.label}>Time · optional</Text><TextInput style={s.input} accessibilityLabel="Appointment time" value={value.visit_time} placeholder="e.g. 2:30 PM" placeholderTextColor={s.label.color} editable={!busy} onChangeText={(text) => set('visit_time', text)} /></View> :
          <Pressable style={s.row} disabled={busy} accessibilityRole="button" accessibilityLabel={`Appointment time: ${value.visit_time || 'not set'}`} onPress={() => { Keyboard.dismiss(); setShowTime(true); }}>
            <Text style={s.rowLabel}>Time</Text><Text style={s.rowValue}>{value.visit_time || 'Add time'}</Text><Text style={s.chevron}>›</Text>
          </Pressable>}
        {value.visit_time ? <Pressable style={s.link} disabled={busy} onPress={() => set('visit_time', '')} accessibilityRole="button"><Text style={s.linkText}>Clear time</Text></Pressable> : null}
        <View style={s.divider} />
        {field('location', 'Location · optional', 'Address or telehealth link')}
      </View>
      <Text style={s.hint}>{value.visit_time ? `Time in ${getTimezone()}` : 'Leave the time empty if it hasn’t been confirmed.'}</Text>
    </View>
    <View style={s.section}>
      <Text style={s.sectionTitle}>REASON FOR VISIT</Text>
      <View style={s.group}>{field('reason', 'Optional', 'What would you like to discuss?', true)}</View>
    </View>
    {Platform.OS !== 'web' ? <TimeWheelModal visible={showTime} value={wheelTime} title="Appointment time" onCancel={() => setShowTime(false)} onDone={(time) => {
      const [hour, minute] = time.split(':').map(Number);
      set('visit_time', `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`);
      setShowTime(false);
    }} /> : null}
  </>;
}
