import { isValidPackageName } from '@/api/scaffold';

describe('isValidPackageName', () => {
  it('accepts valid Android package names', () => {
    expect(isValidPackageName('com.example.app')).toBe(true);
    expect(isValidPackageName('com.pocketdev')).toBe(true);
    expect(isValidPackageName('io.github.user.project_v2')).toBe(true);
  });

  it('rejects invalid package names', () => {
    expect(isValidPackageName('')).toBe(false);
    expect(isValidPackageName('app')).toBe(false);
    expect(isValidPackageName('com.example.')).toBe(false);
    expect(isValidPackageName('com..app')).toBe(false);
    expect(isValidPackageName('Com.example')).toBe(false);
    expect(isValidPackageName('com.123app')).toBe(false);
    expect(isValidPackageName('com.example-app')).toBe(false);
  });
});
