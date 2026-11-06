/**
 * 公告系统 v1.0.7（本设备存储；可由官方账号/管理员发布）
 * 支持：发布公告、列表、已读标记；可通过“官方聊天渠道”或设置页发布。
 */
import { getObject, setObject, removeKey } from '@/storage';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string; // 发布者昵称/邮箱
  createdAt: number;
  pinned?: boolean;
  level?: 'info' | 'warn' | 'success';
}

const KEY = 'pd_announcements_v1';
const READ_KEY = 'pd_announcements_read_v1';

function uid() { return 'ann_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

export async function listAnnouncements(): Promise<Announcement[]> {
  const list = (await getObject<Announcement[]>(KEY)) ?? [];
  return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
}

export async function publishAnnouncement(input: { title: string; body: string; author: string; pinned?: boolean; level?: Announcement['level'] }): Promise<Announcement> {
  const list = (await getObject<Announcement[]>(KEY)) ?? [];
  const ann: Announcement = {
    id: uid(),
    title: input.title.trim() || '公告',
    body: input.body.trim(),
    author: input.author || '官方',
    createdAt: Date.now(),
    pinned: !!input.pinned,
    level: input.level || 'info',
  };
  list.unshift(ann);
  // 紧凑保留最近 50 条
  await setObject(KEY, list.slice(0, 50));
  return ann;
}

export async function removeAnnouncement(id: string): Promise<void> {
  const list = (await getObject<Announcement[]>(KEY)) ?? [];
  await setObject(KEY, list.filter((a) => a.id !== id));
}

export async function clearAnnouncements(): Promise<void> { await removeKey(KEY); }

export async function getReadIds(): Promise<string[]> { return (await getObject<string[]>(READ_KEY)) ?? []; }
export async function markRead(id: string): Promise<void> {
  const ids = await getReadIds();
  if (!ids.includes(id)) { ids.push(id); await setObject(READ_KEY, ids.slice(-200)); }
}
export async function unreadCount(): Promise<number> {
  const [list, read] = await Promise.all([listAnnouncements(), getReadIds()]);
  return list.filter((a) => !read.includes(a.id)).length;
}
