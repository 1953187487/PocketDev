/**
 * 聊天渠道 v1.0.7（本设备）
 * - 与官方账号的内置消息渠道；消息本地存储。
 * - 官方自动回复（本地规则）+ 公告联动提示。
 */
import { getObject, setObject } from '@/storage';

export interface ChannelMessage {
  id: string;
  from: 'me' | 'official';
  text: string;
  at: number;
}

const KEY = 'pd_channel_v1';
const MAX = 200;

function uid() { return 'msg_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

export async function getChannelMessages(): Promise<ChannelMessage[]> {
  return (await getObject<ChannelMessage[]>(KEY)) ?? [];
}
async function save(msgs: ChannelMessage[]) { await setObject(KEY, msgs.slice(-MAX)); }

export async function postMessage(text: string, from: 'me' | 'official' = 'me'): Promise<ChannelMessage[]> {
  const msgs = await getChannelMessages();
  const m: ChannelMessage = { id: uid(), from, text: text.trim(), at: Date.now() };
  msgs.push(m);
  await save(msgs);
  return msgs;
}

export async function clearChannel(): Promise<void> { await save([]); }

export function officialAutoReply(text: string): string | null {
  const t = text.toLowerCase();
  if (/公告|更新|版本/.test(text)) return '你可以在「设置 → 公告」查看最新公告；当前版本 v1.0.7 已支持本地登录、邮箱验证与云存档。';
  if (/登录|账号|密码|注册/.test(text)) return '注册流程：输入邮箱 → 收验证码 → 验证后设置密码。之后用邮箱+密码登录；同一账号不能重复登录。';
  if (/邮箱|验证码|qq/.test(text)) return '验证码由本设备邮件服务通过 QQ SMTP 发送，请在账号设置中填写授权码并启动 mail-server。';
  if (/存档|备份|云/.test(text)) return '云存档数据全部保存在本设备（紧凑存档），可在「账号/存档」中创建、恢复或导出。';
  if (/你好|hi|hello|在吗/.test(t)) return '你好！我是 PocketDev 官方助手，有问题可以直接发消息，或查看公告与设置。';
  return '收到。你的反馈已记录在本地渠道；如需发布公告请使用官方账号在公告页发布。';
}
