import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { fonts, radii, spacing, withAlpha } from '../../constants/theme';
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
import { useTrackingStyles } from '../../components/tracking/trackingStyles';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import {
  calendarSourceOptions,
  calendarSupportFor,
  defaultCalendarSource,
  type CalendarSourceId,
} from '../../lib/tracking/calendarSources';
import { getCalendarWindow, type CalendarViewRange } from '../../lib/tracking/calendarRange';
import { normalizeBodyMetricUnit, type BodyMetricUnit } from '../../lib/bodyMetrics';
import { todayLocalDate } from '../../lib/dates';
import { updateBodyMetricUnits } from '../../lib/medicalRecords';
import {
  TRACKER_CATALOG,
  trackerCatalogEntry,
  type TrackerAccent,
  type TrackerId,
} from '../../lib/tracking/catalog';
import { tapFeedback } from '../../lib/haptics';
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
import { AmbientScrollView } from '../../components/AmbientBackground';

export default function TrackingScreen() {
  const { widgetTracker } = useLocalSearchParams<{ widgetTracker?: string }>();
  const { colors, isDark } = useTheme();
  const accentColor = (accent: TrackerAccent) =>
    ({
      red: colors.accentRed,
      purple: colors.accentPurple,
      blue: colors.accentBlue,
      green: colors.accentGreen,
      amber: colors.accentAmber,
    })[accent];
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

  useFocusEffect(useCallback(() => {
    if (loading || !widgetTracker) return;
    const requested = TRACKER_CATALOG.find((tracker) => tracker.id === widgetTracker && tracker.available);
    if (!requested) return;
    if (enabled.includes(requested.id)) {
      setActiveTracker(requested.id);
    } else {
      setMessage(`Add ${requested.label} below to start using this tracker.`);
    }
  }, [widgetTracker, loading, enabled]));

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
    const visible = getCalendarWindow(calendarAnchor, calendarRange);
    if (date < visible.start || date > visible.end) setCalendarAnchor(date);
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

  async function handleAddTracker(trackerId: TrackerId) {
    if (!user) return;
    const entry = trackerCatalogEntry(trackerId);
    if (!entry?.available) return;
    if (enabled.includes(trackerId)) return;
    tapFeedback();
    setTrackerBusy(true);
    setError(null);
    try {
      await enableTracker(user.id, trackerId);
      await reload();
      setActiveTracker(trackerId);
      setMessage(`${entry.label} is on. Tap ✨ Make it yours to set it up your way.`);
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

  const enableableNotEnabled = TRACKER_CATALOG.filter((t) => t.available && !enabled.includes(t.id));
  const profileSummary = physicalProfileSummary(medicalRecord);

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
      <AmbientScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <Text style={styles.subtitle}>
          Your body, your way. Turn on the trackers that help you and skip the rest.
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
                    const tint = entry ? accentColor(entry.accent) : colors.accent;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => {
                          tapFeedback();
                          setActiveTracker(id);
                        }}
                        style={[
                          trackingStyles.tab,
                          { borderColor: withAlpha(tint, 0.5) },
                          active && { backgroundColor: tint, borderColor: tint },
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[trackingStyles.tabText, active && { color: '#fff' }]}>
                          {entry?.emoji ? `${entry.emoji}  ` : ''}
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

              {activeTracker && enabled.includes(activeTracker) ? (
                <View>
                  <View style={trackingStyles.moduleHeader}>
                    <Text style={trackingStyles.moduleTitle}>
                      {trackerCatalogEntry(activeTracker)?.emoji}{' '}
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
                  {renderTrackerPanel(activeTracker)}
                </View>
              ) : null}
            </View>

            <View style={trackingStyles.section}>
              <Text style={trackingStyles.sectionTitle}>
                {enabled.length === 0 ? 'Pick your first tracker' : 'Add a tracker'}
              </Text>
              {enableableNotEnabled.length === 0 ? (
                <Text style={trackingStyles.hint}>You've turned on every tracker that's ready.</Text>
              ) : (
                <View style={{ gap: 10, marginBottom: spacing.md }}>
                  {enableableNotEnabled.map((t) => {
                    const tint = accentColor(t.accent);
                    return (
                      <Pressable
                        key={t.id}
                        disabled={trackerBusy}
                        onPress={() => void handleAddTracker(t.id)}
                        style={[
                          styles.addCard,
                          {
                            borderColor: withAlpha(tint, 0.45),
                            backgroundColor: withAlpha(tint, isDark ? 0.16 : 0.08),
                          },
                          trackerBusy && trackingStyles.disabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${t.label}`}
                      >
                        <View style={[styles.addIcon, { backgroundColor: withAlpha(tint, isDark ? 0.32 : 0.2) }]}>
                          <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addTitle}>{t.label}</Text>
                          <Text style={styles.addDesc}>{t.description}</Text>
                        </View>
                        <View style={[styles.addPill, { backgroundColor: tint }]}>
                          <Text style={styles.addPillText}>＋ Add</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Text style={[trackingStyles.label, { marginTop: spacing.sm }]}>Coming soon</Text>
              <View style={trackingStyles.chipWrap}>
                {TRACKER_CATALOG.filter((t) => !t.available).map((t) => (
                  <View key={t.id} style={[trackingStyles.chip, { opacity: 0.7 }]}>
                    <Text style={trackingStyles.chipText}>
                      {t.emoji} {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <MedicalSourcesCard />
      </AmbientScrollView>
    </SafeAreaView>
  );
}

function makeTrackingScreenStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
    addCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: 12,
    },
    addIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
    addDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
    addPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    addPillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  });
}
