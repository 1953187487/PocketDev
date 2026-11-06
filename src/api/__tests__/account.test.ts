import { validEmail, OFFICIAL_EMAIL } from '../account';

describe('account (cloud compat)', () => {
  test('validEmail', () => {
    expect(validEmail('a@b.com')).toBe(true);
    expect(validEmail('2865529057@qq.com')).toBe(true);
    expect(validEmail(OFFICIAL_EMAIL)).toBe(true);
    expect(validEmail('bad')).toBe(false);
  });
});
