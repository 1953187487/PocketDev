import { getObject, removeKey, setObject } from '@/storage';

/** 单条对话消息。与主页 UI 的 Bubble 对应。 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 是否正在流式输出（不持久化的瞬态字段，加载时忽略）。 */
  streaming?: boolean;
  /** 错误消息（如未配置服务商）。 */
  error?: boolean;
  /** 计划模式产出。 */
  plan?: boolean;
  createdAt: number;
}

/** 一次会话：一段连续对话，可按工作区关联。 */
export interface Session {
  id: string;
  title: string;
  workspaceId?: string;
  workspaceName?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = 'sessions_v1';
const MAX_SESSIONS = 50;
const MAX_MSG_LEN = 60000;

export function truncateTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 24 ? clean.slice(0, 24) + '…' : clean || '新会话';
}

function sanitizeMessage(m: ChatMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    text: (m.text ?? '').slice(0, MAX_MSG_LEN),
    error: !!m.error,
    plan: !!m.plan,
    createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
  };
}

/** 列出全部会话（按最近更新倒序，不加载消息正文以减小体积）。 */
export async function listSessions(): Promise<Session[]> {
  const all = (await getObject<Session[]>(SESSIONS_KEY)) ?? [];
  return all
    .map((s) => ({
      ...s,
      title: s.title || '新会话',
      messages: [] as ChatMessage[],
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 按 id 获取单个会话（含消息正文）。 */
export async function getSession(id: string): Promise<Session | null> {
  const all = (await getObject<Session[]>(SESSIONS_KEY)) ?? [];
  const s = all.find((x) => x.id === id);
  return s ? { ...s, messages: (s.messages ?? []).map(sanitizeMessage) } : null;
}

/** 保存（新建或覆盖）会话，维持总数上限。返回保存后的会话。 */
export async function saveSession(session: Session): Promise<Session> {
  const all = (await getObject<Session[]>(SESSIONS_KEY)) ?? [];
  const existing = all.find((x) => x.id === session.id);
  const saved: Session = {
    ...session,
    title: existing?.title && existing.title !== '新会话' ? existing.title : truncateTitle(session.title || firstText(session.messages) || '新会话'),
    messages: (session.messages ?? []).map(sanitizeMessage),
    createdAt: existing?.createdAt ?? session.createdAt,
    updatedAt: Date.now(),
  };
  const rest = all.filter((x) => x.id !== session.id);
  const next = [saved, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
  await setObject(SESSIONS_KEY, next);
  return saved;
}

function firstText(msgs: ChatMessage[]): string {
  const u = msgs.find((m) => m.role === 'user');
  return u?.text ?? '';
}

/** 删除会话。 */
export async function deleteSession(id: string): Promise<void> {
  const all = (await getObject<Session[]>(SESSIONS_KEY)) ?? [];
  await setObject(SESSIONS_KEY, all.filter((x) => x.id !== id));
}

/** 清空全部会话。 */
export async function clearSessions(): Promise<void> {
  await removeKey(SESSIONS_KEY);
}

export interface SearchHit {
  session: Session;
  snippet: string;
}

/** 在会话标题与消息正文中搜索关键词（不区分大小写）。 */
export async function searchSessions(query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = (await getObject<Session[]>(SESSIONS_KEY)) ?? [];
  const hits: SearchHit[] = [];
  for (const s of all) {
    const titleMatch = s.title.toLowerCase().includes(q);
    const msgs = (s.messages ?? []).map(sanitizeMessage);
    const msg = msgs.find((m) => m.text.toLowerCase().includes(q));
    if (titleMatch || msg) {
      const idx = msg ? msg.text.toLowerCase().indexOf(q) : -1;
      const snippet = msg && idx >= 0 ? snippetAround(msg.text, idx, q.length) : '';
      hits.push({ session: { ...s, title: s.title || '新会话', messages: [] }, snippet });
    }
  }
  return hits.sort((a, b) => b.session.updatedAt - a.session.updatedAt);
}

export function snippetAround(text: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 24);
  const end = Math.min(text.length, idx + len + 32);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '');
}
