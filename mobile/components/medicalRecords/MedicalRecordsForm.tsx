import { useMemo } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CollapsibleSection } from '../forms/CollapsibleSection';
import { IsoDateInput } from '../IsoDateInput';
import { todayLocalDate } from '../../lib/dates';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import {
  BLOOD_TYPE_OPTIONS,
  COMMON_ALLERGY_SUGGESTIONS,
  COMMON_CONDITION_SUGGESTIONS,
} from '../../lib/allergyCheck';
import type { MedicalRecordInput } from '../../lib/medicalRecords';
import {
  ALLERGY_SEVERITIES,
  CARE_TEAM_ROLES,
  CONDITION_STATUSES,
  FAMILY_RELATIVES,
  type MedicalRecordDetails,
} from '../../lib/medicalRecordDetails';
import { routes } from '../../lib/routes';
import { GENDER_OPTIONS, ageFromDateOfBirth } from '../../lib/profileStats';
import { SelectField } from '../tracking/SelectField';
import { useTrackingStyles } from '../tracking/trackingStyles';
import { TagListField } from './TagListField';
import { ChoiceChips, ListEditor } from './ListEditor';

type Props = {
  value: MedicalRecordInput;
  onChange: (next: MedicalRecordInput) => void;
  onSubmit: () => void;
  busy?: boolean;
  /** Section to open first (from a completeness nudge). */
  focus?: string | null;
};

