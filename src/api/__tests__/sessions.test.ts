import { truncateTitle, snippetAround, searchSessions, saveSession, listSessions } from '@/api/sessions';
import type { Session } from '@/api/sessions';

const store: Record<string, unknown> = {};
jest.mock('@/storage', () => ({
  getObject: jest.fn(async (k: string) => store[k] ?? null),
  setObject: jest.fn(async (k: string, v: unknown) => {
    store[k] = v;
  }),
  removeKey: jest.fn(async (k: string) => {
    delete store[k];
  }),
}));

describe('truncateTitle', () => {
  it('keeps short titles untouched', () => {
    expect(truncateTitle('写个函数')).toBe('写个函数');
  });

  it('truncates long titles and collapses whitespace', () => {
    const long = '  帮我   分析这个仓库并且输出一份完整的技术方案和实施计划与后续步骤安排  ';
    const out = truncateTitle(long);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toBe('帮我 分析这个仓库并且输出一份完整的技术方案和实…');
  });

  it('falls back for empty text', () => {
    expect(truncateTitle('')).toBe('新会话');
    expect(truncateTitle('   ')).toBe('新会话');
  });
});

describe('snippetAround', () => {
  it('extracts context around the match', () => {
    const text = '这是一个很长的句子，中间提到了函数，后面还有内容需要显示。';
    const idx = text.indexOf('函数');
    const snip = snippetAround(text, idx, 2);
    expect(snip).toContain('函数');
    expect(snip.length).toBeLessThanOrEqual(text.length + 2);
  });

  it('adds ellipsis markers when truncated', () => {
    const text = 'a'.repeat(100) + 'target' + 'b'.repeat(100);
    const idx = text.indexOf('target');
    const snip = snippetAround(text, idx, 6);
    expect(snip.startsWith('…')).toBe(true);
    expect(snip.endsWith('…')).toBe(true);
  });
});

describe('session storage', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('saves and lists sessions newest first', async () => {
    const base: Session = {
      id: 's1',
      title: '',
      messages: [],
      createdAt: 100,
      updatedAt: 100,
    };
    await saveSession({ ...base, id: 'a', messages: [{ id: 'm1', role: 'user', text: '帮我写个解析器', createdAt: 1 }] });
    await new Promise((r) => setTimeout(r, 5));
    await saveSession({ ...base, id: 'b', messages: [{ id: 'm2', role: 'user', text: 'analyze repo', createdAt: 2 }] });

    const list = await listSessions();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('b');
    expect(list[1].id).toBe('a');
    expect(list[0].title).toBe('analyze repo');
    expect(list[1].title).toBe('帮我写个解析器');
  });

  it('searches messages and titles case-insensitively', async () => {
    await saveSession({
      id: 's1',
      title: '仓库分析',
      messages: [
        { id: 'm1', role: 'user', text: '请分析这个 REPO 的结构', createdAt: 1 },
        { id: 'm2', role: 'assistant', text: '这里是结论', createdAt: 2 },
      ],
      createdAt: 1,
      updatedAt: 1,
    });
    await saveSession({
      id: 's2',
      title: '无关',
      messages: [{ id: 'm3', role: 'user', text: '写个单元测试', createdAt: 1 }],
      createdAt: 1,
      updatedAt: 1,
    });

    const hits = await searchSessions('repo');
    expect(hits).toHaveLength(1);
    expect(hits[0].session.id).toBe('s1');
    expect(hits[0].snippet).toContain('REPO');

    const titleHits = await searchSessions('仓库');
    expect(titleHits).toHaveLength(1);
    expect(titleHits[0].session.id).toBe('s1');

    expect(await searchSessions('  ')).toHaveLength(0);
    expect(await searchSessions('nothing-matches')).toHaveLength(0);
  });

  it('caps stored sessions at 50', async () => {
    for (let i = 0; i < 55; i++) {
      await saveSession({ id: `s${i}`, title: `t${i}`, messages: [], createdAt: i, updatedAt: i });
    }
    const list = await listSessions();
    expect(list.length).toBeLessThanOrEqual(50);
  });
});
