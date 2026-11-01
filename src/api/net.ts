/** 网络请求超时工具：以 AbortController 实现的带超时的 fetch 包装，统一错误描述。 */

/** 把任意异常转换为对用户友好的中文提示。 */
export function describeNetworkError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (/abort|timeout/i.test(msg)) return '请求超时，请检查网络后重试。';
  if (/network|networkerror|failed to fetch|connection/i.test(msg)) return '网络连接失败，请检查网络设置。';
  return msg || '请求失败，请重试。';
}

export interface TimedFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** 超时毫秒数，默认 20000。 */
  timeoutMs?: number;
}

/** 带超时的 fetch。超时抛 TypeError('timeout')。 */
export async function timedFetch(url: string, options: TimedFetchOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}