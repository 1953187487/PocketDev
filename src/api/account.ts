/**
 * 账号系统 v1.0.7（本设备存储，紧凑 JSON）
 * 流程：注册 = 输入邮箱 → 发验证码 → 验证后设置密码；登录 = 邮箱+密码。
 * 规则：同邮箱不可重复注册；同账号不可重复在线登录（单会话 token）。
 * 内置官方账号：official@pocketdev.local（不可重复注册占用）。
 */
import { getObject, removeKey, setObject } from '@/storage';

export interface AccountUser {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string; // 轻量哈希
  createdAt: number;
  lastLoginAt: number;
  isOfficial?: boolean;
}

export interface AccountSession {
  userId: string;
  email: string;
  nickname: string;
  token: string;
  loginAt: number;
  isOfficial?: boolean;
}

export interface MailConfig {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  user: string;
  pass: string; // 授权码，本地保存
  fromName: string;
  serverUrl: string;
  autoSend: boolean;
}

export const OFFICIAL_EMAIL = 'official@pocketdev.local';
export const OFFICIAL_NICK = 'PocketDev 官方';
export const OFFICIAL_PASSWORD = 'pocketdev.official.2026'; // 内置官方账号默认密码（本地）
export const MAIL_SERVER_URL = 'http://127.0.0.1:17887';

export const DEFAULT_MAIL: MailConfig = {
  smtpHost: 'smtp.qq.com',
  smtpPort: 465,
  secure: true,
  user: '2865529057@qq.com',
  pass: '', // 授权码不入库，由用户在设置/本地配置中填写
  fromName: 'PocketDev',
  serverUrl: MAIL_SERVER_URL,
  autoSend: true,
};

const USERS_KEY = 'acc_v2_users';
const SESSION_KEY = 'acc_v2_session';
const MAIL_KEY = 'acc_v2_mail';
const CODES_KEY = 'acc_v2_codes';
const ACTIVE_KEY = 'acc_v2_active'; // email -> token，防重复登录

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function token() { return uid() + uid() + Math.random().toString(36).slice(2); }

export function hashPassword(email: string, password: string): string {
  const s = `pd2:${email.trim().toLowerCase()}:${password}:v107`;
  let h1 = 0x811c9dc5 >>> 0, h2 = 0x9e3779b1 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (h2 + Math.imul(c, i + 1) + (h1 ^ i)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function validEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (e === OFFICIAL_EMAIL) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

async function loadUsers(): Promise<AccountUser[]> { return (await getObject<AccountUser[]>(USERS_KEY)) ?? []; }
async function saveUsers(users: AccountUser[]): Promise<void> { await setObject(USERS_KEY, users); }

export async function ensureOfficialAccount(): Promise<void> {
  const users = await loadUsers();
  if (users.some((u) => u.email === OFFICIAL_EMAIL)) return;
  users.unshift({
    id: 'official-builtin',
    email: OFFICIAL_EMAIL,
    nickname: OFFICIAL_NICK,
    passwordHash: hashPassword(OFFICIAL_EMAIL, OFFICIAL_PASSWORD),
    createdAt: Date.now(),
    lastLoginAt: 0,
    isOfficial: true,
  });
  await saveUsers(users);
}

export async function getAccountSession(): Promise<AccountSession | null> { return getObject<AccountSession>(SESSION_KEY); }
export async function setAccountSession(s: AccountSession | null): Promise<void> {
  if (!s) await removeKey(SESSION_KEY); else await setObject(SESSION_KEY, s);
}

export async function getMailConfig(): Promise<MailConfig> {
  const m = await getObject<Partial<MailConfig>>(MAIL_KEY);
  return { ...DEFAULT_MAIL, ...(m ?? {}) };
}
export async function setMailConfig(m: MailConfig): Promise<void> { await setObject(MAIL_KEY, m); }

type CodeRec = { email: string; code: string; purpose: 'register' | 'reset'; exp: number };
async function loadCodes(): Promise<CodeRec[]> {
  const list = (await getObject<CodeRec[]>(CODES_KEY)) ?? [];
  return list.filter((c) => c.exp > Date.now());
}
async function saveCodes(list: CodeRec[]): Promise<void> { await setObject(CODES_KEY, list); }

export function genCode(): string { return String(Math.floor(100000 + Math.random() * 900000)); }

async function activeMap(): Promise<Record<string, string>> { return (await getObject<Record<string, string>>(ACTIVE_KEY)) ?? {}; }
async function setActiveMap(m: Record<string, string>): Promise<void> { await setObject(ACTIVE_KEY, m); }

export type AuthResult = { ok: true; session: AccountSession } | { ok: false; error: string };

/** 1) 注册-发码：向邮箱发送验证码（不创建账号） */
export async function sendRegisterCode(email: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  await ensureOfficialAccount();
  const e = email.trim().toLowerCase();
  if (!validEmail(e) || e === OFFICIAL_EMAIL) return { ok: false, error: '请输入有效的个人邮箱' };
  const users = await loadUsers();
  if (users.some((u) => u.email === e)) return { ok: false, error: '该邮箱已注册，请直接登录' };
  const code = genCode();
  const list = await loadCodes();
  const next = list.filter((c) => !(c.email === e && c.purpose === 'register'));
  next.push({ email: e, code, purpose: 'register', exp: Date.now() + 10 * 60 * 1000 });
  await saveCodes(next);
  const cfg = await getMailConfig();
  if (!cfg.pass || !cfg.serverUrl) return { ok: true, devCode: code }; // 未配授权码时仅本地返回（开发/离线）
  try {
    const res = await fetch(cfg.serverUrl.replace(/\/+$/, '') + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: e,
        subject: 'PocketDev 注册验证码',
        text: `您的验证码是：${code}（10 分钟内有效）。验证后请设置登录密码。`,
        smtp: { host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.secure, user: cfg.user, pass: cfg.pass },
        fromName: cfg.fromName,
      }),
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: `发送失败(${res.status}) ${t}`.slice(0, 120) }; }
    return { ok: true };
  } catch (err) { return { ok: false, error: `邮件服务不可用：${(err as Error).message}` }; }
}

