import { getObject, setObject } from '@/storage';
import { streamChat } from './ai';
import type { ProviderConfig } from '@/store/app';

export interface AppletParam {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  default?: string;
}

export interface AppletDef {
  id: string;
  name: string;
  description: string;
  /** 应用体：`return async (ctx, args) => { ... }` */
  code: string;
  params: AppletParam[];
  enabled: boolean;
  createdAt: number;
}

export interface AppletContext {
  /** AI 调用：使用当前服务商非流式对话。 */
  ai: (prompt: string, system?: string) => Promise<string>;
  /** 受限 HTTP 请求。 */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** 轻量键值存储（AsyncStorage）。 */
  storage: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void> };
  log: (msg: string) => void;
}

const KEY = 'applets_v1';

const DEFAULT_CODE = `// 可用 ctx.ai / ctx.fetch / ctx.storage / ctx.log
return async (ctx, args) => {
  const text = args.text || '你好';
  const answer = await ctx.ai('请简洁回答：' + text);
  return answer;
};`;

export const SAMPLE_APPLETS: AppletDef[] = [
  {
    id: 'sample-echo',
    name: '问候',
    description: '调用 AI 打招呼，演示 ctx.ai 用法',
    code: `return async (ctx, args) => {
  return await ctx.ai('用一句话打个招呼，风格：' + (args.style || '活泼'));
};`,
    params: [{ key: 'style', label: '风格', type: 'text', default: '活泼' }],
    enabled: true,
    createdAt: 0,
  },
  {
    id: 'sample-time',
    name: '时间戳',
    description: '返回当前时间（演示非 AI 计算）',
    code: `return async () => {
  return new Date().toLocaleString('zh-CN');
};`,
    params: [],
    enabled: true,
    createdAt: 0,
  },
];

export async function loadApplets(): Promise<AppletDef[]> {
  const list = await getObject<AppletDef[]>(KEY);
  if (list && list.length) return list;
  await setObject(KEY, SAMPLE_APPLETS);
  return SAMPLE_APPLETS;
}

export async function saveApplets(list: AppletDef[]): Promise<void> {
  await setObject(KEY, list);
}

export function makeAppletId(): string {
  return `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface AppletResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  logs: string[];
}

/** 解析参数（按类型与默认值填充）。 */
export function buildArgs(params: AppletParam[], raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of params) {
    const rawVal = (raw[p.key] ?? p.default ?? '').trim();
    if (p.type === 'number') out[p.key] = Number(rawVal || 0);
    else if (p.type === 'boolean') out[p.key] = rawVal === 'true' || rawVal === '1';
    else out[p.key] = rawVal;
  }
  return out;
}

/** 编译并执行功能应用，限制为纯函数签名 `return async (ctx,args)=>...`。 */
export async function runApplet(
  def: AppletDef,
  provider: ProviderConfig,
  args: Record<string, unknown>,
  timeoutMs = 60000,
): Promise<AppletResult> {
  const logs: string[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const ctx: AppletContext = {
    ai: async (prompt, system) =>
      streamChat(
        provider,
        system ? [{ role: 'system', content: system }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
        { onDelta: () => {}, signal: controller.signal },
      ),
    fetch: (url, init) => fetch(url, { ...init, signal: controller.signal }),
    storage: {
      get: async (k) => (await getObject<string | null>(`applet:${def.id}:${k}`)) ?? null,
      set: async (k, v) => {
        await setObject(`applet:${def.id}:${k}`, v);
      },
    },
    log: (m) => logs.push(String(m)),
  };

  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function('ctx', 'args', `try { return (function(){ ${def.code} }).call(this); } catch(e){ return e; }`);
    let fn = factory(ctx, args);
    if (fn instanceof Promise) fn = await fn;
    if (typeof fn !== 'function') throw new Error('应用体必须 `return async (ctx, args) => ...`');
    const value = await (fn as (c: AppletContext, a: Record<string, unknown>) => unknown)(ctx, args);
    return { ok: true, value, logs };
  } catch (e) {
    return { ok: false, error: (e as Error).message || '运行失败', logs };
  } finally {
    clearTimeout(timer);
  }
}

export function emptyApplet(): AppletDef {
  return {
    id: makeAppletId(),
    name: '新功能应用',
    description: '',
    code: DEFAULT_CODE,
    params: [],
    enabled: true,
    createdAt: Date.now(),
  };
}
