/**
 * 云存档（本设备）v1.0.7 - 全部数据紧凑存档到本设备，支持备份/恢复/导出导入。
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getAllKeys, getObject, setObject } from '@/storage';

export interface CloudSaveMeta {
  id: string; name: string; createdAt: number; size: number; keys: number; version: string; format: 'json';
}
const SAVE_DIR = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + 'pocketdev-cloudsaves/';
const META_KEY = 'cloudsave_meta_v1';
async function ensureDir() {
  try { const info = await FileSystem.getInfoAsync(SAVE_DIR); if (!info.exists) await FileSystem.makeDirectoryAsync(SAVE_DIR, { intermediates: true }); } catch {}
}
function uid() { return 'sav_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
export async function listSaves(): Promise<CloudSaveMeta[]> {
  const list = (await getObject<CloudSaveMeta[]>(META_KEY)) ?? [];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}
async function writeMetas(list: CloudSaveMeta[]) { await setObject(META_KEY, list.slice(0, 30)); }
async function collectPayload(): Promise<Record<string, unknown>> {
  const keys = await getAllKeys();
  const out: Record<string, unknown> = {};
  for (const k of keys) { try { const v = await getObject<unknown>(k); if (v !== null && v !== undefined) out[k] = v; } catch {} }
  return out;
}
export async function createSave(name?: string): Promise<CloudSaveMeta> {
  await ensureDir();
  const payload = { _v: '1.0.7', _t: Date.now(), data: await collectPayload() };
  const json = JSON.stringify(payload);
  const id = uid();
  const file = SAVE_DIR + id + '.json';
  await FileSystem.writeAsStringAsync(file, json, { encoding: FileSystem.EncodingType.UTF8 });
  const meta: CloudSaveMeta = { id, name: name || `存档 ${new Date().toLocaleString()}`, createdAt: Date.now(), size: json.length, keys: Object.keys(payload.data as object).length, version: '1.0.7', format: 'json' };
  const list = await listSaves(); list.unshift(meta); await writeMetas(list);
  return meta;
}
export async function restoreSave(id: string): Promise<{ ok: boolean; error?: string; keys?: number }> {
  try {
    const file = SAVE_DIR + id + '.json';
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return { ok: false, error: '存档文件不存在' };
    const json = await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.UTF8 });
    const payload = JSON.parse(json) as { data?: Record<string, unknown> };
    const data = payload.data || {};
    let n = 0;
    for (const [k, v] of Object.entries(data)) { await setObject(k, v as never); n++; }
    return { ok: true, keys: n };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export async function deleteSave(id: string): Promise<void> {
  try { await FileSystem.deleteAsync(SAVE_DIR + id + '.json', { idempotent: true }); } catch {}
  await writeMetas((await listSaves()).filter((s) => s.id !== id));
}
export async function exportSavePath(id: string): Promise<string | null> {
  const file = SAVE_DIR + id + '.json';
  const info = await FileSystem.getInfoAsync(file);
  return info.exists ? file : null;
}
export async function importSaveFromJson(json: string, name?: string): Promise<CloudSaveMeta | { ok: false; error: string }> {
  try {
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object' || !payload.data) return { ok: false, error: '存档格式无效' };
    await ensureDir();
    const id = uid();
    const file = SAVE_DIR + id + '.json';
    const compact = JSON.stringify(payload);
    await FileSystem.writeAsStringAsync(file, compact, { encoding: FileSystem.EncodingType.UTF8 });
    const meta: CloudSaveMeta = { id, name: name || `导入 ${new Date().toLocaleString()}`, createdAt: Date.now(), size: compact.length, keys: Object.keys(payload.data).length, version: payload._v || '1.0.7', format: 'json' };
    const list = await listSaves(); list.unshift(meta); await writeMetas(list);
    return meta;
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export function saveDir(): string { return SAVE_DIR; }
