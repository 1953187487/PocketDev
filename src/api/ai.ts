import type { ProviderConfig } from '@/store/app';

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

function endpoints(cfg: ProviderConfig) {
  if (cfg.interfaceType === 'anthropic') {
    return joinUrl(cfg.baseUrl, '/v1/messages');
  }
  return joinUrl(cfg.baseUrl, '/chat/completions');
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
function extractDelta(rawLine: string, anthropic: boolean): { text?: string; done?: boolean } | null {
  const line = rawLine.trim();
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return { done: true };
  try {
    const json = JSON.parse(payload);
    if (anthropic) {
      if (json.type === 'content_block_delta' && json.delta?.text) return { text: json.delta.text };
      if (json.type === 'message_stop') return { done: true };
      return null;
    }
    const delta = json.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content) return { text: delta.content };
    if (typeof json.choices?.[0]?.text === 'string' && json.choices[0].text) return { text: json.choices[0].text };
    return null;
  } catch {
    return null;
  }
}

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
  const res = await fetch(endpoints(cfg), {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(buildBody(cfg, messages, true)),
    signal: handlers.signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        detail = j.error?.message || j.message || text.slice(0, 200);
      } catch {
        detail = text.slice(0, 200);
      }
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403) throw new ChatError('API Key 无效或无权限，请检查设置', res.status);
    if (res.status === 404) throw new ChatError('接口地址或模型不存在，请检查 Base URL 与模型名', res.status);
    throw new ChatError(detail || `请求失败（${res.status}）`, res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const json = await res.json().catch(() => null);
    const text = anthropic ? json?.content?.[0]?.text ?? '' : json?.choices?.[0]?.message?.content ?? '';
    handlers.onDelta(text);
    handlers.onDone?.(text);
    return text;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const parsed = extractDelta(line, anthropic);
      if (!parsed) continue;
      if (parsed.done) {
        handlers.onDone?.(full);
        return full;
      }
      if (parsed.text) {
        full += parsed.text;
        handlers.onDelta(parsed.text);
      }
    }
  }
  handlers.onDone?.(full);
  return full;
}

export async function listRemoteModels(cfg: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  if (!cfg.apiKey.trim()) return [];
  const url = joinUrl(cfg.baseUrl, '/models');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
  if (!res.ok) throw new ChatError(`拉取失败（${res.status}）`, res.status);
  const json = await res.json();
  const list = json?.data ?? json?.models ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => (typeof m === 'string' ? m : m?.id ?? m?.name)).filter(Boolean);
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
