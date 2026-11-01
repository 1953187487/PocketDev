import { Redirect } from 'expo-router';

/**
 * /settings 由 (tabs)/settings.tsx 提供，本文件仅做重定向，
 * 避免同一路径在 stack 与 tabs 中重复注册导致底部导航栏消失。
 */
export default function SettingsIndexRedirect() {
  return <Redirect href="/(tabs)/settings" />;
}
