/** 云端账号（v1.0.7 cloud mode）- 去本地模式，全面云端登录 */
export type { CloudSession as AccountSession } from './cloud';
export {
  validEmail, sendRegisterCode, checkRegisterCode, completeRegister, login, logout,
  accountSnapshot, getCloudSession as getAccountSession, fetchMe,
  getCloudBase, setCloudBase, defaultCloudBase,
  OFFICIAL_EMAIL, OFFICIAL_NICK, OFFICIAL_PASSWORD_HINT,
} from './cloud';

export const MAIL_SERVER_URL = ''; // 云端统一处理
export const OFFICIAL_PASSWORD = ''; // 不在客户端暴露
export async function ensureOfficialAccount() { /* server */ }
export async function getMailConfig() { return { smtpHost:'', smtpPort:465, secure:true, user:'', pass:'', fromName:'PocketDev', serverUrl:'', autoSend:true } as any; }
export async function setMailConfig(_m:any) { /* cloud */ }
export async function setAccountSession(_s:any) { /* cloud-managed */ }
