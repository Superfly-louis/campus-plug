import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { applyTheme, colors, type ThemeMode } from '@/constants/theme';

const storageKey = 'campusplug.theme';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'dark',
  setMode: () => undefined,
});

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

function paint(mode: ThemeMode) {
  applyTheme(mode);
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(mode);
    void SystemUI.setBackgroundColorAsync(colors.background);
  }
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active || !isThemeMode(value) || value === 'dark') return;
        paint(value);
        setModeState(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    paint(next);
    setModeState(next);
    void AsyncStorage.setItem(storageKey, next);
  }, []);

  return <ThemeModeContext.Provider value={{ mode, setMode }}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}
