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
