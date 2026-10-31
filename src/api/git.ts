import type { GitConfig, GitPlatform } from '@/store/app';

export interface Repo {
  fullName: string;
  name: string;
  owner: string;
  description?: string;
  private?: boolean;
  url: string;
  defaultBranch?: string;
  updatedAt?: string;
  language?: string;
  stars?: number;
}

export const GIT_HOSTS: Record<GitPlatform, { label: string; api: string; web: string }> = {
  github: { label: 'GitHub', api: 'https://api.github.com', web: 'https://github.com' },
  gitlab: { label: 'GitLab', api: 'https://gitlab.com/api/v4', web: 'https://gitlab.com' },
  gitee: { label: 'Gitee', api: 'https://gitee.com/api/v5', web: 'https://gitee.com' },
  gitea: { label: 'Gitea', api: 'https://gitea.com/api/v1', web: 'https://gitea.com' },
};

export class GitError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GitError';
  }
}

function apiBase(cfg: GitConfig): string {
  const base = (cfg.baseUrl || GIT_HOSTS[cfg.platform].web).trim().replace(/\/+$/, '');
  switch (cfg.platform) {
    case 'gitlab':
      return `${base}/api/v4`;
    case 'gitee':
      return `${base}/api/v5`;
    case 'gitea':
      return `${base}/api/v1`;
    default:
      return 'https://api.github.com';
  }
}

function headers(cfg: GitConfig): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (cfg.platform === 'github' || cfg.platform === 'gitea') h.Authorization = `Bearer ${cfg.token}`;
  else if (cfg.platform === 'gitlab') h['PRIVATE-TOKEN'] = cfg.token;
  else if (cfg.platform === 'gitee') h.Authorization = `token ${cfg.token}`;
  return h;
}

async function call<T>(cfg: GitConfig, path: string, init?: RequestInit): Promise<T> {
  if (!cfg.token.trim()) throw new GitError('尚未配置访问令牌，请在设置中填写');
  const url = `${apiBase(cfg)}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...headers(cfg), ...(init?.headers as Record<string, string> | undefined) } });
  } catch (e) {
    throw new GitError('网络错误，无法连接到代码托管平台');
  }
  if (res.status === 401) throw new GitError('令牌无效或已过期（401）', 401);
  if (res.status === 403) throw new GitError('令牌权限不足或触发频率限制（403）', 403);
  if (res.status === 404) throw new GitError('资源不存在，请检查仓库名或令牌权限（404）', 404);
  if (!res.ok) throw new GitError(`请求失败（${res.status}）`, res.status);
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function verifyToken(cfg: GitConfig): Promise<{ ok: boolean; message: string; username?: string; avatar?: string }> {
  try {
    if (cfg.platform === 'github') {
      const u = await call<{ login: string; avatar_url: string }>(cfg, '/user');
      return { ok: true, message: `已连接 GitHub：${u.login}`, username: u.login, avatar: u.avatar_url };
    }
    if (cfg.platform === 'gitlab') {
      const u = await call<{ username: string; avatar_url: string }>(cfg, '/user');
      return { ok: true, message: `已连接 GitLab：${u.username}`, username: u.username, avatar: u.avatar_url };
    }
    if (cfg.platform === 'gitee') {
      const u = await call<{ login: string; avatar_url: string }>(cfg, '/user');
      return { ok: true, message: `已连接 Gitee：${u.login}`, username: u.login, avatar: u.avatar_url };
    }
    const u = await call<{ login: string; avatar_url: string }>(cfg, '/user');
    return { ok: true, message: `已连接 Gitea：${u.login}`, username: u.login, avatar: u.avatar_url };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function listRepos(cfg: GitConfig): Promise<Repo[]> {
  if (cfg.platform === 'github') {
    const items = await call<any[]>(cfg, '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
    return items.map((r) => ({
      fullName: r.full_name,
      name: r.name,
      owner: r.owner?.login ?? '',
      description: r.description ?? undefined,
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
      language: r.language ?? undefined,
      stars: r.stargazers_count,
    }));
  }
  if (cfg.platform === 'gitlab') {
    const items = await call<any[]>(cfg, '/projects?membership=true&per_page=100&order_by=last_activity_at');
    return items.map((r) => ({
      fullName: r.path_with_namespace,
      name: r.name,
      owner: r.namespace?.path ?? '',
      description: r.description ?? undefined,
      private: r.visibility !== 'public',
      url: r.web_url,
      defaultBranch: r.default_branch,
      updatedAt: r.last_activity_at,
    }));
  }
  if (cfg.platform === 'gitee') {
    const items = await call<any[]>(cfg, '/user/repos?per_page=100&sort=updated');
    return items.map((r) => ({
      fullName: r.full_name,
      name: r.name,
      owner: r.owner?.login ?? '',
      description: r.description ?? undefined,
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));
  }
  const items = await call<any[]>(cfg, '/user/repos?limit=50');
  return items.map((r) => ({
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login ?? '',
    description: r.description ?? undefined,
    private: r.private,
    url: r.html_url,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
  }));
}

export interface CreateRepoInput {
  name: string;
  description?: string;
  private: boolean;
  autoInit?: boolean;
}

export async function createRepo(cfg: GitConfig, input: CreateRepoInput): Promise<Repo> {
  if (cfg.platform === 'github') {
    const r = await call<any>(cfg, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? '',
        private: input.private,
        auto_init: input.autoInit ?? true,
      }),
    });
    return {
      fullName: r.full_name,
      name: r.name,
      owner: r.owner?.login ?? '',
      description: r.description ?? undefined,
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
    };
  }
  if (cfg.platform === 'gitlab') {
    const r = await call<any>(cfg, '/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? '',
        visibility: input.private ? 'private' : 'public',
        initialize_with_readme: input.autoInit ?? true,
      }),
    });
    return {
      fullName: r.path_with_namespace,
      name: r.name,
      owner: r.namespace?.path ?? '',
      description: r.description ?? undefined,
      private: r.visibility !== 'public',
      url: r.web_url,
      defaultBranch: r.default_branch,
    };
  }
  if (cfg.platform === 'gitee') {
    const r = await call<any>(cfg, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? '',
        private: input.private,
        auto_init: input.autoInit ?? true,
      }),
    });
    return {
      fullName: r.full_name,
      name: r.name,
      owner: r.owner?.login ?? '',
      description: r.description ?? undefined,
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
    };
  }
  const r = await call<any>(cfg, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? '',
      private: input.private,
      auto_init: input.autoInit ?? true,
    }),
  });
  return {
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login ?? '',
    description: r.description ?? undefined,
    private: r.private,
    url: r.html_url,
    defaultBranch: r.default_branch,
  };
}

export async function deleteRepo(cfg: GitConfig, fullName: string): Promise<void> {
  if (cfg.platform === 'github') {
    await call(cfg, `/repos/${fullName}`, { method: 'DELETE' });
    return;
  }
  if (cfg.platform === 'gitlab') {
    await call(cfg, `/projects/${encodeURIComponent(fullName)}`, { method: 'DELETE' });
    return;
  }
  await call(cfg, `/repos/${fullName}`, { method: 'DELETE' });
}
