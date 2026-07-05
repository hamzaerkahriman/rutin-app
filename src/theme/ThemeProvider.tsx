import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, darkTheme, lightTheme } from './colors';

type ThemeMode = 'system' | 'dark' | 'light';

const STORAGE_KEY = 'rutin.themeMode';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Varsayılan olarak 'dark': premium safir/altın kimlik en iyi koyu zeminde
  // okunuyor. Kullanıcı Profil'den 'Aydınlık'/'Sistem'e açıkça geçebilir.
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo(() => ({ theme, mode, isDark, setMode }), [theme, mode, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
