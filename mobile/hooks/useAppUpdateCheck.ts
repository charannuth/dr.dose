import { useCallback, useEffect, useState } from 'react';
import { checkForAppUpdate, type AppUpdateInfo } from '../lib/appUpdate';
import {
  getDismissedUpdateVersion,
  setDismissedUpdateVersion,
} from '../lib/settings';

/**
 * Checks once per launch whether a newer App Store version is available and
 * surfaces it unless the user already dismissed the prompt for that exact version.
 */
export function useAppUpdateCheck() {
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await checkForAppUpdate();
      if (!active) return;
      if (!result.updateAvailable || !result.latestVersion) return;
      const dismissed = await getDismissedUpdateVersion();
      if (dismissed === result.latestVersion) return;
      if (active) setInfo(result);
    })();
    return () => {
      active = false;
    };
  }, []);

  const dismiss = useCallback(async () => {
    if (info?.latestVersion) {
      try {
        await setDismissedUpdateVersion(info.latestVersion);
      } catch {
        // best-effort; prompt will simply reappear next launch
      }
    }
    setInfo(null);
  }, [info]);

  return { updateInfo: info, dismissUpdate: dismiss };
}
