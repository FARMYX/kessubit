import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyPalette, C, DARK_PALETTE, LIGHT_PALETTE } from '../lib/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

type Ctx = {
  mode: ThemeMode;
  scheme: ColorScheme;
  /** Cambia con el esquema activo y fuerza un nuevo render del router. */
  revision: number;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'kesuubit.theme';
const ThemeCtx = createContext<Ctx>(null as any);

export const useTheme = () => useContext(ThemeCtx);

const isMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isMode(stored)) setModeState(stored);
      })
      .catch(() => {});
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const palette = scheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;

  // La paleta se aplica antes de renderizar los hijos: si el sistema ya está en
  // oscuro, el primer render debe nacer oscuro, sin pantallas a media pintar.
  if (C.bg !== palette.bg) applyPalette(palette);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.documentElement.style;
      style.setProperty('--ks-bg', palette.bg);
      style.setProperty('--ks-ink', palette.ink);
      style.setProperty('--ks-pink', palette.pink);
      style.setProperty('--ks-pink-soft', palette.pinkSoft);
      style.setProperty('--ks-border-strong', palette.borderStrong);
      document.documentElement.dataset.theme = scheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg);
    }
  }, [scheme, palette]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // La clave del Stack cambia con el esquema; así las pantallas se vuelven a
  // montar y todos sus estilos usan la paleta ya actualizada.
  const revision = scheme === 'dark' ? 1 : 0;
  const value = useMemo<Ctx>(() => ({ mode, scheme, revision, setMode }), [mode, scheme, revision, setMode]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
