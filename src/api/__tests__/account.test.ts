import { hashPassword, validEmail, genCode, OFFICIAL_EMAIL } from '../account';

describe('account utils', () => {
  test('validEmail', () => {
    expect(validEmail('a@b.com')).toBe(true);
    expect(validEmail('2865529057@qq.com')).toBe(true);
    expect(validEmail(OFFICIAL_EMAIL)).toBe(true);
    expect(validEmail('bad')).toBe(false);
    expect(validEmail('a@')).toBe(false);
  });
  test('hashPassword stable and email-normalized', () => {
    const h1 = hashPassword('User@QQ.com', 'abc123');
    const h2 = hashPassword('user@qq.com', 'abc123');
    const h3 = hashPassword('user@qq.com', 'abc124');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]+$/);
  });
  test('genCode 6 digits', () => {
    for (let i = 0; i < 20; i++) expect(genCode()).toMatch(/^\d{6}$/);
  });
});
