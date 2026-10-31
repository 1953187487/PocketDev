import { isNewerVersion, buildDownloadUrl } from '@/api/updates';

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
    expect(buildDownloadUrl('v1.0.4')).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/v1.0.4/pocketdev-v1.0.4.apk',
    );
    expect(buildDownloadUrl('1.0.4')).toBe(
      'https://github.com/1953187487/PocketDev/releases/download/1.0.4/pocketdev-v1.0.4.apk',
    );
  });
});
