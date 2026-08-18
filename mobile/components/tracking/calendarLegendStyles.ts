import type { TextStyle, ViewStyle } from 'react-native';
import type { ColorPalette } from '../../constants/theme';

/**
 * Legend swatches use the same fills as calendar day cells / event pills
 * (`calendarCellStyles`), not hollow “ring” illustrations.
 */
function legendTints(isDark: boolean) {
  if (isDark) {
    return {
      period: { bg: '#4c0519', border: '#f472b6' },
      periodPredicted: { bg: '#3b0764', border: '#e879f9' },
      follicular: { bg: '#064e3b', border: '#34d399' },
      ovulation: { bg: '#422006', border: '#fbbf24' },
      luteal: { bg: '#312e81', border: '#a78bfa' },
      menstrual: { bg: 'rgba(244, 63, 94, 0.35)', border: '#fb7185' },
      symptom: { bg: '#431407', border: '#fdba74' },
      weight: { bg: '#0c4a6e', border: '#7dd3fc' },
      weightMeals: { bg: '#14532d', border: '#86efac' },
      hrt: { bg: '#581c87', border: '#e9d5ff' },
      doctorUpcoming: { bg: '#1e3a5f', border: '#93c5fd' },
      doctorLogged: { bg: '#064e3b', border: '#6ee7b7' },
      doctorNeedsNotes: { bg: '#78350f', border: '#fcd34d' },
      doctorFollowup: { bg: '#4c1d95', border: '#c4b5fd' },
      heart: '#f472b6',
    };
  }
  return {
    period: { bg: '#fce7f3', border: '#f9a8d4' },
    periodPredicted: { bg: '#fdf2f8', border: '#f9a8d4' },
    follicular: { bg: '#ecfdf5', border: '#6ee7b7' },
    ovulation: { bg: '#fef9c3', border: '#facc15' },
    luteal: { bg: '#ede9fe', border: '#c4b5fd' },
    menstrual: { bg: 'rgba(253, 164, 175, 0.35)', border: '#fb7185' },
    symptom: { bg: '#fff7ed', border: '#fdba74' },
    weight: { bg: '#e0f2fe', border: '#7dd3fc' },
    weightMeals: { bg: '#f0fdf4', border: '#86efac' },
    hrt: { bg: '#fae8ff', border: '#e9d5ff' },
    doctorUpcoming: { bg: '#dbeafe', border: '#93c5fd' },
    doctorLogged: { bg: '#d1fae5', border: '#6ee7b7' },
    doctorNeedsNotes: { bg: '#fef3c7', border: '#fcd34d' },
    doctorFollowup: { bg: '#ede9fe', border: '#c4b5fd' },
    heart: '#ec4899',
  };
}

/** Legend + day-cell swatch styles aligned with calendar fills. */
export function legendSwatchStyle(
  swatchClass: string,
  colors: ColorPalette,
  isDark: boolean,
): ViewStyle {
  const t = legendTints(isDark);
  const base: ViewStyle = {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  };

  switch (swatchClass) {
    case 'logged-period':
      return {
        ...base,
        borderWidth: 2,
        borderColor: t.period.border,
        backgroundColor: t.period.bg,
      };
    case 'predicted-period':
      return {
        ...base,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: t.periodPredicted.border,
        backgroundColor: t.periodPredicted.bg,
      };
    case 'phase-follicular':
      return { ...base, backgroundColor: t.follicular.bg, borderColor: t.follicular.border };
    case 'phase-ovulation':
      return { ...base, backgroundColor: t.ovulation.bg, borderColor: t.ovulation.border };
    case 'phase-luteal':
      return { ...base, backgroundColor: t.luteal.bg, borderColor: t.luteal.border };
    case 'phase-menstrual':
      return { ...base, backgroundColor: t.menstrual.bg, borderColor: t.menstrual.border };
    case 'cycle-symptom':
      return {
        ...base,
        backgroundColor: t.symptom.bg,
        borderColor: t.symptom.border,
        borderRadius: 3,
      };
    case 'weight-logged':
      return {
        ...base,
        backgroundColor: t.weight.bg,
        borderColor: t.weight.border,
        borderWidth: 2,
      };
    case 'weight-meals':
      return {
        ...base,
        backgroundColor: t.weightMeals.bg,
        borderColor: t.weightMeals.border,
      };
    case 'hrt-logged':
      return { ...base, backgroundColor: t.hrt.bg, borderColor: t.hrt.border, borderWidth: 2 };
    case 'med-perfect':
      return {
        ...base,
        backgroundColor: colors.streakPerfectBg,
        borderColor: colors.streakPerfectBorder,
        borderWidth: 2,
      };
    case 'med-partial':
      return {
        ...base,
        backgroundColor: colors.streakPartialBg,
        borderColor: colors.streakPartialBorder,
        borderWidth: 2,
      };
    case 'med-missed':
      return {
        ...base,
        backgroundColor: colors.streakMissedBg,
        borderColor: colors.streakMissedBorder,
        borderWidth: 2,
      };
    case 'doctor-visit-upcoming':
      return {
        ...base,
        backgroundColor: t.doctorUpcoming.bg,
        borderColor: t.doctorUpcoming.border,
        borderWidth: 2,
      };
    case 'doctor-visit-logged':
      return {
        ...base,
        backgroundColor: t.doctorLogged.bg,
        borderColor: t.doctorLogged.border,
        borderWidth: 2,
      };
    case 'doctor-visit-needs-notes':
      return {
        ...base,
        backgroundColor: t.doctorNeedsNotes.bg,
        borderColor: t.doctorNeedsNotes.border,
        borderWidth: 2,
      };
    case 'doctor-visit-followup':
      return {
        ...base,
        backgroundColor: t.doctorFollowup.bg,
        borderColor: t.doctorFollowup.border,
        borderWidth: 2,
      };
    default:
      return base;
  }
}

export function legendDotStyle(isDark: boolean): ViewStyle {
  const t = legendTints(isDark);
  return {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.symptom.border,
  };
}

export function legendHeartStyle(isDark: boolean): TextStyle {
  return {
    color: legendTints(isDark).heart,
    fontSize: 14,
    lineHeight: 16,
  };
}
