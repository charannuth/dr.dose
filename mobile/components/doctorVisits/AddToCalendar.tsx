import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { DoctorVisit } from '../../lib/doctorVisits';
import { buildCalendarCopy, calendarComposeUrl } from '../../lib/appointmentCalendar';
import { getTimezone } from '../../lib/settings';
import { useTrackingStyles } from '../tracking/trackingStyles';

export function AddToCalendar({ visit }: { visit: DoctorVisit }) {
  const track = useTrackingStyles();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);

  async function openCalendar(provider: 'device' | 'google' | 'microsoft' | 'microsoft-work') {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const event = buildCalendarCopy(visit, getTimezone(), duration);
      if (provider === 'device') {
        if (!requireOptionalNativeModule('ExpoCalendar')) {
          throw new Error('Apple/device calendar requires the updated Dr. Dose development build. Google and Microsoft web options work in this build.');
        }
        // Lazy import keeps older development builds usable until the native module is installed.
        const Calendar = await import('expo-calendar/legacy');
        const result = await Calendar.createEventInCalendarAsync({
          title: event.title, location: event.location,
          startDate: event.start, endDate: event.end,
          allDay: event.allDay, timeZone: event.timeZone,
        });
        setMessage(result.action === 'saved' ? 'Added to your calendar. Manage later changes in both apps.'
          : result.action === 'done' ? 'Calendar editor closed. Check your calendar to confirm it was saved.'
          : 'No calendar copy was added. Your appointment is still saved in Dr. Dose.');
      } else {
        await Linking.openURL(calendarComposeUrl(provider, event));
        setMessage('Finish saving in your calendar. If prompted, sign in first. Dr. Dose cannot confirm whether the copy was saved.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open your calendar. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={track.section}>
      <Pressable style={track.secondaryBtn} onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={track.secondaryBtnText}>Add to another calendar {expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? <>
        <Text style={track.hint}>Add a copy of your saved appointment. Only the doctor/clinic, date, time, and location are shared. Review and save in your chosen calendar.</Text>
        <Text style={track.hint}>{visit.visit_time?.trim() ? `Appointment timezone: ${getTimezone()}` : 'No time set: this will be an all-day event.'}</Text>
        {visit.visit_time?.trim() ? <View style={track.chipWrap}>{[30, 60, 90, 120].map((minutes) => <Pressable key={minutes} disabled={busy} onPress={() => setDuration(minutes)} style={[track.chip, duration === minutes && track.chipActive]} accessibilityRole="button" accessibilityLabel={`${minutes} minute duration`} accessibilityState={{ selected: duration === minutes }}><Text style={[track.chipText, duration === minutes && track.chipTextActive]}>{minutes} min</Text></Pressable>)}</View> : null}
        {Platform.OS !== 'web' ? <Pressable style={track.secondaryBtn} disabled={busy} onPress={() => void openCalendar('device')} accessibilityRole="button"><Text style={track.secondaryBtnText}>{Platform.OS === 'ios' ? 'Apple Calendar / iPhone accounts' : 'Device calendar'}</Text></Pressable> : null}
        <Text style={track.hint}>The device editor lets you choose an account already added to your phone. Or use a web calendar below, with sign-in if needed.</Text>
        {([
          ['google', 'Google Calendar'], ['microsoft', 'Microsoft Outlook · Personal'], ['microsoft-work', 'Microsoft 365 · Work or school'],
        ] as const).map(([provider, label]) => <Pressable key={provider} style={track.secondaryBtn} disabled={busy} onPress={() => void openCalendar(provider)} accessibilityRole="button"><Text style={track.secondaryBtnText}>{label} ↗</Text></Pressable>)}
        <Text style={track.hint}>Copies do not sync edits or deletions. Adding again may create a duplicate.</Text>
      </> : null}
      {message ? <Text style={track.successBanner}>{message}</Text> : null}
      {error ? <Text style={track.errorBanner}>{error}</Text> : null}
    </View>
  );
}