/** 2) 注册-验证：仅校验验证码是否正确（不消费也可消费，这里消费一次性） */
export async function checkRegisterCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const e = email.trim().toLowerCase();
  const list = await loadCodes();
  const rec = list.find((c) => c.email === e && c.purpose === 'register' && c.code === code.trim());
  if (!rec) return { ok: false, error: '验证码错误或已过期' };
  return { ok: true };
}

/** 3) 注册-设密完成：验证码正确则创建账号并登录（禁止重复注册/重复登录） */
export async function completeRegister(email: string, code: string, password: string, nickname: string): Promise<AuthResult> {
  await ensureOfficialAccount();
  const e = email.trim().toLowerCase();
  if (!validEmail(e) || e === OFFICIAL_EMAIL) return { ok: false, error: '邮箱无效' };
  if (password.length < 6) return { ok: false, error: '密码至少 6 位' };
  const codes = await loadCodes();
  const rec = codes.find((c) => c.email === e && c.purpose === 'register' && c.code === code.trim());
  if (!rec) return { ok: false, error: '验证码错误或已过期' };
  const users = await loadUsers();
  if (users.some((u) => u.email === e)) return { ok: false, error: '该邮箱已注册' };
  const active = await activeMap();
  if (active[e]) return { ok: false, error: '该账号已在其他会话登录，不能重复登录' };
  await saveCodes(codes.filter((c) => !(c.email === e && c.purpose === 'register' && c.code === code.trim())));
  const user: AccountUser = { id: uid(), email: e, nickname: nickname.trim() || e.split('@')[0], passwordHash: hashPassword(e, password), createdAt: Date.now(), lastLoginAt: Date.now() };
  users.push(user);
  await saveUsers(users);
  const session: AccountSession = { userId: user.id, email: user.email, nickname: user.nickname, token: token(), loginAt: Date.now() };
  active[e] = session.token; await setActiveMap(active);
  await setAccountSession(session);
  return { ok: true, session };
}

/** 登录：邮箱+密码；若该账号已有活跃会话则拒绝重复登录 */
export async function login(email: string, password: string, opts?: { force?: boolean }): Promise<AuthResult> {
  await ensureOfficialAccount();
  const e = email.trim().toLowerCase();
  const users = await loadUsers();
  const user = users.find((u) => u.email === e);
  if (!user || user.passwordHash !== hashPassword(e, password)) return { ok: false, error: '邮箱或密码错误' };
  const active = await activeMap();
  if (active[e] && !opts?.force) return { ok: false, error: '该账号已登录，不能重复登录（请先退出其他会话）' };
  user.lastLoginAt = Date.now(); await saveUsers(users);
  const session: AccountSession = { userId: user.id, email: user.email, nickname: user.nickname, token: token(), loginAt: Date.now(), isOfficial: user.isOfficial };
  active[e] = session.token; await setActiveMap(active);
  await setAccountSession(session);
  return { ok: true, session };
}

export async function logout(): Promise<void> {
  const s = await getAccountSession();
  if (s) { const active = await activeMap(); delete active[s.email]; await setActiveMap(active); }
  await setAccountSession(null);
}

export async function accountSnapshot(): Promise<{ session: AccountSession | null; users: number }> {
  await ensureOfficialAccount();
  const [session, users] = await Promise.all([getAccountSession(), loadUsers()]);
  return { session, users: users.length };
}

export function mailTestHint(): string {
  return 'QQ邮箱SMTP需在设置中填写授权码（非登录密码），并在本设备启动 mail-server/server.js 作为发送服务。';
}
