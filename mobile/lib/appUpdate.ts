import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BUNDLE_ID = 'com.charannuth.drdose';

export type AppUpdateInfo = {
  updateAvailable: boolean;
  installedVersion: string;
  latestVersion: string | null;
  storeUrl: string | null;
};

/** The version baked into this build from app.json (e.g. "2.0.0"). */
export function getInstalledVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * Compares two dotted version strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 * Missing segments are treated as 0 (so "2.0" === "2.0.0").
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

/**
 * Checks the public iTunes lookup API for the latest App Store version and
 * compares it to the installed build. No server or auth required. The lookup can
 * lag a few hours behind a release, and only applies on iOS.
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  const installedVersion = getInstalledVersion();
  const empty: AppUpdateInfo = {
    updateAvailable: false,
    installedVersion,
    latestVersion: null,
    storeUrl: null,
  };

  if (Platform.OS !== 'ios') return empty;

  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&t=${Date.now()}`,
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      results?: { version?: string; trackId?: number; trackViewUrl?: string }[];
    };
    const result = json.results?.[0];
    if (!result?.version) return empty;

    const latestVersion = result.version;
    const storeUrl =
      result.trackViewUrl ??
      (result.trackId ? `https://apps.apple.com/app/id${result.trackId}` : null);

    return {
      updateAvailable: compareVersions(latestVersion, installedVersion) > 0,
      installedVersion,
      latestVersion,
      storeUrl,
    };
  } catch {
    return empty;
  }
}
