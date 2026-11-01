import { shouldSkip, decodeBase64 } from '@/api/gitClone';

describe('shouldSkip', () => {
  it('skips dependency and build directories', () => {
    expect(shouldSkip('node_modules/react/index.js')).toBe(true);
    expect(shouldSkip('.git/config')).toBe(true);
    expect(shouldSkip('app/build/outputs.apk')).toBe(true);
    expect(shouldSkip('dist/bundle.js')).toBe(true);
    expect(shouldSkip('.expo/settings.json')).toBe(true);
  });

  it('skips binary and large media extensions', () => {
    expect(shouldSkip('assets/icon.png')).toBe(true);
    expect(shouldSkip('app.apk')).toBe(true);
    expect(shouldSkip('release.jks')).toBe(true);
    expect(shouldSkip('data.db')).toBe(true);
  });

  it('keeps source and text files', () => {
    expect(shouldSkip('src/index.ts')).toBe(false);
    expect(shouldSkip('package.json')).toBe(false);
    expect(shouldSkip('README.md')).toBe(false);
    expect(shouldSkip('app.json')).toBe(false);
  });
});

describe('decodeBase64', () => {
  it('decodes UTF-8 base64 payloads', () => {
    const enc = (s: string) => {
      // 简单的 UTF-8 字节数组 → base64（与 git blobs 的 base64 对齐）
      const bytes = Array.from(new TextEncoder().encode(s));
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    };
    expect(decodeBase64(enc('hello world'))).toBe('hello world');
    expect(decodeBase64(enc('const a = 1;\nconsole.log(a);'))).toBe('const a = 1;\nconsole.log(a);');
    expect(decodeBase64(enc('中文内容测试'))).toBe('中文内容测试');
  });
});
