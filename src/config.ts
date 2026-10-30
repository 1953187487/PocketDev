export const THEME = {
  dark: {
    bg: '#0B1020',
    surface: '#151B2E',
    surfaceAlt: '#1E2740',
    border: '#2A3550',
    text: '#F1F5FB',
    textDim: '#8A94AD',
    primary: '#5B7FFF',
    primaryText: '#0B1020',
    success: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
    accent: '#A78BFA',
  },
} as const;

export type Theme = typeof THEME.dark;

export const CONTRIBUTORS = [
  { name: '长亭科技 (Chaitin)', role: '底层平台 MonkeyCode 原作者', link: 'https://github.com/chaitin/MonkeyCode' },
  { name: 'MonkeyCode 开源社区', role: 'AI 能力 / API / 协议实现', link: 'https://github.com/chaitin/MonkeyCode' },
  { name: 'Expo', role: 'React Native 原生工程框架', link: 'https://expo.dev' },
  { name: 'React Native', role: '跨平台移动运行时', link: 'https://reactnative.dev' },
  { name: 'PocketDev Contributors', role: '本项目贡献者', link: 'https://github.com/1953187487/PocketDev' },
];

export const APP_REPO = '1953187487/PocketDev';
export const APP_REPO_URL = 'https://github.com/1953187487/PocketDev';
export const APP_VERSION = '1.0.0';
export const BASE_LAYER_REPO = 'chaitin/MonkeyCode';