export function MedicalRecordsForm({ value, onChange, onSubmit, busy = false, focus }: Props) {
  const router = useRouter();
  const ts = useTrackingStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => makeFormStyles(colors), [colors]);
  const d = value.details;

  function patch(partial: Partial<MedicalRecordInput>) {
    onChange({ ...value, ...partial });
  }
  function patchDetails(partial: Partial<MedicalRecordDetails>) {
    onChange({ ...value, details: { ...d, ...partial } });
  }

  const age = value.date_of_birth ? ageFromDateOfBirth(value.date_of_birth) : null;
  const open = (key: string, fallback = false) => (focus ? focus === key : fallback);
  const severityTone = (id: string) =>
    id === 'anaphylaxis' || id === 'severe' ? colors.error : id === 'moderate' ? colors.accentAmber : undefined;

  return (
    <View style={styles.form} pointerEvents={busy ? 'none' : 'auto'}>
      <Text style={styles.disclaimer}>
        Self-reported, not a certified medical record. Allergies are also used to flag new medications.
      </Text>

      <CollapsibleSection title="About you" summary="Birth date, sex and blood type" initiallyOpen={open('basics')}>
        <View style={{ gap: 12 }}>
          <Text style={ts.label}>Date of birth (YYYY-MM-DD)</Text>
          <IsoDateInput style={ts.input} value={value.date_of_birth} onChangeText={(date_of_birth) => patch({ date_of_birth })} maxDate={todayLocalDate()} />
          {age != null ? <Text style={ts.hint}>Age {age} years</Text> : null}
          <SelectField label="Sex" value={value.gender} options={GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} onChange={(gender) => patch({ gender })} />
          <SelectField label="Blood type" value={value.blood_type} options={BLOOD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} onChange={(blood_type) => patch({ blood_type })} />
          <Pressable onPress={() => router.push(routes.tracking)} accessibilityRole="link">
            <Text style={ts.hint}>Height and weight are updated on <Text style={styles.link}>Tracking ›</Text></Text>
          </Pressable>
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        title="Allergies"
        summary={value.known_allergies.length ? `${value.known_allergies.length} listed` : d.noKnownAllergies ? 'No known allergies' : 'Not recorded'}
        initiallyOpen={open('allergies', true)}
      >
        <View style={{ gap: 12 }}>
          {value.known_allergies.length === 0 ? (
            <View style={styles.switchRow}>
              <Text style={[ts.label, { flex: 1 }]}>I have no known allergies</Text>
              <Switch value={Boolean(d.noKnownAllergies)} onValueChange={(on) => patchDetails({ noKnownAllergies: on || undefined })} />
            </View>
          ) : null}
          <TagListField
            label="Allergies"
            hint="Used to check new medications. Add a reaction and severity so a doctor knows how serious it is."
            value={value.known_allergies}
            onChange={(known_allergies) => onChange({ ...value, known_allergies, details: { ...d, noKnownAllergies: known_allergies.length ? undefined : d.noKnownAllergies } })}
            suggestions={COMMON_ALLERGY_SUGGESTIONS}
            placeholder="e.g. Penicillin"
          />
          {value.known_allergies.map((name) => {
            const a = d.allergies[name] ?? {};
            return (
              <View key={name} style={styles.detailCard}>
                <Text style={styles.detailName}>{name}</Text>
                <TextInput
                  style={[ts.input, { marginBottom: 0 }]}
                  value={a.reaction ?? ''}
                  placeholder="Reaction, e.g. hives, swelling"
                  placeholderTextColor={colors.textMuted}
                  onChangeText={(reaction) => patchDetails({ allergies: { ...d.allergies, [name]: { ...a, reaction: reaction || undefined } } })}
                />
                <ChoiceChips options={ALLERGY_SEVERITIES} value={a.severity} tone={severityTone} onChange={(severity) => patchDetails({ allergies: { ...d.allergies, [name]: { ...a, severity } } })} />
              </View>
            );
          })}
          <Text style={styles.asthmaHint}>
            <Text style={styles.strong}>Asthma and pain relievers:</Text> if ibuprofen (Advil/Motrin) affects your breathing, list Ibuprofen / NSAIDs here too.
          </Text>
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Conditions" summary={value.known_conditions.length ? `${value.known_conditions.length} listed` : 'Not recorded'} initiallyOpen={open('conditions')}>
        <View style={{ gap: 12 }}>
          <TagListField
            label="Conditions and diagnoses"
            hint="Mark whether each is active, managed or resolved."
            value={value.known_conditions}
            onChange={(known_conditions) => patch({ known_conditions })}
            suggestions={COMMON_CONDITION_SUGGESTIONS}
            placeholder="e.g. Type 2 diabetes"
          />
          {value.known_conditions.map((name) => {
            const c = d.conditions[name] ?? {};
            return (
              <View key={name} style={styles.detailCard}>
                <View style={styles.detailHead}>
                  <Text style={[styles.detailName, { flex: 1 }]}>{name}</Text>
                  <TextInput
                    style={[ts.input, styles.since]}
                    value={c.since ?? ''}
                    placeholder="Since (year)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    onChangeText={(since) => patchDetails({ conditions: { ...d.conditions, [name]: { ...c, since: since || undefined } } })}
                  />
                </View>
                <ChoiceChips options={CONDITION_STATUSES} value={c.status} onChange={(status) => patchDetails({ conditions: { ...d.conditions, [name]: { ...c, status } } })} />
              </View>
            );
          })}
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Surgeries and family history" summary={`${d.surgeries.length} surgeries · ${d.family.length} family`} initiallyOpen={open('history')}>
        <View style={{ gap: 20 }}>
          <ListEditor
            label="Surgeries and hospital stays"
            items={d.surgeries}
            blank={{ name: '', year: undefined }}
            fields={[{ key: 'name', placeholder: 'Procedure or reason', flex: 3 }, { key: 'year', placeholder: 'Year', flex: 1, keyboardType: 'number-pad' }]}
            onChange={(surgeries) => patchDetails({ surgeries })}
            addLabel="Add surgery or stay"
          />
          <ListEditor
            label="Family history"
            hint="Conditions that run in your family, like heart disease, diabetes or cancers."
            items={d.family}
            blank={{ condition: '', relative: undefined }}
            fields={[{ key: 'condition', placeholder: 'Condition' }, { key: 'relative', placeholder: 'Relative', options: FAMILY_RELATIVES }]}
            onChange={(family) => patchDetails({ family })}
            addLabel="Add family condition"
          />
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Vaccinations" summary={d.vaccines.length ? `${d.vaccines.length} recorded` : 'Not recorded'} initiallyOpen={open('vaccines')}>
        <ListEditor
          label="Vaccinations"
          hint="The most recent dose of each, e.g. Tetanus, Flu, COVID-19, HPV."
          items={d.vaccines}
          blank={{ name: '', date: undefined }}
          fields={[{ key: 'name', placeholder: 'Vaccine', flex: 3 }, { key: 'date', placeholder: 'YYYY-MM', flex: 2 }]}
          onChange={(vaccines) => patchDetails({ vaccines })}
          addLabel="Add vaccination"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Care team" summary={d.careTeam.length ? `${d.careTeam.length} people` : 'Doctors from your visits are added automatically'} initiallyOpen={open('careTeam')}>
        <ListEditor
          label="Care team"
          hint="Your primary doctor, specialists and pharmacy. Doctors from your logged visits show up automatically."
          items={d.careTeam}
          blank={{ name: '', role: undefined, phone: undefined }}
          fields={[{ key: 'name', placeholder: 'Name', flex: 3 }, { key: 'phone', placeholder: 'Phone', flex: 2, keyboardType: 'phone-pad' }, { key: 'role', placeholder: 'Role', options: CARE_TEAM_ROLES }]}
          onChange={(careTeam) => patchDetails({ careTeam })}
          addLabel="Add to care team"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Emergency" summary={d.emergencyContact.name ? `Contact: ${d.emergencyContact.name}` : 'Emergency contact and notes'} initiallyOpen={open('emergency')}>
        <View style={{ gap: 10 }}>
          <Text style={ts.label}>Emergency contact</Text>
          <View style={styles.rowFields}>
            <TextInput style={[ts.input, { flex: 3, marginBottom: 0 }]} value={d.emergencyContact.name ?? ''} placeholder="Name" placeholderTextColor={colors.textMuted} onChangeText={(name) => patchDetails({ emergencyContact: { ...d.emergencyContact, name: name || undefined } })} />
            <TextInput style={[ts.input, { flex: 2, marginBottom: 0 }]} value={d.emergencyContact.relation ?? ''} placeholder="Relation" placeholderTextColor={colors.textMuted} onChangeText={(relation) => patchDetails({ emergencyContact: { ...d.emergencyContact, relation: relation || undefined } })} />
          </View>
          <TextInput style={[ts.input, { marginBottom: 0 }]} value={d.emergencyContact.phone ?? ''} placeholder="Phone" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" onChangeText={(phone) => patchDetails({ emergencyContact: { ...d.emergencyContact, phone: phone || undefined } })} />
          <Text style={[ts.label, { marginTop: 8 }]}>Emergency notes</Text>
          <TextInput style={[ts.input, styles.textArea]} value={value.emergency_notes} onChangeText={(emergency_notes) => patch({ emergency_notes })} placeholder="e.g. carries an EpiPen, has a pacemaker" placeholderTextColor={colors.textMuted} multiline />
          <Text style={[ts.label, { marginTop: 8 }]}>Other notes for your care team</Text>
          <TextInput style={[ts.input, styles.textArea]} value={value.other_notes} onChangeText={(other_notes) => patch({ other_notes })} placeholder="Anything else a doctor should know" placeholderTextColor={colors.textMuted} multiline />
        </View>
      </CollapsibleSection>

      <Pressable accessibilityRole="button" style={[ts.primaryBtn, busy && ts.disabled, { marginTop: spacing.lg }]} disabled={busy} onPress={onSubmit}>
        <Text style={ts.primaryBtnText}>{busy ? 'Saving…' : 'Save medical record'}</Text>
      </Pressable>
    </View>
  );
}

function makeFormStyles(colors: ColorPalette) {
  return {
    form: { paddingBottom: spacing.xl },
    disclaimer: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: spacing.sm },
    link: { color: colors.accent, fontFamily: fonts.bodySemibold },
    strong: { fontFamily: fonts.bodySemibold, color: colors.text },
    asthmaHint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    textArea: { minHeight: 72, textAlignVertical: 'top' as const, marginBottom: 0 },
    switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    detailCard: { gap: 8, padding: 12, borderRadius: radii.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    detailHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    detailName: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    since: { width: 110, marginBottom: 0 },
    rowFields: { flexDirection: 'row' as const, gap: 8 },
  };
}
