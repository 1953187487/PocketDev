import { router } from 'expo-router';

/**
 * 安全返回：优先回退上一层；若无可回退历史（例如从深链直接进入子页面），
 * 统一回退到「设置」Tab，保证底部导航栏始终可见。
 */
export function safeBack(fallback: string = '/(tabs)/settings'): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

/** 回退到指定 Tab（用于配置完成后回到对应功能页）。 */
export function backToTab(path: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(path);
}
