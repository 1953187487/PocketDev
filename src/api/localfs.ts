import * as FileSystem from 'expo-file-system/legacy';

const SAF = FileSystem.StorageAccessFramework;

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

/* ---------- SAF (Storage Access Framework) ----------
 * Android 11+ 分区存储下，公共目录（/storage/emulated/0/...）无法用普通 File API
 * 读取，必须通过系统目录选择器（SAF）授权后，以 content:// URI 访问。
 * 本文件所有目录/文件操作都按「普通路径 / SAF URI」分支执行。
 */

/** 判断是否为 SAF URI（content:// 形式）。 */
export function isSafUri(p: string): boolean {
  return p.startsWith('content://');
}

/** 从 SAF URI 提取目录/文件显示名（如 content://.../tree/primary%3ADownload → Download）。 */
export function safName(uri: string): string {
  try {
    const m = uri.match(/tree\/([^/]+)$/);
    if (m) {
      const decoded = decodeURIComponent(m[1]).replace(/^[^:]+:/, '');
      const segs = decoded.split('/').filter(Boolean);
      return segs.length ? segs[segs.length - 1] : uri;
    }
    const segs = decodeURIComponent(uri).split('/').filter(Boolean);
    return segs.length ? segs[segs.length - 1] : uri;
  } catch {
    const parts = uri.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : uri;
  }
}

/** 打开系统目录选择器（SAF），让用户授权任意目录。成功返回授权目录 URI，否则 null。 */
export async function requestDirectoryPermission(): Promise<string | null> {
  try {
    const res = await SAF.requestDirectoryPermissionsAsync();
    if (res.granted && res.directoryUri) return res.directoryUri;
    return null;
  } catch {
    return null;
  }
}

/** 将父目录 + 条目名解析为可直接传给文件 API 的路径。SAF 条目本身已是完整 URI。 */
export function resolveEntry(dir: string, name: string): string {
  if (isSafUri(dir)) return name;
  return `${dir.replace(/\/+$/, '')}/${name}`;
}

/** SAF 下试探判断 URI 是目录/文件/是否存在（SAF 无 getInfoAsync）。 */
async function safStat(uri: string): Promise<{ exists: boolean; isDirectory: boolean }> {
  try {
    await SAF.readDirectoryAsync(uri);
    return { exists: true, isDirectory: true };
  } catch {
    /* not a directory */
  }
  try {
    await SAF.readAsStringAsync(uri);
    return { exists: true, isDirectory: false };
  } catch {
    /* not a readable file */
  }
  return { exists: false, isDirectory: false };
}

/** 校验目录是否可读，并返回条目数量。 */
export async function inspectDir(path: string): Promise<LocalDirInfo> {
  const clean = path.trim().replace(/\/+$/, '');
  const saf = isSafUri(clean);
  const name = saf ? safName(clean) : dirName(clean);
  try {
    if (saf) {
      const st = await safStat(clean);
      if (!st.exists || !st.isDirectory) {
        return { path: clean, name, readable: false, exists: st.exists, entries: 0 };
      }
      const entries = await SAF.readDirectoryAsync(clean);
      return { path: clean, name, readable: true, exists: true, entries: entries.length };
    }
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

/** 列出目录下的文件（最多 limit 项）。返回条目名（普通路径）或完整 URI（SAF）。 */
export async function listDir(path: string, limit = 200): Promise<string[]> {
  try {
    if (isSafUri(path)) {
      const entries = await SAF.readDirectoryAsync(path);
      return entries.slice(0, limit);
    }
    const entries = await FileSystem.readDirectoryAsync(path.replace(/\/+$/, ''));
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}

/** 读取文本文件（限制大小）。 */
export async function readTextFile(path: string, maxBytes = 200000): Promise<string | null> {
  try {
    if (isSafUri(path)) {
      const st = await safStat(path);
      if (!st.exists || st.isDirectory) return null;
      return await SAF.readAsStringAsync(path);
    }
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
    if (isSafUri(path)) {
      await SAF.writeAsStringAsync(path, content);
      return true;
    }
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

/** 在目录中新建空文本文件。SAF 用 createFileAsync。返回是否成功。 */
export async function createTextFile(dir: string, name: string): Promise<boolean> {
  try {
    if (isSafUri(dir)) {
      await SAF.createFileAsync(dir, name, 'text/plain');
      return true;
    }
    return await writeTextFile(`${dir.replace(/\/+$/, '')}/${name}`, '');
  } catch {
    return false;
  }
}

/* ---------- 路径安全 ---------- */

/** 规范化路径：去除尾斜杠、折叠连续的斜杠。SAF URI 原样返回。 */
export function normalizePath(p: string): string {
  if (isSafUri(p)) return p;
  const clean = p.trim().replace(/\/+/g, '/').replace(/\/+$/, '');
  return clean || '/';
}

/** 拼接路径（自动处理分隔符）。SAF URI 直接返回（SAF 下使用完整条目 URI）。 */
export function joinPath(base: string, ...parts: string[]): string {
  if (isSafUri(base)) return base;
  let out = normalizePath(base);
  for (const part of parts) {
    if (!part) continue;
    out = out === '/' ? `/${part.replace(/^\/+|\/+$/g, '')}` : `${out}/${part.replace(/^\/+|\/+$/g, '')}`;
  }
  return out;
}

/** 判断 child 是否位于 base 目录之内（或相等）。纯字符串比较，不做文件系统访问。 */
export function isInside(base: string, child: string): boolean {
  if (isSafUri(base) || isSafUri(child)) return false;
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
    if (isSafUri(path)) {
      const st = await safStat(path);
      return { exists: st.exists, isDirectory: st.isDirectory, size: 0, modifiedAt: null };
    }
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
    if (isSafUri(path)) {
      // 该重载用于普通路径；SAF 请使用 createDirectory(dir, name)
      return false;
    }
    const info = await FileSystem.getInfoAsync(normalizePath(path));
    if (info.exists && info.isDirectory) return true;
    if (info.exists) return false;
    await FileSystem.makeDirectoryAsync(normalizePath(path), { intermediates });
    return true;
  } catch {
    return false;
  }
}

/** 在父目录中创建子目录。SAF 用 makeDirectoryAsync(parentUri, name)。返回是否成功。 */
export async function createDirectory(dir: string, name: string): Promise<boolean> {
  try {
    if (isSafUri(dir)) {
      await SAF.makeDirectoryAsync(dir, name);
      return true;
    }
    return await makeDir(`${dir.replace(/\/+$/, '')}/${name}`);
  } catch {
    return false;
  }
}

/** 重命名/移动文件或目录。返回是否成功。 */
export async function renamePath(from: string, to: string): Promise<boolean> {
  try {
    if (isSafUri(from)) {
      // SAF 下目标 URI 由父目录 + 新名构造；moveAsync 失败时回退 copy+delete
      try {
        await SAF.moveAsync({ from, to });
        return true;
      } catch {
        await SAF.copyAsync({ from, to });
        await SAF.deleteAsync(from, { idempotent: true });
        return true;
      }
    }
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
    if (isSafUri(path)) {
      await SAF.deleteAsync(path, { idempotent: true });
      return true;
    }
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
    if (isSafUri(from)) {
      await SAF.copyAsync({ from, to });
      return true;
    }
    const s = await stat(from);
    if (!s.exists) return false;
    await FileSystem.copyAsync({ from: normalizePath(from), to: normalizePath(to) });
    return true;
  } catch {
    return false;
  }
}
