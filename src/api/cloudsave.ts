/** 云端存档 (v1.0.7 cloud mode) - 数据存云端，接口兼容旧调用 */
import { listSaves, createSave as cloudCreate, getSave, deleteSave, CloudSaveMeta } from './cloud';
import { getAllKeys, getObject } from '@/storage';
export type { CloudSaveMeta };
export { listSaves, deleteSave };
export async function createSave(name?: string): Promise<CloudSaveMeta> {
  const keys = await getAllKeys();
  const data: Record<string,unknown> = {};
  for (const k of keys) { try { const v = await getObject<unknown>(k); if(v!=null) data[k]=v; } catch {} }
  return cloudCreate({ _v:'1.0.7', _t:Date.now(), data }, name);
}
export async function restoreSave(id: string): Promise<{ok:boolean; error?:string; keys?:number}> {
  try {
    const payload = await getSave(id);
    const data = payload?.data || {};
    const { setObject } = await import('@/storage');
    let n=0; for (const [k,v] of Object.entries(data)) { await setObject(k, v as never); n++; }
    return { ok:true, keys:n };
  } catch(e:any){ return { ok:false, error: e?.message||String(e) }; }
}
export async function exportSavePath(_id:string): Promise<string|null> { return null; }
export async function importSaveFromJson(_j:string,_n?:string): Promise<any> { return { ok:false, error:'云端模式请使用云存档' }; }
export function saveDir(){ return ''; }
