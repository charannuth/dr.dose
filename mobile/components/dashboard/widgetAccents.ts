import type { AccentKey } from '../../constants/theme';
import type { WidgetKind } from '../../lib/dashboardLayout';

/** Each widget keeps one hue so the Quick view reads as a colorful, scannable grid. */
export const WIDGET_ACCENTS: Record<WidgetKind, AccentKey> = {
  doses: 'accentGreen',
  next: 'accentBlue',
  refills: 'accentAmber',
  prn: 'accentRed',
  supplements: 'accentGreen',
  streak: 'accentAmber',
  week: 'accentPurple',
  wellness: 'accentRed',
  visits: 'accentBlue',
  weight: 'accentGreen',
  cycle: 'accentRed',
  hrt: 'accentPurple',
  tracking: 'accentBlue',
  records: 'accentPurple',
  safety: 'accentGreen',
  account: 'accentBlue',
  help: 'accentAmber',
};
