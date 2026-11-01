import type { ProviderConfig } from '@/store/app';
import {
  buildEndpoint,
  buildModelsEndpoint,
  extractDelta,
  isLocalBaseUrl,
  sseFetch,
} from './stream';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ChatError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ChatError';
  }
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  return `${base}${path}`;
}

function headers(cfg: ProviderConfig): Record<string, string> {
  if (cfg.interfaceType === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`,
  };
}

function buildBody(cfg: ProviderConfig, messages: ChatMessage[], stream: boolean) {
  if (cfg.interfaceType === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
    return {
      model: cfg.model,
      max_tokens: 4096,
      temperature: cfg.temperature,
      stream,
      ...(system ? { system } : {}),
      messages: rest,
    };
  }
  return {
    model: cfg.model,
    messages,
    temperature: cfg.temperature,
    stream,
  };
}

/** 从流式 SSE 行中抽取增量文本，返回 null 表示无内容。 */
export { extractDelta };

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone?: (full: string) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  cfg: ProviderConfig,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  if (!cfg.apiKey.trim()) throw new ChatError('尚未配置 API Key，请前往设置填写服务商密钥');
  if (!cfg.model.trim()) throw new ChatError('尚未配置模型名称，请前往设置填写');

  const anthropic = cfg.interfaceType === 'anthropic';
  const url = buildEndpoint(cfg.baseUrl, cfg.interfaceType);

  // React Native 的 fetch 不暴露 ReadableStream，这里统一走 XHR 增量读取。
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const controller = sseFetch(
      url,
      { headers: headers(cfg), body: JSON.stringify(buildBody(cfg, messages, true)) },
      anthropic,
      {
        onDelta: handlers.onDelta,
        onDone: (full) => {
          finish(() => {
            handlers.onDone?.(full);
            resolve(full);
          });
        },
        onError: (message, status) => {
          finish(() => reject(new ChatError(message, status)));
        },
        signal: handlers.signal,
      },
    );
    handlers.signal?.addEventListener('abort', () => {
      finish(() => {
        controller.abort();
        reject(new ChatError('已停止', 0));
      });
    });
  });
}

export async function listRemoteModels(cfg: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  if (!cfg.apiKey.trim()) return [];
  const url = buildModelsEndpoint(cfg.baseUrl);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
  if (!res.ok) throw new ChatError(`拉取失败（${res.status}）`, res.status);
  const json = await res.json();
  const list = json?.data ?? json?.models ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => (typeof m === 'string' ? m : m?.id ?? m?.name)).filter(Boolean);
}

/** 规范化服务商地址：OpenAI 兼容强制补 /v1；Anthropic 补 /v1 前缀。 */
export function normalizeBaseUrl(baseUrl: string, interfaceType: ProviderConfig['interfaceType']): string {
  const raw = baseUrl.trim().replace(/\/+$/, '');
  if (!raw) return raw;
  if (interfaceType === 'anthropic') {
    return raw.endsWith('/v1') ? raw : `${raw}/v1`;
  }
  return raw.endsWith('/v1') ? raw : `${raw}/v1`;
}

export function isLocalEndpoint(baseUrl: string): boolean {
  return isLocalBaseUrl(baseUrl);
}

export async function testProvider(cfg: ProviderConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await streamChat(cfg, [{ role: 'user', content: '回复 OK 两个字母' }], { onDelta: () => {} });
    if (text && text.trim()) return { ok: true, message: `连接正常，模型返回：${text.trim().slice(0, 40)}` };
    return { ok: false, message: '连接成功但没有返回内容，请确认模型名是否正确' };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

const LANG_NAMES: Record<string, string> = {
  zh: '中文（简体）',
  en: 'English',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
};

/** 使用已配置的服务商把文本翻译到目标语言。 */
export async function translateText(
  cfg: ProviderConfig,
  text: string,
  targetLang: string,
  onDelta?: (t: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const name = LANG_NAMES[targetLang] ?? targetLang;
  const system =
    '你是一个专业翻译引擎。只输出翻译结果，保留原始换行、Markdown 与代码块结构，不要解释、不要加引号。';
  const user = `请把下面内容翻译成${name}：\n\n${text}`;
  return streamChat(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { onDelta: onDelta ?? (() => {}), signal },
  );
}

export const TRANSLATE_LANGS = Object.entries(LANG_NAMES).map(([code, label]) => ({ code, label }));
