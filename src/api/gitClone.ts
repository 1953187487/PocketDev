import * as FileSystem from 'expo-file-system/legacy';
import type { GitConfig } from '@/store/app';
import { GitError, GIT_HOSTS } from './git';

export interface CloneProgress {
  total: number;
  done: number;
  current: string;
}

export interface CloneOptions {
  /** 单文件最大字节数，默认 5MB。 */
  maxFileBytes?: number;
  /** 最大文件数，默认 2000。 */
  maxFiles?: number;
  signal?: AbortSignal;
  onProgress?: (p: CloneProgress) => void;
}

/** 拉取源码时跳过的目录与文件片段。 */
const SKIP_SEGMENTS = ['node_modules', '.git', 'build', 'dist', '.gradle', '.idea', '.expo', '.next', 'target', '__pycache__'];
const SKIP_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.zip', '.gz', '.tar', '.rar', '.7z', '.mp3', '.mp4', '.mov', '.webm', '.ttf', '.otf', '.woff', '.woff2', '.pdf', '.apk', '.aab', '.jks', '.keystore', '.db', '.sqlite', '.bin', '.exe', '.dll', '.so', '.jar', '.aar'];

/** 判断路径是否应跳过（二进制/依赖目录/大文件片段）。 */
export function shouldSkip(path: string): boolean {
  const segs = path.split('/');
  if (segs.some((s) => SKIP_SEGMENTS.includes(s))) return true;
  const dot = path.lastIndexOf('.');
  if (dot >= 0) return SKIP_EXT.includes(path.slice(dot).toLowerCase());
  return false;
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
  const h: Record<string, string> = { Accept: 'application/json' };
  if (cfg.platform === 'github' || cfg.platform === 'gitea') h.Authorization = `Bearer ${cfg.token}`;
  else if (cfg.platform === 'gitlab') h['PRIVATE-TOKEN'] = cfg.token;
  else if (cfg.platform === 'gitee') h.Authorization = `token ${cfg.token}`;
  return h;
}

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha?: string;
}

async function getTree(cfg: GitConfig, owner: string, repo: string, branch: string, signal?: AbortSignal): Promise<TreeEntry[]> {
  const url = `${apiBase(cfg)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const res = await fetch(url, { headers: headers(cfg), signal });
  if (!res.ok) {
    if (res.status === 404) throw new GitError('仓库或分支不存在（404），请检查仓库名与分支', 404);
    if (res.status === 403) throw new GitError('令牌权限不足或触发频率限制（403）', 403);
    throw new GitError(`拉取文件清单失败（${res.status}）`, res.status);
  }
  const data = (await res.json()) as { tree?: TreeEntry[]; truncated?: boolean };
  return data.tree ?? [];
}

async function getBlob(cfg: GitConfig, owner: string, repo: string, sha: string, signal?: AbortSignal): Promise<string> {
  const url = `${apiBase(cfg)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${sha}`;
  const res = await fetch(url, { headers: headers(cfg), signal });
  if (!res.ok) throw new GitError(`读取文件失败（${res.status}）`, res.status);
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return '';
  if (data.encoding === 'base64') {
    return decodeBase64(data.content.replace(/\n/g, ''));
  }
  return data.content;
}

export function decodeBase64(b64: string): string {
  // React Native 无 Buffer：atob 得到二进制串，再按 UTF-8 解码。
  try {
    const bin = globalThis.atob ? globalThis.atob(b64) : fallbackAtob(b64);
    return utf8FromBinary(bin);
  } catch {
    return fallbackAtob(b64);
  }
}

function utf8FromBinary(bin: string): string {
  try {
    return decodeURIComponent(
      bin
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return bin;
  }
}

function fallbackAtob(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  let out = '';
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = clean[i + 2] ? chars.indexOf(clean[i + 2]) : 0;
    const d = clean[i + 3] ? chars.indexOf(clean[i + 3]) : 0;
    out += String.fromCharCode((a << 2) | (b >> 4));
    if (clean[i + 2]) out += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (clean[i + 3]) out += String.fromCharCode(((c & 3) << 6) | d);
  }
  return out;
}

/**
 * 递归拉取仓库源码到本地目录（REST git/trees + git/blobs）。
 * 返回实际写入的文件数与跳过的文件数。
 */
export async function cloneRepoToDir(
  cfg: GitConfig,
  owner: string,
  repo: string,
  branch: string,
  destDir: string,
  options: CloneOptions = {},
): Promise<{ written: number; skipped: number }> {
  const maxBytes = options.maxFileBytes ?? 5 * 1024 * 1024;
  const maxFiles = options.maxFiles ?? 2000;
  if (!cfg.token.trim()) throw new GitError('尚未配置访问令牌，请在设置中填写');

  const tree = await getTree(cfg, owner, repo, branch, options.signal);
  const files = tree.filter((e) => e.type === 'blob' && !shouldSkip(e.path));

  // 先写目录结构
  await FileSystem.makeDirectoryAsync(destDir.replace(/\/+$/, ''), { intermediates: true });

  let written = 0;
  let skipped = 0;
  for (const f of files) {
    if (options.signal?.aborted) throw new GitError('拉取已取消');
    if (written >= maxFiles) {
      skipped += files.length - written;
      break;
    }
    if (f.size && f.size > maxBytes) {
      skipped += 1;
      continue;
    }
    options.onProgress?.({ total: files.length, done: written, current: f.path });
    const filePath = `${destDir.replace(/\/+$/, '')}/${f.path}`;
    const dir = filePath.split('/').slice(0, -1).join('/');
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    try {
      const content = await getBlob(cfg, owner, repo, f.sha ?? '', options.signal);
      await FileSystem.writeAsStringAsync(filePath, content);
      written += 1;
    } catch {
      skipped += 1;
    }
  }
  options.onProgress?.({ total: files.length, done: written, current: '' });
  return { written, skipped };
}
