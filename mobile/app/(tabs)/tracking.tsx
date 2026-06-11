import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../../constants/theme';
import type { ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useTrackingCalendarData } from '../../hooks/useTrackingCalendarData';
import { PhysicalProfileForm } from '../../components/tracking/PhysicalProfileForm';
import { CycleTrackerPanel } from '../../components/tracking/CycleTrackerPanel';
import { HrtTrackerPanel } from '../../components/tracking/HrtTrackerPanel';
import { MedProgressPanel } from '../../components/tracking/MedProgressPanel';
import { WeightTrackerPanel } from '../../components/tracking/WeightTrackerPanel';
import { TrackingCalendar } from '../../components/tracking/TrackingCalendar';
import { SelectField } from '../../components/tracking/SelectField';
import { useTrackingStyles } from '../../components/tracking/trackingStyles';
import {
  calendarSourceOptions,
  calendarSupportFor,
  defaultCalendarSource,
  type CalendarSourceId,
} from '../../lib/tracking/calendarSources';
import type { CalendarViewRange } from '../../lib/tracking/calendarRange';
import { normalizeBodyMetricUnit, type BodyMetricUnit } from '../../lib/bodyMetrics';
import { todayLocalDate } from '../../lib/dates';
import { updateBodyMetricUnits } from '../../lib/medicalRecords';
import {
  TRACKER_CATALOG,
  trackerCatalogEntry,
  type TrackerId,
} from '../../lib/tracking/catalog';
import {
  disableTracker,
  enableTracker,
  fetchEnabledTrackers,
} from '../../lib/tracking/trackers';
import {
  emptyPhysicalProfileInput,
  fetchMedicalRecord,
  isPhysicalProfileFilled,
  physicalProfileFromRecord,
  physicalProfileSummary,
  upsertPhysicalProfile,
  type PhysicalProfileInput,
} from '../../lib/physicalProfile';
import type { MedicalRecord } from '../../lib/medicalRecords';

