import { APP_REPO, APP_VERSION } from '@/config';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface ReleaseInfo {
  tag: string;
  name: string;
  published_at: string;
  url: string;
  notes: string;
  download_url: string | null;
}

function trimBase(url: string) {
  return url.trim().replace(/\/+$/, '');
}

/** 查 GitHub Releases 的最新版本（不经 API 限流，抓 releases 页解析）。 */
export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const url = `https://github.com/${APP_REPO}/releases/latest`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PocketDev' } });
  if (!res.ok) return null;

  const html = await res.text();
  const tagMatch = html.match(/\/releases\/tag\/(v?[0-9][^"'\s<>]+)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  const nameMatch = html.match(/<title>([^<]+)<\/title>/);
  const name = nameMatch ? nameMatch[1].trim() : tag;
  const dateMatch = html.match(/datetime="([^"]+)"/);
  const publishedAt = dateMatch ? dateMatch[1] : '';
  const assetMatch = html.match(/\/releases\/download\/[^"'\s<>]*?\.apk(?=["'\s<>]|$)/);
  const notes = extractReleaseNotes(html);
  return {
    tag,
    name,
    published_at: publishedAt,
    url: `https://github.com/${APP_REPO}/releases/tag/${tag}`,
    notes,
    download_url: assetMatch ? `https://github.com/${APP_REPO}${assetMatch[0]}` : buildDownloadUrl(tag),
  };
}

/** 从 releases 页 HTML 中提取更新公告正文（markdown-body 区块）。 */
function extractReleaseNotes(html: string): string {
  const block = html.match(/<div[^>]*class="markdown-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!block) return '';
  const text = block[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/ /g, ' ');
  return text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n').trim();
}

export function isNewerVersion(latest: string, current = APP_VERSION): boolean {
  const l = latest.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const c = current.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const a = l[i] ?? 0;
    const b = c[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<{ hasUpdate: boolean; release: ReleaseInfo | null }> {
  try {
    const release = await fetchLatestRelease();
    if (!release) return { hasUpdate: false, release: null };
    return { hasUpdate: isNewerVersion(release.tag), release };
  } catch {
    return { hasUpdate: false, release: null };
  }
}

export function buildDownloadUrl(tag: string): string {
  const v = tag.replace(/^v/, '');
  return `https://github.com/${APP_REPO}/releases/download/${tag}/pocketdev-${v}.apk`;
}

export function normalizeBaseUrl(url: string): string {
  return trimBase(url);
}

export interface DownloadState {
  phase: 'idle' | 'downloading' | 'install' | 'done' | 'error';
  percent: number;
  uri: string | null;
  message?: string;
}

/** 下载 APK 到缓存目录，进度通过 onProgress 回调。 */
export async function downloadApk(
  url: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const fileName = url.split('/').pop() ?? `pocketdev-${Date.now()}.apk`;
  const dir = FileSystem.cacheDirectory + 'pocketdev-updates/';
  if (!(await FileSystem.getInfoAsync(dir)).exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const dest = `${dir}${fileName}`;
  const resumable = FileSystem.createDownloadResumable(
    url,
    dest,
    { headers: { 'User-Agent': 'PocketDev' } },
    (data) => {
      if (data.totalBytesExpectedToWrite > 0) {
        onProgress(Math.round((data.totalBytesWritten / data.totalBytesExpectedToWrite) * 100));
      }
    },
  );
  const result = await resumable.downloadAsync();
  if (!result || result.status !== 200) throw new Error(`下载失败（HTTP ${result?.status ?? 'null'}）`);
  return result.uri;
}

/** 打开系统安装器安装已下载的 APK。 */
export async function installApk(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.android.package-archive',
      dialogTitle: '安装 PocketDev 更新',
    });
  } else {
    throw new Error('当前设备不支持打开安装包');
  }
}
