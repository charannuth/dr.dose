// Pastel brand system. The saturated "foreground" accents (accent, accentGreen,
// route colors, etc.) are IDENTICAL in light and dark mode so the app's color
// identity stays consistent; only the canvas (bg/surface/text/border) and the
// soft *Bg tints flip between modes. Source palette:
//   #ab82c5 lavender · #eee6f3 · #E4FBEE · #FFE9EF · #FFC9D7
//   accents #A6F0C6 mint · #A9EED8 teal · buttons #FAF9F6
export const lightColors = {
  bg: '#faf7fb',
  surface: '#ffffff',
  text: '#2e2a33',
  textMuted: '#7c7585',
  accent: '#ab82c5',
  accentDark: '#8e63ab',
  onAccent: '#ffffff',
  brandMaroon: '#ab82c5',
  brandCrimson: '#c79fda',
  brandDeep: '#8e63ab',
  border: '#eae4ef',
  success: '#43a97c',
  successBg: '#e4fbee',
  successBorder: '#a6f0c6',
  successText: '#2e7d53',
  pending: '#7c7585',
  pendingBg: '#f1eef4',
  partial: '#d2954a',
  partialBg: '#fbf0dd',
  partialBorder: '#f2d9a8',
  partialText: '#9c6b1f',
  error: '#db6a88',
  errorBg: '#ffe9ef',
  errorBorder: '#ffc9d7',
  streakPerfectBg: '#e4fbee',
  streakPerfectBorder: '#a6f0c6',
  streakPartialBg: '#eee6f3',
  streakPartialBorder: '#cbb3dd',
  streakMissedBg: '#ffe9ef',
  streakMissedBorder: '#ffc9d7',
  avatarFallbackBg: '#eee6f3',
  avatarFallbackBorder: '#cbb3dd',
  avatarInitials: '#7a4e96',
  typeCardActiveBg: '#eee6f3',
  tabBar: '#ffffff',
  tabBarBorder: '#eae4ef',
  inputBg: '#ffffff',
  // Neutral off-white surface for secondary/ghost buttons (dark text sits on top).
  buttonSecondaryBg: '#faf9f6',
  badgeMajorBg: '#ffe9ef',
  badgeModerateBg: '#fbf0dd',
  badgeMinorBg: '#e4fbee',
  // Splash accents. Foreground tones are shared with dark mode; only the soft Bg
  // tints below are light-mode specific.
  accentBlue: '#4fa6c4',
  accentBlueBg: '#def2f8',
  accentPurple: '#ab82c5',
  accentPurpleBg: '#eee6f3',
  accentGreen: '#43a97c',
  accentGreenBg: '#e4fbee',
  accentAmber: '#d2954a',
  accentAmberBg: '#fbf0dd',
  accentRed: '#db6a88',
  accentRedBg: '#ffe9ef',
  // Per-route medication colors (oral / dermal / injection / other). Foreground is
  // used for tile accents and text; Bg is the soft fill.
  routeOral: '#43a97c',
  routeOralBg: '#e4fbee',
  routeDermal: '#db6a88',
  routeDermalBg: '#ffe9ef',
  routeInjection: '#ab82c5',
  routeInjectionBg: '#eee6f3',
  routeOther: '#3fb0a0',
  routeOtherBg: '#a9eed8',
} as const;

export const darkColors = {
  bg: '#191520',
  surface: '#241e2e',
  text: '#f2ecf5',
  textMuted: '#a79fb0',
  accent: '#ab82c5',
  accentDark: '#8e63ab',
  onAccent: '#ffffff',
  brandMaroon: '#c9a6de',
  brandCrimson: '#ab82c5',
  brandDeep: '#c9a6de',
  border: '#3a3244',
  success: '#43a97c',
  successBg: '#123726',
  successBorder: '#2e7d53',
  successText: '#8fe3b8',
  pending: '#a79fb0',
  pendingBg: '#2a2530',
  partial: '#d2954a',
  partialBg: '#3a2a10',
  partialBorder: '#9c6b1f',
  partialText: '#eec98a',
  error: '#db6a88',
  errorBg: '#3a1622',
  errorBorder: '#db6a88',
  streakPerfectBg: '#123726',
  streakPerfectBorder: '#43a97c',
  streakPartialBg: '#2a1e33',
  streakPartialBorder: '#ab82c5',
  streakMissedBg: '#3a1622',
  streakMissedBorder: '#db6a88',
  avatarFallbackBg: '#2a1e33',
  avatarFallbackBorder: '#7a4e96',
  avatarInitials: '#e7d8f0',
  typeCardActiveBg: '#2a1e33',
  tabBar: '#241e2e',
  tabBarBorder: '#332b3e',
  inputBg: '#191520',
  buttonSecondaryBg: '#2b2436',
  badgeMajorBg: '#3a1622',
  badgeModerateBg: '#3a2a10',
  badgeMinorBg: '#123726',
  // Same foreground accents as light mode; only these deep Bg tints differ.
  accentBlue: '#4fa6c4',
  accentBlueBg: '#0f3540',
  accentPurple: '#ab82c5',
  accentPurpleBg: '#2a1e33',
  accentGreen: '#43a97c',
  accentGreenBg: '#123726',
  accentAmber: '#d2954a',
  accentAmberBg: '#3a2a10',
  accentRed: '#db6a88',
  accentRedBg: '#3a1622',
  routeOral: '#43a97c',
  routeOralBg: '#123726',
  routeDermal: '#db6a88',
  routeDermalBg: '#3a1622',
  routeInjection: '#ab82c5',
  routeInjectionBg: '#2a1e33',
  routeOther: '#3fb0a0',
  routeOtherBg: '#123330',
} as const;

