/** Public legal pages hosted on the web app (required for App Store Connect). */
export function webAppOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function privacyPolicyUrl(): string | null {
  const origin = webAppOrigin();
  return origin ? `${origin}/privacy` : null;
}

export function termsUrl(): string | null {
  const origin = webAppOrigin();
  return origin ? `${origin}/terms` : null;
}
