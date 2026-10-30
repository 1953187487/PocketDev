import { APP_REPO, APP_VERSION } from '@/config';

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
  const tagMatch = html.match(/\/releases\/tag\/([^"'\s<>]+)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  const nameMatch = html.match(/<title>([^<]+)<\/title>/);
  const name = nameMatch ? nameMatch[1].trim() : tag;
  const dateMatch = html.match(/datetime="([^"]+)"/);
  const publishedAt = dateMatch ? dateMatch[1] : '';
  const assetMatch = html.match(/\/releases\/download\/[^"'\s<>]+?\.apk/);
  return {
    tag,
    name,
    published_at: publishedAt,
    url: `https://github.com/${APP_REPO}/releases/tag/${tag}`,
    notes: '',
    download_url: assetMatch ? `https://github.com${assetMatch[0]}` : buildDownloadUrl(tag),
  };
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
  return `https://github.com/${APP_REPO}/releases/download/${tag}/pocketdev-v${v}.apk`;
}

export function normalizeBaseUrl(url: string): string {
  return trimBase(url);
}
