/**
 * PocketDev 新 UI 底层 · 设计令牌
 * 统一间距、圆角、字号、动效、层级与布局常量，所有页面只从此处取值。
 * 与运行态主题共用同一份 space / radius 定义（单一来源），此处仅做语义化扩展。
 */

import { radius as themeRadius, space as themeSpace, type as themeType } from '@/theme';

export const space = themeSpace;
export const radius = themeRadius;

export const type = {
  ...themeType,
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const, letterSpacing: -0.1 },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  mono: { fontSize: 12.5, lineHeight: 18, fontWeight: '500' as const },
} as const;

export const motion = {
  fast: 140,
  base: 220,
  slow: 380,
  spring: { damping: 14, stiffness: 180, mass: 0.9 },
} as const;

export const elevation = {
  card: {
    shadowColor: '#0B1020',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sheet: {
    shadowColor: '#05070F',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
} as const;

export const layout = {
  screenPadding: space.lg,
  contentMaxWidth: 720,
  tabBarHeight: 58,
  composerMinHeight: 44,
  bubbleRadius: 18,
} as const;

export type ThemeAccentId = string;