export type ColorPalette = {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentDark: string;
  readonly onAccent: string;
  readonly brandMaroon: string;
  readonly brandCrimson: string;
  readonly brandDeep: string;
  readonly border: string;
  readonly success: string;
  readonly successBg: string;
  readonly successBorder: string;
  readonly successText: string;
  readonly pending: string;
  readonly pendingBg: string;
  readonly partial: string;
  readonly partialBg: string;
  readonly partialBorder: string;
  readonly partialText: string;
  readonly error: string;
  readonly errorBg: string;
  readonly errorBorder: string;
  readonly streakPerfectBg: string;
  readonly streakPerfectBorder: string;
  readonly streakPartialBg: string;
  readonly streakPartialBorder: string;
  readonly streakMissedBg: string;
  readonly streakMissedBorder: string;
  readonly avatarFallbackBg: string;
  readonly avatarFallbackBorder: string;
  readonly avatarInitials: string;
  readonly typeCardActiveBg: string;
  readonly tabBar: string;
  readonly tabBarBorder: string;
  readonly inputBg: string;
  readonly buttonSecondaryBg: string;
  readonly badgeMajorBg: string;
  readonly badgeModerateBg: string;
  readonly badgeMinorBg: string;
  readonly accentBlue: string;
  readonly accentBlueBg: string;
  readonly accentPurple: string;
  readonly accentPurpleBg: string;
  readonly accentGreen: string;
  readonly accentGreenBg: string;
  readonly accentAmber: string;
  readonly accentAmberBg: string;
  readonly accentRed: string;
  readonly accentRedBg: string;
  readonly routeOral: string;
  readonly routeOralBg: string;
  readonly routeDermal: string;
  readonly routeDermalBg: string;
  readonly routeInjection: string;
  readonly routeInjectionBg: string;
  readonly routeOther: string;
  readonly routeOtherBg: string;
};

/**
 * Ordered list of vibrant accents for cycling color "splashes" across lists/tiles.
 * Use with `accentForIndex` to give adjacent items distinct, theme-consistent hues.
 */
export const ACCENT_KEYS = [
  'accentBlue',
  'accentPurple',
  'accentGreen',
  'accentAmber',
  'accentRed',
] as const;

export type AccentKey = (typeof ACCENT_KEYS)[number];

export function accentForIndex(index: number): AccentKey {
  return ACCENT_KEYS[((index % ACCENT_KEYS.length) + ACCENT_KEYS.length) % ACCENT_KEYS.length];
}

export function accentBgKey(key: AccentKey): keyof ColorPalette {
  return `${key}Bg` as keyof ColorPalette;
}

/**
 * Per-route palette keys. Each medication route (oral / dermal / injection /
 * other) maps to a distinct foreground color and a soft background fill.
 */
export const ROUTE_COLOR_KEYS = {
  oral: { fg: 'routeOral', bg: 'routeOralBg' },
  dermal: { fg: 'routeDermal', bg: 'routeDermalBg' },
  injection: { fg: 'routeInjection', bg: 'routeInjectionBg' },
  other: { fg: 'routeOther', bg: 'routeOtherBg' },
} as const satisfies Record<string, { fg: keyof ColorPalette; bg: keyof ColorPalette }>;

type RouteColorId = keyof typeof ROUTE_COLOR_KEYS;

function isRouteColorId(route: string | null | undefined): route is RouteColorId {
  return !!route && route in ROUTE_COLOR_KEYS;
}

/** Foreground color key for a medication route (falls back to the brand accent). */
export function routeColorKey(route: string | null | undefined): keyof ColorPalette {
  return isRouteColorId(route) ? ROUTE_COLOR_KEYS[route].fg : 'accent';
}

/** Soft background fill key for a medication route (falls back to the brand tint). */
export function routeBgKey(route: string | null | undefined): keyof ColorPalette {
  return isRouteColorId(route) ? ROUTE_COLOR_KEYS[route].bg : 'accentPurpleBg';
}

/** @deprecated Prefer `useTheme().colors` for theme-aware UI */
export const colors: ColorPalette = lightColors;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Font families. We pair a chic geometric display face (Sora) for headings and
 * numbers with a clean, highly legible body face (Inter) for a minimalist vibe.
 * These names must match the keys registered via `useFonts` in the root layout.
 * If a face fails to load, React Native falls back to the system font.
 */
export const fonts = {
  display: 'Sora_700Bold',
  heading: 'Sora_600SemiBold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Reusable text styles that bake in the font family, size, weight and tracking. */
export const typography = {
  display: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
  },
  bodyStrong: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
} as const;
