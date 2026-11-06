export type { Announcement } from './cloud';
export { listAnnouncements, publishAnnouncement, removeAnnouncement } from './cloud';
export async function clearAnnouncements(){ /* cloud */ }
export async function getReadIds(){ return []; }
export async function markRead(_id:string){}
export async function unreadCount(){ return 0; }
