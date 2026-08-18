import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { checkForAppUpdate, type AppUpdateInfo } from '../lib/appUpdate';

/**
 * Hard update check: if the App Store has a newer version than this build,
 * surfaces blocking UI. Re-checks when the app returns to the foreground
 * (e.g. user left to the Store but came back without updating).
 */
export function useForceAppUpdate() {
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);
  const checking = useRef(false);

  const runCheck = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const result = await checkForAppUpdate();
      if (result.updateAvailable && result.storeUrl) {
        setInfo(result);
      } else {
        setInfo(null);
      }
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void runCheck();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [runCheck]);

  return { forceUpdate: info };
}
