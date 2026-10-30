import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { getString, setString } from '@/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AccentColor {
  id: string;
  name: string;
  primary: string;
  primaryText: string;
  glow: string;
}

export const ACCENTS: AccentColor[] = [
  { id: 'blue', name: '苍穹蓝', primary: '#5B7FFF', primaryText: '#FFFFFF', glow: 'rgba(91,127,255,0.55)' },
  { id: 'purple', name: '星云紫', primary: '#A78BFA', primaryText: '#0B1020', glow: 'rgba(167,139,250,0.55)' },
  { id: 'cyan', name: '青璃', primary: '#22D3EE', primaryText: '#06202A', glow: 'rgba(34,211,238,0.55)' },
  { id: 'green', name: '薄荷', primary: '#34D399', primaryText: '#052E1F', glow: 'rgba(52,211,153,0.55)' },
  { id: 'pink', name: '樱粉', primary: '#F472B6', primaryText: '#3B0A24', glow: 'rgba(244,114,182,0.55)' },
  { id: 'amber', name: '琥珀', primary: '#FBBF24', primaryText: '#3B2A04', glow: 'rgba(251,191,36,0.55)' },
  { id: 'red', name: '赤焰', primary: '#F87171', primaryText: '#FFFFFF', glow: 'rgba(248,113,113,0.55)' },
];

const ACCENT_MAP = new Map(ACCENTS.map((a) => [a.id, a]));

export interface Palette {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  glass: string;
  glassStrong: string;
  glassBorder: string;
  glassHighlight: string;
  text: string;
  textDim: string;
  success: string;
  danger: string;
  warning: string;
  overlay: string;
}

const LIGHT: Omit<Palette, 'mode'> = {
  bg: '#EAF0FB',
  surface: 'rgba(255,255,255,0.55)',
  surfaceAlt: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.60)',
  glass: 'rgba(255,255,255,0.42)',
  glassStrong: 'rgba(255,255,255,0.60)',
  glassBorder: 'rgba(255,255,255,0.75)',
  glassHighlight: 'rgba(255,255,255,0.90)',
  text: '#101830',
  textDim: '#5A6685',
  success: '#0F9D6E',
  danger: '#E5484D',
  warning: '#B7791F',
  overlay: 'rgba(255,255,255,0.55)',
};

const DARK: Omit<Palette, 'mode'> = {
  bg: '#0B1020',
  surface: 'rgba(255,255,255,0.055)',
  surfaceAlt: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.08)',
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassHighlight: 'rgba(255,255,255,0.22)',
  text: '#F1F5FB',
  textDim: '#8A94AD',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  overlay: 'rgba(8,12,26,0.55)',
};

export interface Theme {
  mode: 'light' | 'dark';
  accent: AccentColor;
  palette: Palette;
  primary: string;
  primaryText: string;
}

interface ThemeCtx {
  theme: Theme;
  mode: ThemeMode;
  accentId: string;
  setMode: (m: ThemeMode) => void;
  setAccentId: (id: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const MODE_KEY = 'theme_mode';
const ACCENT_KEY = 'theme_accent';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentId, setAccentIdState] = useState<string>('blue');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, a] = await Promise.all([getString(MODE_KEY), getString(ACCENT_KEY)]);
      if (!alive) return;
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
      if (a && ACCENT_MAP.has(a)) setAccentIdState(a);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void setString(MODE_KEY, m);
  }, []);

  const setAccentId = useCallback((id: string) => {
    if (!ACCENT_MAP.has(id)) return;
    setAccentIdState(id);
    void setString(ACCENT_KEY, id);
  }, []);

  const value = useMemo<ThemeCtx>(() => {
    const resolvedMode: 'light' | 'dark' =
      mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
    const accent = ACCENT_MAP.get(accentId) ?? ACCENTS[0];
    const palette: Palette = {
      mode: resolvedMode,
      ...(resolvedMode === 'light' ? LIGHT : DARK),
    };
    return {
      theme: {
        mode: resolvedMode,
        accent,
        palette,
        primary: accent.primary,
        primaryText: accent.primaryText,
      },
      mode,
      accentId,
      setMode,
      setAccentId,
    };
  }, [mode, accentId, system, setMode, setAccentId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
