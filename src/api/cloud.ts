/**
 * 云端 API 客户端 (v1.0.7 cloud mode)
 * 所有账号/存档/公告/渠道走云端；会话 token 仅缓存在本地用于鉴权。
 */
import { getObject, setObject, removeKey } from '@/storage';
import { APP_VERSION } from '@/config';

export interface CloudSession {
  userId: string;
  email: string;
  nickname: string;
  token: string;
  loginAt: number;
  isOfficial?: boolean;
}
export type AuthResult = { ok: true; session: CloudSession } | { ok: false; error: string };

const SESSION_KEY = 'cloud_session_v1';
const BASE_KEY = 'cloud_api_base_v1';
const DEFAULT_BASE = 'http://107.173.180.64:17888'; // 内网穿透云端(默认)

export async function getCloudBase(): Promise<string> {
  const v = await getObject<string>(BASE_KEY);
  const b = (v && typeof v === 'string' ? v : DEFAULT_BASE).trim().replace(/\/+$/, '');
  return b || DEFAULT_BASE;
}
export async function setCloudBase(url: string): Promise<void> { await setObject(BASE_KEY, url.trim().replace(/\/+$/, '')); }
export function defaultCloudBase() { return DEFAULT_BASE; }

export async function getCloudSession(): Promise<CloudSession | null> { return getObject<CloudSession>(SESSION_KEY); }
async function setCloudSession(s: CloudSession | null): Promise<void> { if(!s) await removeKey(SESSION_KEY); else await setObject(SESSION_KEY, s); }

export type CloudConn = { ok: boolean; base: string; error?: string; ms?: number };
let _lastConn: CloudConn | null = null;
export function getLastConn() { return _lastConn; }

async function fetchWithTimeout(url: string, init: RequestInit, ms = 12000): Promise<Response> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => { try { (ctrl as any)?.abort(); } catch {} }, ms);
  try {
    return await fetch(url, { ...init, signal: ctrl?.signal as any });
  } finally { clearTimeout(t); }
}

function normBase(b: string) { return String(b||'').trim().replace(/\/+$/, ''); }
function baseCandidates(primary: string): string[] {
  const p = normBase(primary);
  const set = new Set<string>([p]);
  // common variants: http<->https, and same host without explicit scheme issues
  if (p.startsWith('https://')) set.add('http://' + p.slice(8));
  else if (p.startsWith('http://')) set.add('https://' + p.slice(7));
  // if user stored host:port without scheme
  if (p && !/^https?:\/\//i.test(p)) { set.add('http://' + p); set.add('https://' + p); }
  return Array.from(set).filter(Boolean);
}

export async function pingCloud(baseOverride?: string): Promise<CloudConn> {
  const primary = baseOverride ? normBase(baseOverride) : await getCloudBase();
  const started = Date.now();
  for (const base of baseCandidates(primary)) {
    try {
      const res = await fetchWithTimeout(base + '/health', { method:'GET', headers:{ 'X-PD-Client': `pocketdev/${APP_VERSION}` } }, 10000);
      const text = await res.text();
      let data:any = {}; try { data = text?JSON.parse(text):{}; } catch {}
      if (res.ok && data && data.ok) { _lastConn = { ok:true, base, ms: Date.now()-started }; return _lastConn; }
    } catch {}
  }
  _lastConn = { ok:false, base: normBase(primary), error: '无法连接云端服务（网络不可达/超时）。请检查网络或稍后重试。' };
  return _lastConn;
}

async function api(path: string, init?: RequestInit & { auth?: boolean }): Promise<any> {
  const primary = await getCloudBase();
  const makeHeaders = async () => {
    const headers: Record<string,string> = { 'Content-Type':'application/json', 'X-PD-Client': `pocketdev/${APP_VERSION}` };
    if (init?.auth !== false) { const s = await getCloudSession(); if (s?.token) headers['Authorization'] = 'Bearer ' + s.token; }
    return headers;
  };
  let lastErr = '';
  for (const base of baseCandidates(primary)) {
    try {
      const headers = await makeHeaders();
      const res = await fetchWithTimeout(base + path, { ...init, headers: { ...headers, ...(init?.headers as any) } }, 15000);
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { ok:false, error: text || `HTTP ${res.status}` }; }
      if (!res.ok && data && !data.error) data.error = `请求失败(${res.status})`;
      // remember working base on success-like HTTP
      if (res.ok || (data && typeof data.ok === 'boolean')) { if (base !== normBase(primary)) await setCloudBase(base); _lastConn = { ok:true, base }; }
      return data;
    } catch (e:any) {
      const msg = String(e?.message || e || '');
      lastErr = /abort|timeout/i.test(msg) ? '连接超时，请检查网络' : (msg.includes('Network request failed') ? '网络请求失败（可能是服务不可达或网络受限）' : (msg || '网络错误'));
    }
  }
  return { ok:false, error: lastErr || '无法连接云端服务，请稍后重试' };
}

