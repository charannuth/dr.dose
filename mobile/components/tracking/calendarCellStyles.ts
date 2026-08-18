import type { ViewStyle } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import type { TrackingCalendarEventTone } from '../../lib/tracking/calendarTypes';

/** Calendar cell tints — kept vivid so phases stay distinguishable on light and dark surfaces. */
function calendarTints(isDark: boolean) {
  if (isDark) {
    return {
      period: { bg: '#4c0519', border: '#f472b6' },
      periodPredicted: { bg: '#3b0764', border: '#e879f9' },
      follicular: '#064e3b',
      ovulation: '#422006',
      luteal: '#312e81',
      weight: '#0c4a6e',
      weightMeals: '#14532d',
      weightWorkout: '#431407',
      hrt: '#581c87',
      cyclePeriod: { bg: '#4c0519', text: '#fbcfe8' },
      cyclePhase: { bg: '#312e81', text: '#c4b5fd' },
      cycleSymptom: { bg: '#431407', text: '#fdba74' },
      weightEvent: { bg: '#0c4a6e', text: '#7dd3fc' },
      hrtEvent: { bg: '#581c87', text: '#e9d5ff' },
      doctorVisitUpcoming: '#1e3a5f',
      doctorVisitLogged: '#064e3b',
      doctorVisitNeedsNotes: '#78350f',
      doctorVisitFollowup: '#4c1d95',
      doctorUpcoming: { bg: '#1e3a8a', text: '#93c5fd' },
      doctorPast: { bg: '#064e3b', text: '#6ee7b7' },
      doctorNotes: { bg: '#78350f', text: '#fcd34d' },
      doctorFollowup: { bg: '#4c1d95', text: '#c4b5fd' },
    };
  }
  return {
    period: { bg: '#fce7f3', border: '#f9a8d4' },
    periodPredicted: { bg: '#fdf2f8', border: '#f9a8d4' },
    follicular: '#ecfdf5',
    ovulation: '#fef9c3',
    luteal: '#ede9fe',
    weight: '#e0f2fe',
    weightMeals: '#f0fdf4',
    weightWorkout: '#fff7ed',
    hrt: '#fae8ff',
    cyclePeriod: { bg: '#fce7f3', text: '#9d174d' },
    cyclePhase: { bg: '#ede9fe', text: '#5b21b6' },
    cycleSymptom: { bg: '#fff7ed', text: '#c2410c' },
    weightEvent: { bg: '#e0f2fe', text: '#0369a1' },
    hrtEvent: { bg: '#fae8ff', text: '#86198f' },
    doctorVisitUpcoming: '#dbeafe',
    doctorVisitLogged: '#d1fae5',
    doctorVisitNeedsNotes: '#fef3c7',
    doctorVisitFollowup: '#ede9fe',
    doctorUpcoming: { bg: '#dbeafe', text: '#1d4ed8' },
    doctorPast: { bg: '#d1fae5', text: '#047857' },
    doctorNotes: { bg: '#fef3c7', text: '#b45309' },
    doctorFollowup: { bg: '#ede9fe', text: '#6d28d9' },
  };
}

export function cellStylesFromClassNames(
  classNames: string[],
  colors: ColorPalette,
  isDark: boolean,
): ViewStyle[] {
  const t = calendarTints(isDark);
  const out: ViewStyle[] = [];
  if (classNames.includes('is-future')) out.push({ opacity: 0.55 });
  // Phase / tracker fills first; logged/predicted period win afterward so history
  // stays visible even when merged with weight/HRT/med tints.
  if (classNames.includes('phase-menstrual')) {
    out.push({ backgroundColor: isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(253, 164, 175, 0.35)' });
  }
  if (classNames.includes('phase-follicular')) out.push({ backgroundColor: t.follicular });
  if (classNames.includes('phase-ovulation')) out.push({ backgroundColor: t.ovulation });
  if (classNames.includes('phase-luteal')) out.push({ backgroundColor: t.luteal });
  if (classNames.includes('has-symptoms')) out.push({ borderColor: colors.partial });
  if (classNames.includes('weight-logged')) out.push({ backgroundColor: t.weight });
  if (classNames.includes('weight-meals')) out.push({ backgroundColor: t.weightMeals });
  if (classNames.includes('weight-workout')) out.push({ backgroundColor: t.weightWorkout });
  if (classNames.includes('weight-off-schedule')) out.push({ opacity: 0.45 });
  if (classNames.includes('hrt-logged')) out.push({ backgroundColor: t.hrt });
  if (classNames.includes('doctor-visit-upcoming')) {
    out.push({ backgroundColor: t.doctorVisitUpcoming });
  }
  if (classNames.includes('doctor-visit-logged')) {
    out.push({ backgroundColor: t.doctorVisitLogged });
  }
  if (classNames.includes('doctor-visit-needs-notes')) {
    out.push({ backgroundColor: t.doctorVisitNeedsNotes });
  }
  if (classNames.includes('doctor-visit-followup')) {
    out.push({ backgroundColor: t.doctorVisitFollowup });
  }
  if (classNames.includes('med-perfect')) {
    out.push({ backgroundColor: colors.streakPerfectBg, borderColor: colors.streakPerfectBorder });
  }
  if (classNames.includes('med-partial')) {
    out.push({ backgroundColor: colors.streakPartialBg, borderColor: colors.streakPartialBorder });
  }
  if (classNames.includes('med-missed')) {
    out.push({ backgroundColor: colors.streakMissedBg, borderColor: colors.streakMissedBorder });
  }
  if (classNames.includes('predicted-period')) {
    out.push({
      backgroundColor: t.periodPredicted.bg,
      borderColor: t.periodPredicted.border,
      borderWidth: 2,
      borderStyle: 'dashed',
    });
  }
  if (classNames.includes('logged-period')) {
    out.push({
      backgroundColor: t.period.bg,
      borderColor: t.period.border,
      borderWidth: 2,
      borderStyle: 'solid',
    });
  }
  return out;
}

export function eventToneStyle(
  tone: TrackingCalendarEventTone,
  colors: ColorPalette,
  isDark: boolean,
): { bg: string; text: string } {
  const t = calendarTints(isDark);
  switch (tone) {
    case 'cycle-period':
      return t.cyclePeriod;
    case 'cycle-phase':
      return t.cyclePhase;
    case 'cycle-symptom':
      return t.cycleSymptom;
    case 'weight':
      return t.weightEvent;
    case 'hrt':
      return t.hrtEvent;
    case 'doctor-upcoming':
      return t.doctorUpcoming;
    case 'doctor-past':
      return t.doctorPast;
    case 'doctor-notes':
      return t.doctorNotes;
    case 'doctor-followup':
      return t.doctorFollowup;
    case 'med-perfect':
      return { bg: colors.streakPerfectBg, text: colors.success };
    case 'med-partial':
      return { bg: colors.streakPartialBg, text: colors.partial };
    case 'med-missed':
      return { bg: colors.streakMissedBg, text: colors.error };
    default:
      return { bg: colors.pendingBg, text: colors.text };
  }
}
