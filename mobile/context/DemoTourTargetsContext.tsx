import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import type { View } from 'react-native';
import type { DemoTourTargetId } from '../lib/demoTour';

export type TourRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type DemoTourTargetsContextValue = {
  registerTarget: (id: DemoTourTargetId, ref: RefObject<View | null>) => void;
  unregisterTarget: (id: DemoTourTargetId) => void;
  registerScrollToTarget: (id: DemoTourTargetId, scroll: () => void) => void;
  unregisterScrollToTarget: (id: DemoTourTargetId) => void;
  measureTarget: (id: DemoTourTargetId) => Promise<TourRect | null>;
  scrollToTarget: (id: DemoTourTargetId) => void;
};

const DemoTourTargetsContext = createContext<DemoTourTargetsContextValue | null>(null);

export function DemoTourTargetsProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef(new Map<DemoTourTargetId, RefObject<View | null>>());
  const scrollRef = useRef(new Map<DemoTourTargetId, () => void>());

  const registerTarget = useCallback((id: DemoTourTargetId, ref: RefObject<View | null>) => {
    targetsRef.current.set(id, ref);
  }, []);

  const unregisterTarget = useCallback((id: DemoTourTargetId) => {
    targetsRef.current.delete(id);
  }, []);

  const registerScrollToTarget = useCallback((id: DemoTourTargetId, scroll: () => void) => {
    scrollRef.current.set(id, scroll);
  }, []);

  const unregisterScrollToTarget = useCallback((id: DemoTourTargetId) => {
    scrollRef.current.delete(id);
  }, []);

  const measureTarget = useCallback((id: DemoTourTargetId): Promise<TourRect | null> => {
    const ref = targetsRef.current.get(id);
    const node = ref?.current;
    if (!node) return Promise.resolve(null);

    return new Promise((resolve) => {
      node.measureInWindow((left, top, width, height) => {
        if (width < 1 && height < 1) {
          resolve(null);
          return;
        }
        resolve({ top, left, width, height });
      });
    });
  }, []);

  const scrollToTarget = useCallback((id: DemoTourTargetId) => {
    scrollRef.current.get(id)?.();
  }, []);

  const value = useMemo(
    () => ({
      registerTarget,
      unregisterTarget,
      registerScrollToTarget,
      unregisterScrollToTarget,
      measureTarget,
      scrollToTarget,
    }),
    [
      registerTarget,
      unregisterTarget,
      registerScrollToTarget,
      unregisterScrollToTarget,
      measureTarget,
      scrollToTarget,
    ],
  );

  return (
    <DemoTourTargetsContext.Provider value={value}>{children}</DemoTourTargetsContext.Provider>
  );
}

export function useDemoTourTargets() {
  const ctx = useContext(DemoTourTargetsContext);
  if (!ctx) {
    throw new Error('useDemoTourTargets must be used within DemoTourTargetsProvider');
  }
  return ctx;
}

export function useDemoTourTarget(id: DemoTourTargetId) {
  const { registerTarget, unregisterTarget } = useDemoTourTargets();
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTarget(id, ref);
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);

  return ref;
}
