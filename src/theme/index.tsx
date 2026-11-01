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
export type ResolvedMode = 'light' | 'dark';

export interface AccentColor {
  id: string;
  name: string;
  primary: string;
  primaryText: string;
  soft: string;
}

/**
 * 强调色板，移植自 Aries-AI（https://github.com/ZG0704666/Aries-AI）
 * core/designsystem/theme/ThemeAccent.kt 的 M3 色板（MIT）。
 */
export const ACCENTS: AccentColor[] = [
  { id: 'azure', name: '苍穹蓝', primary: '#5B7FFF', primaryText: '#FFFFFF', soft: 'rgba(91,127,255,0.16)' },
  { id: 'ocean', name: '海洋', primary: '#006495', primaryText: '#FFFFFF', soft: 'rgba(0,100,149,0.16)' },
  { id: 'forest', name: '森林', primary: '#2F6B3F', primaryText: '#FFFFFF', soft: 'rgba(47,107,63,0.16)' },
  { id: 'sunset', name: '日落', primary: '#9A4A17', primaryText: '#FFFFFF', soft: 'rgba(154,74,23,0.16)' },
  { id: 'rose', name: '樱粉', primary: '#9C415D', primaryText: '#FFFFFF', soft: 'rgba(156,65,93,0.16)' },
  { id: 'violet', name: '星云紫', primary: '#A78BFA', primaryText: '#0B1020', soft: 'rgba(167,139,250,0.16)' },
  { id: 'cyan', name: '青璃', primary: '#22D3EE', primaryText: '#05202A', soft: 'rgba(34,211,238,0.16)' },
  { id: 'mint', name: '薄荷', primary: '#34D399', primaryText: '#04291C', soft: 'rgba(52,211,153,0.16)' },
  { id: 'amber', name: '琥珀', primary: '#FBBF24', primaryText: '#3B2A04', soft: 'rgba(251,191,36,0.16)' },
  { id: 'ember', name: '赤焰', primary: '#FB7185', primaryText: '#FFFFFF', soft: 'rgba(251,113,133,0.16)' },
];

const ACCENT_MAP = new Map(ACCENTS.map((a) => [a.id, a]));

export interface Palette {
  mode: ResolvedMode;
  bg: string;
  bgDeep: string;
  auroraA: string;
  auroraB: string;
  auroraC: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  success: string;
  danger: string;
  warning: string;
  overlay: string;
  bubbleIn: string;
  bubbleOut: string;
  shadow: string;
}

const LIGHT: Omit<Palette, 'mode'> = {
  bg: '#F2F5FC',
  bgDeep: '#E6ECF9',
  auroraA: 'rgba(120,150,255,0.42)',
  auroraB: 'rgba(180,140,255,0.34)',
  auroraC: 'rgba(90,220,235,0.30)',
  surface: 'rgba(255,255,255,0.82)',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: 'rgba(255,255,255,0.55)',
  border: 'rgba(16,24,48,0.08)',
  borderStrong: 'rgba(16,24,48,0.14)',
  text: '#0E1526',
  textDim: '#5B6885',
  textFaint: '#8D98B0',
  success: '#0C9B6B',
  danger: '#DC2F35',
  warning: '#A8681A',
  overlay: 'rgba(235,241,252,0.72)',
  bubbleIn: 'rgba(255,255,255,0.92)',
  bubbleOut: '#DCE7FF',
  shadow: 'rgba(20,32,64,0.12)',
};

const DARK: Omit<Palette, 'mode'> = {
  bg: '#080B16',
  bgDeep: '#060912',
  auroraA: 'rgba(84,116,255,0.34)',
  auroraB: 'rgba(150,102,255,0.26)',
  auroraC: 'rgba(24,190,214,0.20)',
  surface: 'rgba(255,255,255,0.055)',
  surfaceRaised: '#121828',
  surfaceSunken: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F2F6FF',
  textDim: '#94A0BC',
  textFaint: '#67718C',
  success: '#34D399',
  danger: '#FB7185',
  warning: '#FBBF24',
  overlay: 'rgba(6,9,18,0.72)',
  bubbleIn: 'rgba(255,255,255,0.06)',
  bubbleOut: 'rgba(91,127,255,0.24)',
  shadow: 'rgba(0,0,0,0.55)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999 } as const;

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
} as const;

export interface Theme {
  mode: ResolvedMode;
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
  const [accentId, setAccentIdState] = useState<string>('ocean');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, a] = await Promise.all([getString(MODE_KEY), getString(ACCENT_KEY)]);
      if (!alive) return;
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
      if (a && ACCENT_MAP.has(a)) setAccentIdState(a);
      else if (a) {
        const legacy: Record<string, string> = { blue: 'azure', purple: 'violet', green: 'mint', pink: 'rose', red: 'ember' };
        if (legacy[a] && ACCENT_MAP.has(legacy[a])) setAccentIdState(legacy[a]);
      }
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
    const resolved: ResolvedMode = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
    const accent = ACCENT_MAP.get(accentId) ?? ACCENTS[0];
    const palette: Palette = { mode: resolved, ...(resolved === 'light' ? LIGHT : DARK) };
    return {
      theme: { mode: resolved, accent, palette, primary: accent.primary, primaryText: accent.primaryText },
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

export function alpha(hex: string, a: number): string {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}
