import { normalizePath, joinPath, isInside, safeResolve } from '@/api/localfs';

describe('normalizePath', () => {
  it('collapses slashes and strips trailing slash', () => {
    expect(normalizePath('/storage/emulated/0//Download//')).toBe('/storage/emulated/0/Download');
    expect(normalizePath('  /a/b  ')).toBe('/a/b');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('joinPath', () => {
  it('joins parts with single separators', () => {
    expect(joinPath('/base', 'a', 'b.txt')).toBe('/base/a/b.txt');
    expect(joinPath('/base/', '/a/')).toBe('/base/a');
    expect(joinPath('/', 'root.txt')).toBe('/root.txt');
    expect(joinPath('/base', '', 'c')).toBe('/base/c');
  });
});

describe('isInside', () => {
  it('detects containment', () => {
    expect(isInside('/base', '/base/child')).toBe(true);
    expect(isInside('/base', '/base')).toBe(true);
    expect(isInside('/base', '/baseother/x')).toBe(false);
    expect(isInside('/base', '/other')).toBe(false);
  });
});

describe('safeResolve', () => {
  it('resolves relative segments inside base', () => {
    expect(safeResolve('/ws', 'src/app.tsx')).toBe('/ws/src/app.tsx');
    expect(safeResolve('/ws', './src/../src/app.tsx')).toBe('/ws/src/app.tsx');
  });

  it('rejects traversal escaping the base', () => {
    expect(safeResolve('/ws', '../etc/passwd')).toBeNull();
    expect(safeResolve('/ws', 'src/../../secret')).toBeNull();
  });
});
