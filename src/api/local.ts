import { buildModelsEndpoint } from './stream';

export interface LocalCandidate {
  label: string;
  baseUrl: string;
  model: string;
}

/** 常见本地模型服务候选（Ollama / LM Studio / llama.cpp）。 */
export const LOCAL_CANDIDATES: LocalCandidate[] = [
  { label: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b' },
  { label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1', model: 'local-model' },
  { label: 'llama.cpp', baseUrl: 'http://127.0.0.1:8080/v1', model: 'gpt-3.5-turbo' },
];

const PROBE_TIMEOUT_MS = 1500;

/**
 * 探测本机哪些本地模型服务正在运行。
 * 用 /models 端点判断可达性，本地服务通常无需鉴权。
 */
export async function detectLocalServices(): Promise<Array<LocalCandidate & { models: string[] }>> {
  const results: Array<LocalCandidate & { models: string[] }> = [];
  for (const c of LOCAL_CANDIDATES) {
    const models = await probeModels(c.baseUrl);
    if (models) results.push({ ...c, models });
  }
  return results;
}

/** 探测单个地址的模型列表，失败返回 null。 */
export async function probeModels(baseUrl: string): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(buildModelsEndpoint(baseUrl), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const list = json?.data ?? json?.models ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map((m: unknown) => {
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object') {
          const o = m as Record<string, unknown>;
          const id = o.id ?? o.name ?? o.model;
          return typeof id === 'string' ? id : null;
        }
        return null;
      })
      .filter((v): v is string => !!v);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
