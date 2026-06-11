import { Pressable, Text, TextInput, View } from 'react-native';
import { IsoDateInput } from '../IsoDateInput';
import type { DoctorVisitInput } from '../../lib/doctorVisits';
import { useTrackingStyles } from '../tracking/trackingStyles';

type Props = {
  value: DoctorVisitInput;
  onChange: (next: DoctorVisitInput) => void;
  onSave: () => void;
  onDiscard: () => void;
  busy?: boolean;
  canSave?: boolean;
};

export function DoctorVisitNotesPanel({
  value,
  onChange,
  onSave,
  onDiscard,
  busy = false,
  canSave = true,
}: Props) {
  const track = useTrackingStyles();

  function setField<K extends keyof DoctorVisitInput>(key: K, fieldValue: DoctorVisitInput[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <View style={[track.card, !canSave && track.disabled]}>
      <Text style={track.sectionTitle}>Visit notes</Text>
      <Text style={track.hint}>
        What your doctor said, next steps, and anything to remember — saved separately from
        appointment details.
      </Text>

      {!canSave ? (
        <Text style={track.hint}>Save appointment details first, then add notes here.</Text>
      ) : null}

      <Text style={track.label}>Notes</Text>
      <TextInput
        style={[track.input, track.textarea, { minHeight: 120 }]}
        value={value.notes}
        onChangeText={(text) => setField('notes', text)}
        placeholder="What your doctor said, next steps, medication changes…"
        placeholderTextColor={track.hint.color}
        multiline
        editable={!busy && canSave}
      />

      <Text style={track.label}>Follow-up date (optional)</Text>
      <IsoDateInput
        style={track.input}
        value={value.follow_up_date}
        onChangeText={(text) => setField('follow_up_date', text)}
        editable={!busy && canSave}
      />

      <View style={track.row}>
        <Pressable
          style={[track.primaryBtn, (busy || !canSave) && track.disabled]}
          onPress={onSave}
          disabled={busy || !canSave}
        >
          <Text style={track.primaryBtnText}>{busy ? 'Saving…' : 'Save notes'}</Text>
        </Pressable>
        <Pressable style={track.ghostBtn} onPress={onDiscard} disabled={busy || !canSave}>
          <Text style={track.ghostBtnText}>Discard edits</Text>
        </Pressable>
      </View>
    </View>
  );
}
