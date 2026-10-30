import type {
  AddGitIdentityReq,
  ApiEnvelope,
  CheckModelResp,
  CreateModelReq,
  CreateProjectReq,
  GitIdentity,
  Model,
  Project,
  ProviderModelItem,
  Subscription,
  UserStatus,
  Wallet,
} from './types';

export const DEFAULT_BASE_URL = 'https://monkeycode-ai.com';

let baseUrl = DEFAULT_BASE_URL;
let apiKey = '';
let onUnauthorized: (() => void) | null = null;

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}
export function getBaseUrl() {
  return baseUrl;
}

export function setApiKey(key: string) {
  apiKey = (key || '').trim();
}
export function getApiKey() {
  return apiKey;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(query?: Query): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

function authHeaders(): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<ApiEnvelope<T>> {
  const { method = 'GET', query, body, signal } = opts;
  const url = `${baseUrl}${path}${buildQuery(query)}`;

  const headers: Record<string, string> = { ...authHeaders() };
  if (body) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    throw new ApiError((e as Error)?.message || '网络错误');
  }

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError('登录已过期，请重新登录', undefined, 401);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    if (!res.ok) throw new ApiError(`请求失败（${res.status}）`, undefined, res.status);
    return { code: 0 } as ApiEnvelope<T>;
  }

  if (json && typeof json.code === 'number' && json.code !== 0) {
    throw new ApiError(json.message || '请求失败', json.code, res.status);
  }
  if (!res.ok && (!json || typeof json.code !== 'number')) {
    throw new ApiError(`请求失败（${res.status}）`, undefined, res.status);
  }
  return json as ApiEnvelope<T>;
}

/* ----------------------------- 用户 ----------------------------- */

export async function getUserStatus(): Promise<UserStatus> {
  const resp = await request<{ user?: UserStatus }>('/api/v1/users/status');
  return resp.data?.user ?? {};
}

export async function getWallet(): Promise<Wallet | null> {
  const resp = await request<Wallet>('/api/v1/users/wallet');
  return resp.data ?? null;
}

export async function getSubscription(): Promise<Subscription | null> {
  const resp = await request<Subscription>('/api/v1/users/subscription');
  return resp.data ?? null;
}

/* ----------------------------- 项目 / 任务 ----------------------------- */

export async function listProjects(params: { cursor?: string; limit?: number } = {}): Promise<{
  projects: Project[];
  hasMore: boolean;
}> {
  const resp = await request<{ projects?: Project[]; page?: { has_more?: boolean; cursor?: string } }>(
    '/api/v1/users/projects',
    { query: params },
  );
  return { projects: resp.data?.projects ?? [], hasMore: !!resp.data?.page?.has_more };
}

export async function getProjectDetail(id: string): Promise<Project | null> {
  const resp = await request<Project>(`/api/v1/users/projects/${id}`);
  return resp.data ?? null;
}

export async function createProject(req: CreateProjectReq): Promise<Project | null> {
  const resp = await request<Project>('/api/v1/users/projects', { method: 'POST', body: req });
  return resp.data ?? null;
}

/* ----------------------------- Git 身份 ----------------------------- */

export async function listGitIdentities(): Promise<GitIdentity[]> {
  const resp = await request<GitIdentity[]>('/api/v1/users/git-identities');
  return (resp.data ?? []).filter((i) => i.platform !== 'internal');
}

export async function getGitIdentity(id: string, flush = false): Promise<GitIdentity | null> {
  const resp = await request<GitIdentity>(`/api/v1/users/git-identities/${id}`, { query: { flush } });
  return resp.data ?? null;
}

export async function addGitIdentity(req: AddGitIdentityReq): Promise<GitIdentity | null> {
  const resp = await request<GitIdentity>('/api/v1/users/git-identities', { method: 'POST', body: req });
  return resp.data ?? null;
}

export function deleteGitIdentity(id: string) {
  return request(`/api/v1/users/git-identities/${id}`, { method: 'DELETE' });
}

/* ----------------------------- 模型 ----------------------------- */

export async function listModels(): Promise<Model[]> {
  const resp = await request<{ models?: Model[] }>('/api/v1/users/models');
  return resp.data?.models ?? [];
}

export async function createModel(req: CreateModelReq): Promise<Model | null> {
  const resp = await request<Model>('/api/v1/users/models', { method: 'POST', body: req });
  return resp.data ?? null;
}

export function updateModel(id: string, req: Partial<CreateModelReq>) {
  return request(`/api/v1/users/models/${id}`, { method: 'PUT', body: req });
}

export function deleteModel(id: string) {
  return request(`/api/v1/users/models/${id}`, { method: 'DELETE' });
}

export async function checkModelConfig(
  req: Pick<CreateModelReq, 'provider' | 'model' | 'base_url' | 'api_key' | 'interface_type'>,
): Promise<CheckModelResp> {
  const resp = await request<CheckModelResp>('/api/v1/users/models/health-check', {
    method: 'POST',
    body: req,
  });
  return resp.data ?? {};
}

export async function listProviderModels(params: {
  api_key: string;
  base_url: string;
  provider: string;
}): Promise<ProviderModelItem[]> {
  const resp = await request<{ models?: ProviderModelItem[] }>('/api/v1/users/models/providers', {
    query: params,
  });
  return resp.data?.models ?? [];
}
