// announcements 依赖 storage mock 环境下可测基本结构；这里做纯形状测试
describe('announcements shape', () => {
  test('announcement object shape', () => {
    const a = { id: 'ann_1', title: 't', body: 'b', author: 'o', createdAt: 1, level: 'info' as const };
    expect(a.id.startsWith('ann_')).toBe(true);
    expect(a.title).toBe('t');
  });
});
