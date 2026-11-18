import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const storageKey = 'campusplug.intro.v3';

type IntroContextValue = {
  seen: boolean | null;
  complete: () => void;
};

const IntroContext = createContext<IntroContextValue | null>(null);

async function readIntroSeen(): Promise<boolean> {
  const value = await AsyncStorage.getItem(storageKey);
  return value === '1';
}

async function markIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(storageKey, '1');
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void readIntroSeen()
      .then((value) => {
        if (active) setSeen(value);
      })
      .catch(() => {
        if (active) setSeen(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const complete = useCallback(() => {
    setSeen(true);
    void markIntroSeen();
  }, []);

  return <IntroContext.Provider value={{ seen, complete }}>{children}</IntroContext.Provider>;
}

export function useIntro(): IntroContextValue {
  const value = useContext(IntroContext);
  if (!value) throw new Error('useIntro must be used within IntroProvider');
  return value;
}
