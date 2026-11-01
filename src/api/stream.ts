import type { ProviderConfig } from '@/store/app';

export interface SseHandler {
  onDelta: (text: string) => void;
  onDone?: (full: string) => void;
  onError?: (message: string, status?: number) => void;
  signal?: AbortSignal;
}

/** OpenAI 兼容 SSE 增量解析（纯函数，便于单测）。 */
export function extractOpenAiDelta(rawLine: string): { text?: string; done?: boolean } | null {
  const line = rawLine.trim();
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return { done: true };
  try {
    const json = JSON.parse(payload);
    const delta = json.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content) return { text: delta.content };
    if (typeof json.choices?.[0]?.text === 'string' && json.choices[0].text) return { text: json.choices[0].text };
    return null;
  } catch {
    return null;
  }
}

/** Anthropic SSE 增量解析（纯函数）。 */
export function extractAnthropicDelta(rawLine: string): { text?: string; done?: boolean } | null {
  const line = rawLine.trim();
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return { done: true };
  try {
    const json = JSON.parse(payload);
    if (json.type === 'content_block_delta' && json.delta?.text) return { text: json.delta.text };
    if (json.type === 'message_stop') return { done: true };
    return null;
  } catch {
    return null;
  }
}

export function extractDelta(rawLine: string, anthropic: boolean): { text?: string; done?: boolean } | null {
  return anthropic ? extractAnthropicDelta(rawLine) : extractOpenAiDelta(rawLine);
}

/** 解析 HTTP 错误体，给出可读原因（纯函数）。 */
export function describeHttpError(status: number, body: string): string {
  let detail = '';
  const text = body.trim();
  if (text) {
    try {
      const j = JSON.parse(text);
      detail = j.error?.message || j.message || text.slice(0, 200);
    } catch {
      detail = text.slice(0, 200);
    }
  }
  if (status === 401 || status === 403) return 'API Key 无效或无权限，请检查设置';
  if (status === 404) return '接口地址或模型不存在，请检查 Base URL（需带 /v1）与模型名';
  if (status === 429) return '请求过于频繁或额度已用尽，请稍后重试';
  return detail || `请求失败（${status}）`;
}

/**
 * React Native 的 fetch 不提供 ReadableStream（无 res.body），
 * 必须用 XMLHttpRequest 的增量 responseText 读取 SSE。
 * 按行缓冲，每次 onprogress 只解析新增内容，避免重复拼接。
 */
export function sseFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  anthropic: boolean,
  handlers: SseHandler,
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  let buffer = '';
  let consumed = 0;
  let full = '';
  let aborted = false;
  let settled = false;

  const settle = () => {
    if (settled) return;
    settled = true;
    handlers.onDone?.(full);
  };

  const feed = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const parsed = extractDelta(line, anthropic);
      if (!parsed) continue;
      if (parsed.done) {
        settle();
        return;
      }
      if (parsed.text) {
        full += parsed.text;
        handlers.onDelta(parsed.text);
      }
    }
  };

  xhr.open(init.method ?? 'POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(init.headers ?? {})) {
    if (k.toLowerCase() === 'content-type') continue;
    xhr.setRequestHeader(k, v);
  }
  xhr.responseType = 'text';
  xhr.onprogress = () => {
    if (aborted || settled) return;
    const text = xhr.responseText ?? '';
    if (text.length <= consumed) return;
    const next = text.slice(consumed);
    consumed = text.length;
    feed(next);
  };
  xhr.onload = () => {
    if (aborted || settled) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      const rest = (xhr.responseText ?? '').slice(consumed);
      if (rest) {
        consumed += rest.length;
        feed(rest);
      }
      settle();
      return;
    }
    handlers.onError?.(describeHttpError(xhr.status, xhr.responseText ?? ''), xhr.status);
  };
  xhr.onerror = () => {
    if (aborted || settled) return;
    handlers.onError?.('网络错误，请检查网络连接与服务商地址', xhr.status);
  };
  xhr.ontimeout = () => {
    if (aborted || settled) return;
    handlers.onError?.('请求超时，请检查服务商是否可用', xhr.status);
  };
  xhr.send(init.body);

  const abort = () => {
    aborted = true;
    try {
      xhr.abort();
    } catch {
      /* ignore */
    }
  };
  handlers.signal?.addEventListener('abort', abort);
  return { abort };
}

/** OpenAI 兼容 / Anthropic 的 endpoint 规范化（强制 /v1，纯函数）。 */
export function buildEndpoint(baseUrl: string, interfaceType: ProviderConfig['interfaceType']): string {
  const raw = baseUrl.trim().replace(/\/+$/, '');
  if (!raw) return raw;
  if (interfaceType === 'anthropic') {
    return `${raw.endsWith('/v1') ? raw : `${raw}/v1`}/messages`;
  }
  const withV1 = raw.endsWith('/v1') ? raw : `${raw}/v1`;
  return `${withV1}/chat/completions`;
}

/** 模型列表 endpoint（本地直连也用同一规则）。 */
export function buildModelsEndpoint(baseUrl: string): string {
  const raw = baseUrl.trim().replace(/\/+$/, '');
  if (!raw) return raw;
  return `${raw.endsWith('/v1') ? raw : `${raw}/v1`}/models`;
}

/** 本地模型直连候选：Ollama / LM Studio / llama.cpp。 */
export const LOCAL_ENDPOINTS = [
  { label: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b' },
  { label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1', model: 'local-model' },
  { label: 'llama.cpp 服务', baseUrl: 'http://127.0.0.1:8080/v1', model: 'gpt-3.5-turbo' },
];

export function isLocalBaseUrl(baseUrl: string): boolean {
  const u = baseUrl.trim().toLowerCase();
  return u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('http://10.0.2.2');
}
