import { isNewerVersion, buildDownloadUrl, fetchLatestRelease } from '@/api/updates';

describe('isNewerVersion', () => {
  it('detects a newer release', () => {
    expect(isNewerVersion('1.0.4', '1.0.3')).toBe(true);
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
  });

  it('returns false for the same or an older release', () => {
    expect(isNewerVersion('1.0.3', '1.0.3')).toBe(false);
    expect(isNewerVersion('1.0.2', '1.0.3')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.3')).toBe(false);
  });

  it('handles a v prefix and short version strings', () => {
    expect(isNewerVersion('v1.0.4', '1.0.3')).toBe(true);
    expect(isNewerVersion('1.0', '1.0.3')).toBe(false);
    expect(isNewerVersion('1.0.4', 'v1.0.3')).toBe(true);
  });
});

describe('buildDownloadUrl', () => {
  it('builds the GitHub release APK URL from a tag', () => {
    expect(buildDownloadUrl('v1.0.5')).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/v1.0.5/pocketdev-1.0.5.apk',
    );
    expect(buildDownloadUrl('1.0.5')).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/1.0.5/pocketdev-1.0.5.apk',
    );
  });
});

describe('fetchLatestRelease', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockHtml(html: string) {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => html,
    } as unknown as Response);
  }

  it('parses tag and APK asset link from the release page', async () => {
    mockHtml(
      `<html><title>PocketDev v1.0.5</title>
       <a href="/1953187487/PocketDev/releases/tag/v1.0.5">v1.0.5</a>
       <a href="/1953187487/PocketDev/releases/download/v1.0.5/pocketdev-1.0.5.apk">APK</a>
       <a href="/1953187487/PocketDev/releases/download/v1.0.5/pocketdev-1.0.5.apk.sha256">SHA</a>
       <div class="markdown-body"><p>修复流式输出</p></div>
       </html>`,
    );

    const release = await fetchLatestRelease();
    expect(release?.tag).toBe('v1.0.5');
    expect(release?.download_url).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/v1.0.5/pocketdev-1.0.5.apk',
    );
    expect(release?.notes).toContain('修复流式输出');
  });

  it('falls back to buildDownloadUrl when the page has no APK link', async () => {
    mockHtml(
      '<html><title>PocketDev v1.0.5</title><a href="/1953187487/PocketDev/releases/tag/v1.0.5">v1.0.5</a></html>',
    );

    const release = await fetchLatestRelease();
    expect(release?.download_url).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/v1.0.5/pocketdev-1.0.5.apk',
    );
  });

  it('returns null when the page cannot be fetched', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as unknown as Response);
    expect(await fetchLatestRelease()).toBeNull();
  });
});
