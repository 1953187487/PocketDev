import { buildArgs, makeAppletId, SAMPLE_APPLETS, type AppletParam } from '@/api/applets';

jest.mock('@/storage', () => ({
  getObject: jest.fn(async () => null),
  setObject: jest.fn(async () => {}),
}));
jest.mock('@/api/ai', () => ({ streamChat: jest.fn() }));

describe('buildArgs', () => {
  const params: AppletParam[] = [
    { key: 'text', label: '文本', type: 'text' },
    { key: 'count', label: '数量', type: 'number', default: '3' },
    { key: 'enabled', label: '开关', type: 'boolean', default: 'false' },
  ];

  it('fills defaults and coerces types', () => {
    const out = buildArgs(params, {});
    expect(out).toEqual({ text: '', count: 3, enabled: false });
  });

  it('parses raw values by type', () => {
    const out = buildArgs(params, { text: '  hello  ', count: '42', enabled: 'true' });
    expect(out).toEqual({ text: 'hello', count: 42, enabled: true });
  });

  it('coerces boolean truthy values', () => {
    expect(buildArgs(params, { enabled: '1' }).enabled).toBe(true);
    expect(buildArgs(params, { enabled: 'true' }).enabled).toBe(true);
    expect(buildArgs(params, { enabled: '0' }).enabled).toBe(false);
  });
});

describe('makeAppletId', () => {
  it('produces unique ids with the ap- prefix', () => {
    const a = makeAppletId();
    const b = makeAppletId();
    expect(a).toMatch(/^ap-/);
    expect(b).toMatch(/^ap-/);
    expect(a).not.toBe(b);
  });
});

describe('SAMPLE_APPLETS', () => {
  it('ships at least the echo and time applets', () => {
    const ids = SAMPLE_APPLETS.map((a) => a.id);
    expect(ids).toContain('sample-echo');
    expect(ids).toContain('sample-time');
  });
});