export function validEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email||'').trim().toLowerCase()); }

export async function sendRegisterCode(email: string): Promise<{ ok: boolean; error?: string }> {
  return api('/auth/register/send-code', { method:'POST', body: JSON.stringify({ email }), auth:false });
}
export async function checkRegisterCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  return api('/auth/register/verify', { method:'POST', body: JSON.stringify({ email, code }), auth:false });
}
export async function completeRegister(email: string, code: string, password: string, nickname: string): Promise<AuthResult> {
  const d = await api('/auth/register/complete', { method:'POST', body: JSON.stringify({ email, code, password, nickname }), auth:false });
  if (d.ok && d.session) await setCloudSession(d.session);
  return d;
}
export async function login(email: string, password: string, force=false): Promise<AuthResult> {
  const d = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password, force }), auth:false });
  if (d.ok && d.session) await setCloudSession(d.session);
  return d;
}
export async function logout(): Promise<void> { try { await api('/auth/logout', { method:'POST', body:'{}' }); } catch {} await setCloudSession(null); }
export async function fetchMe(): Promise<CloudSession | null> {
  const d = await api('/auth/me'); if (d.ok && d.session) { await setCloudSession(d.session); return d.session; } return null;
}
export async function accountSnapshot(): Promise<{ session: CloudSession | null; users: number }> {
  const s = await getCloudSession(); return { session: s, users: s ? 1 : 0 };
}

// Cloud saves
export type CloudSaveMeta = { id:string; name:string; createdAt:number; size:number; keys:number; version?:string; format?:string };
export async function listSaves(): Promise<CloudSaveMeta[]> { const d = await api('/cloud/saves'); return d.ok ? (d.list||[]) : []; }
export async function createSave(payloadObj: any, name?: string): Promise<CloudSaveMeta> { const d = await api('/cloud/saves', { method:'POST', body: JSON.stringify({ name, payload: payloadObj }) }); if(!d.ok) throw new Error(d.error||'创建失败'); return d.meta; }
export async function getSave(id: string): Promise<any> { const d = await api('/cloud/saves/'+encodeURIComponent(id)); if(!d.ok) throw new Error(d.error||'获取失败'); return d.payload; }
export async function deleteSave(id: string): Promise<void> { await api('/cloud/saves/'+encodeURIComponent(id), { method:'DELETE' }); }

// Announcements
export type Announcement = { id:string; title:string; body:string; author:string; level?:string; pinned?:boolean; createdAt:number };
export async function listAnnouncements(): Promise<Announcement[]> { const d = await api('/announcements', { auth:false }); return d.ok ? (d.list||[]) : []; }
export async function publishAnnouncement(input:{title:string;body:string;level?:string;pinned?:boolean}): Promise<void> { const d = await api('/announcements',{method:'POST',body:JSON.stringify(input)}); if(!d.ok) throw new Error(d.error||'发布失败'); }
export async function removeAnnouncement(id:string): Promise<void> { await api('/announcements/'+encodeURIComponent(id),{method:'DELETE'}); }

// Channel
export type ChannelMessage = { id:string; from:'me'|'official'; text:string; at:number };
export async function getChannelMessages(): Promise<ChannelMessage[]> { const d = await api('/channel/messages'); return d.ok ? (d.list||[]) : []; }
export async function postChannelMessage(text: string): Promise<ChannelMessage[]> { const d = await api('/channel/messages',{method:'POST',body:JSON.stringify({text})}); if(!d.ok) throw new Error(d.error||'发送失败'); return d.list||[]; }

export const OFFICIAL_EMAIL = 'official@pocketdev.local';
export const OFFICIAL_NICK = 'PocketDev 官方';
export const OFFICIAL_PASSWORD_HINT = '（内置官方账号，密码由服务端配置）';