export default function TrackingScreen() {
  const { colors } = useTheme();
  const trackingStyles = useTrackingStyles();
  const styles = useMemo(() => makeTrackingScreenStyles(colors), [colors]);
  const { user } = useAuth();
  const today = todayLocalDate();
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [profileDraft, setProfileDraft] = useState<PhysicalProfileInput>(
    emptyPhysicalProfileInput(),
  );
  const [enabled, setEnabled] = useState<TrackerId[]>([]);
  const [activeTracker, setActiveTracker] = useState<TrackerId | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [addTrackerId, setAddTrackerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [trackerBusy, setTrackerBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarAnchor, setCalendarAnchor] = useState(today);
  const [calendarRange, setCalendarRange] = useState<CalendarViewRange>('month');
  const [calendarSource, setCalendarSource] = useState<CalendarSourceId | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const profileDirtyRef = useRef(false);
  const userId = user?.id;

  const reload = useCallback(async () => {
    if (!userId) return;
    const [record, trackers] = await Promise.all([
      fetchMedicalRecord(userId),
      fetchEnabledTrackers(userId),
    ]);
    setMedicalRecord(record);
    if (!profileDirtyRef.current) {
      const filled = isPhysicalProfileFilled(physicalProfileFromRecord(record));
      setProfileDraft(physicalProfileFromRecord(record));
      setProfileExpanded(!filled);
    }
    setEnabled(trackers);
    setActiveTracker((prev) =>
      prev && trackers.includes(prev) ? prev : trackers[0] ?? null,
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    reload()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load tracking');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, reload]);

  function handleProfileDraftChange(next: PhysicalProfileInput) {
    profileDirtyRef.current = true;
    setProfileDraft(next);
  }

  useEffect(() => {
    setCalendarSource((prev) => defaultCalendarSource(enabled, activeTracker ?? prev));
  }, [enabled, activeTracker]);

  useEffect(() => {
    if (activeTracker && calendarSupportFor(activeTracker) !== 'none') {
      setCalendarSource(activeTracker);
    }
  }, [activeTracker]);

  function handleCalendarSourceChange(next: CalendarSourceId) {
    setCalendarSource(next);
    if (next !== 'all' && enabled.includes(next)) {
      setActiveTracker(next);
    }
  }

  const calendarOptions = calendarSourceOptions(enabled);
  const showCalendar = calendarOptions.length > 0;

  const {
    data: calendarData,
    loading: calendarLoading,
    error: calendarError,
  } = useTrackingCalendarData(
    user?.id,
    calendarSource,
    enabled,
    calendarRange,
    calendarAnchor,
    calendarRefreshKey,
  );

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setCalendarAnchor(date);
  }

  function bumpCalendarRefresh() {
    setCalendarRefreshKey((k) => k + 1);
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await reload();
      bumpCalendarRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleHeightUnitChange(unit: BodyMetricUnit) {
    profileDirtyRef.current = true;
    setProfileDraft((d) => ({ ...d, height_unit: unit }));
    if (!userId) return;
    try {
      const saved = await updateBodyMetricUnits(userId, { height_unit: unit });
      setMedicalRecord(saved);
      setProfileDraft((d) => ({
        ...d,
        height_unit: normalizeBodyMetricUnit(saved.height_unit),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference');
    }
  }

  async function handleWeightUnitChange(unit: BodyMetricUnit) {
    profileDirtyRef.current = true;
    setProfileDraft((d) => ({ ...d, weight_unit: unit }));
    if (!userId) return;
    try {
      const saved = await updateBodyMetricUnits(userId, { weight_unit: unit });
      setMedicalRecord(saved);
      setProfileDraft((d) => ({
        ...d,
        weight_unit: normalizeBodyMetricUnit(saved.weight_unit),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save unit preference');
    }
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setProfileBusy(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await upsertPhysicalProfile(userId, profileDraft, medicalRecord);
      setMedicalRecord(saved);
      setProfileDraft(physicalProfileFromRecord(saved));
      profileDirtyRef.current = false;
      setMessage('Physical profile saved.');
      setProfileExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleAddTracker() {
    if (!user || !addTrackerId) return;
    const entry = trackerCatalogEntry(addTrackerId as TrackerId);
    if (!entry?.available) return;
    if (enabled.includes(addTrackerId as TrackerId)) return;
    setTrackerBusy(true);
    setError(null);
    try {
      await enableTracker(user.id, addTrackerId as TrackerId);
      setAddTrackerId('');
      await reload();
      setActiveTracker(addTrackerId as TrackerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable tracker');
    } finally {
      setTrackerBusy(false);
    }
  }

  function handleRemoveTracker(trackerId: TrackerId) {
    if (!user) return;
    Alert.alert(
      'Remove tracker?',
      `Remove ${trackerCatalogEntry(trackerId)?.label ?? trackerId} from your trackers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeTracker(trackerId),
        },
      ],
    );
  }

  async function removeTracker(trackerId: TrackerId) {
    if (!user) return;
    setTrackerBusy(true);
    setError(null);
    try {
      await disableTracker(user.id, trackerId);
      if (activeTracker === trackerId) setActiveTracker(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove tracker');
    } finally {
      setTrackerBusy(false);
    }
  }

  const enableableTrackers = TRACKER_CATALOG.filter((t) => t.available);
  const enableableNotEnabled = enableableTrackers.filter((t) => !enabled.includes(t.id));
  const profileSummary = physicalProfileSummary(medicalRecord);

  const addTrackerOptions = [
    {
      value: '',
      label:
        enableableNotEnabled.length === 0 ? 'All trackers enabled' : 'Choose a tracker…',
    },
    ...enableableTrackers.map((t) => ({
      value: t.id,
      label: `${t.label}${enabled.includes(t.id) ? ' (enabled)' : ''}`,
      disabled: enabled.includes(t.id),
    })),
  ];

  function renderTrackerPanel(id: TrackerId) {
    switch (id) {
      case 'cycle':
        return (
          <CycleTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        );
      case 'hrt':
        return (
          <HrtTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        );
      case 'weight':
        return (
          <WeightTrackerPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={bumpCalendarRefresh}
          />
        );
      case 'med_progress':
        return <MedProgressPanel />;
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <Text style={styles.subtitle}>
          Optional health modules — enable what you need, skip the rest
        </Text>

        {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}
        {calendarError ? (
          <Text style={trackingStyles.errorBanner}>{calendarError}</Text>
        ) : null}
        {message ? <Text style={trackingStyles.successBanner}>{message}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={trackingStyles.section}>
              <Pressable
                style={trackingStyles.profileToggle}
                onPress={() => setProfileExpanded((v) => !v)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={trackingStyles.sectionTitle}>Physical profile</Text>
                  {!profileExpanded && profileSummary ? (
                    <Text style={trackingStyles.profileSummary}>{profileSummary}</Text>
                  ) : null}
                </View>
                {!profileExpanded ? (
                  <Pressable onPress={() => setProfileExpanded(true)}>
                    <Text style={trackingStyles.ghostBtnText}>Edit</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {profileExpanded ? (
                <PhysicalProfileForm
                  value={profileDraft}
                  onChange={handleProfileDraftChange}
                  onHeightUnitChange={(unit) => void handleHeightUnitChange(unit)}
                  onWeightUnitChange={(unit) => void handleWeightUnitChange(unit)}
                  onSubmit={() => void handleSaveProfile()}
                  busy={profileBusy}
                />
              ) : null}
            </View>

            <View style={trackingStyles.section}>
              <Text style={trackingStyles.sectionTitle}>My trackers</Text>
              <Text style={trackingStyles.hint}>
                Enabled trackers are saved to your account. Remove a tracker to stop tracking it.
              </Text>

              {enabled.length === 0 ? (
                <Text style={trackingStyles.hint}>
                  Choose a tracker below to get started. Wellness stays on its own page.
                </Text>
              ) : (
                <View style={trackingStyles.tabRow}>
                  {enabled.map((id) => {
                    const entry = trackerCatalogEntry(id);
                    const active = activeTracker === id;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => setActiveTracker(id)}
                        style={[trackingStyles.tab, active && trackingStyles.tabActive]}
                      >
                        <Text
                          style={[
                            trackingStyles.tabText,
                            active && trackingStyles.tabTextActive,
                          ]}
                        >
                          {entry?.label ?? id}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {showCalendar && calendarSource ? (
                <TrackingCalendar
                  today={today}
                  anchor={calendarAnchor}
                  range={calendarRange}
                  source={calendarSource}
                  selectedDate={selectedDate}
                  enabledTrackers={enabled}
                  data={calendarData}
                  loading={calendarLoading}
                  onAnchorChange={setCalendarAnchor}
                  onRangeChange={setCalendarRange}
                  onSourceChange={handleCalendarSourceChange}
                  onSelectDate={handleSelectDate}
                />
              ) : null}

              <View style={trackingStyles.addRow}>
                <SelectField
                  label="Add tracker"
                  value={addTrackerId}
                  options={addTrackerOptions}
                  onChange={setAddTrackerId}
                  disabled={enableableTrackers.length === 0 || trackerBusy}
                />
                <Pressable
                  style={[
                    trackingStyles.primaryBtn,
                    (!addTrackerId ||
                      trackerBusy ||
                      enabled.includes(addTrackerId as TrackerId)) &&
                      trackingStyles.disabled,
                  ]}
                  disabled={
                    !addTrackerId ||
                    trackerBusy ||
                    enabled.includes(addTrackerId as TrackerId)
                  }
                  onPress={() => void handleAddTracker()}
                >
                  <Text style={trackingStyles.primaryBtnText}>Enable</Text>
                </Pressable>
              </View>

              {activeTracker && enabled.includes(activeTracker) ? (
                <View>
                  <View style={trackingStyles.moduleHeader}>
                    <Text style={trackingStyles.moduleTitle}>
                      {trackerCatalogEntry(activeTracker)?.label}
                    </Text>
                    <Pressable
                      disabled={trackerBusy}
                      onPress={() => handleRemoveTracker(activeTracker)}
                    >
                      <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={trackingStyles.hint}>
                    {trackerCatalogEntry(activeTracker)?.description}
                  </Text>
                  {renderTrackerPanel(activeTracker)}
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeTrackingScreenStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
  });
}
