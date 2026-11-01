import * as FileSystem from 'expo-file-system/legacy';

export interface LocalDirInfo {
  path: string;
  name: string;
  readable: boolean;
  exists: boolean;
  entries: number;
}

/** 常用本地目录快捷入口。 */
export const COMMON_DIRS: { label: string; path: string }[] = [
  { label: '内部存储根目录', path: '/storage/emulated/0' },
  { label: 'Download', path: '/storage/emulated/0/Download' },
  { label: 'Documents', path: '/storage/emulated/0/Documents' },
  { label: 'Pictures', path: '/storage/emulated/0/Pictures' },
  { label: 'DCIM', path: '/storage/emulated/0/DCIM' },
  { label: '应用私有目录', path: FileSystem.documentDirectory ?? '' },
];

function dirName(path: string): string {
  const clean = path.replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : clean;
}

/** 校验目录是否可读，并返回条目数量。 */
export async function inspectDir(path: string): Promise<LocalDirInfo> {
  const clean = path.trim().replace(/\/+$/, '');
  const name = dirName(clean);
  try {
    const info = await FileSystem.getInfoAsync(clean);
    if (!info.exists) {
      return { path: clean, name, readable: false, exists: false, entries: 0 };
    }
    if (!info.isDirectory) {
      return { path: clean, name, readable: false, exists: true, entries: 0 };
    }
    const entries = await FileSystem.readDirectoryAsync(clean);
    return { path: clean, name, readable: true, exists: true, entries: entries.length };
  } catch {
    return { path: clean, name, readable: false, exists: false, entries: 0 };
  }
}

/** 列出目录下的文件（最多 limit 项）。 */
export async function listDir(path: string, limit = 200): Promise<string[]> {
  try {
    const entries = await FileSystem.readDirectoryAsync(path.replace(/\/+$/, ''));
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}

/** 读取文本文件（限制大小）。 */
export async function readTextFile(path: string, maxBytes = 200000): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || info.isDirectory) return null;
    if (typeof info.size === 'number' && info.size > maxBytes) return null;
    return await FileSystem.readAsStringAsync(path);
  } catch {
    return null;
  }
}

/** 写入文本文件（不存在父目录时自动创建）。返回是否成功。 */
export async function writeTextFile(path: string, content: string): Promise<boolean> {
  try {
    const dir = path.replace(/\/+$/, '').split('/').slice(0, -1).join('/');
    if (dir) {
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists && !info.isDirectory) return false;
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    await FileSystem.writeAsStringAsync(path, content);
    return true;
  } catch {
    return false;
  }
}

/* ---------- 路径安全 ---------- */

/** 规范化路径：去除尾斜杠、折叠连续的斜杠。 */
export function normalizePath(p: string): string {
  const clean = p.trim().replace(/\/+/g, '/').replace(/\/+$/, '');
  return clean || '/';
}

/** 拼接路径（自动处理分隔符）。 */
export function joinPath(base: string, ...parts: string[]): string {
  let out = normalizePath(base);
  for (const part of parts) {
    if (!part) continue;
    out = out === '/' ? `/${part.replace(/^\/+|\/+$/g, '')}` : `${out}/${part.replace(/^\/+|\/+$/g, '')}`;
  }
  return out;
}

/** 判断 child 是否位于 base 目录之内（或相等）。纯字符串比较，不做文件系统访问。 */
export function isInside(base: string, child: string): boolean {
  const b = normalizePath(base);
  const c = normalizePath(child);
  return c === b || c.startsWith(b + '/');
}

/** 拒绝包含 .. 的路径（防目录穿越）。返回规范化后的安全路径，非法时返回 null。 */
export function safeResolve(base: string, child: string): string | null {
  const c = child.replace(/\/+/g, '/');
  const segs = c.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const seg of segs) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (stack.length === 0) return null;
      stack.pop();
      continue;
    }
    stack.push(seg);
  }
  const resolved = joinPath(base, ...stack);
  return isInside(base, resolved) ? resolved : null;
}

/* ---------- 目录与文件操作 ---------- */

export interface FileStat {
  exists: boolean;
  isDirectory: boolean;
  size: number;
  modifiedAt: number | null;
}

/** 获取文件/目录信息。 */
export async function stat(path: string): Promise<FileStat> {
  try {
    const info = await FileSystem.getInfoAsync(normalizePath(path));
    if (!info.exists) return { exists: false, isDirectory: false, size: 0, modifiedAt: null };
    return {
      exists: true,
      isDirectory: !!info.isDirectory,
      size: typeof info.size === 'number' ? info.size : 0,
      modifiedAt: info.modificationTime ? info.modificationTime * 1000 : null,
    };
  } catch {
    return { exists: false, isDirectory: false, size: 0, modifiedAt: null };
  }
}

/** 创建目录（intermediates 时递归创建父目录）。返回是否成功。 */
export async function makeDir(path: string, intermediates = true): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(normalizePath(path));
    if (info.exists && info.isDirectory) return true;
    if (info.exists) return false;
    await FileSystem.makeDirectoryAsync(normalizePath(path), { intermediates });
    return true;
  } catch {
    return false;
  }
}

/** 重命名/移动文件或目录。返回是否成功。 */
export async function renamePath(from: string, to: string): Promise<boolean> {
  try {
    const s = await stat(from);
    if (!s.exists) return false;
    await FileSystem.moveAsync({ from: normalizePath(from), to: normalizePath(to) });
    return true;
  } catch {
    return false;
  }
}

/** 删除文件或目录（目录需非空时递归删除）。返回是否成功。 */
export async function removePath(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    if (!s.exists) return true;
    await FileSystem.deleteAsync(normalizePath(path), { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

/** 复制文件或目录。返回是否成功。 */
export async function copyPath(from: string, to: string): Promise<boolean> {
  try {
    const s = await stat(from);
    if (!s.exists) return false;
    await FileSystem.copyAsync({ from: normalizePath(from), to: normalizePath(to) });
    return true;
  } catch {
    return false;
  }
}
