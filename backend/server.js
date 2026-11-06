'use strict';
/**
 * PocketDev Cloud Backend (v1.0.7 cloud mode)
 * - SQLite (node:sqlite, zero deps) + QQ SMTP email verify
 * - Auth: register(email->code->set password), login, single active session, logout
 * - Cloud save, announcements, official channel
 * Run: node backend/server.js  (reads backend/.env.local)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { openDb } = require('./lib/db');
const { uid, token, genCode, hashPassword, verifyPassword } = require('./lib/crypto');
const { sendMail, getMailEnv } = require('./lib/smtp');

function loadEnv() {
  const p = path.join(__dirname, '.env.local');
  const env = {};
  try { for (const line of fs.readFileSync(p,'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m) env[m[1]]=m[2]; } } catch {}
  return { ...process.env, ...env };
}
const ENV = loadEnv();
const PORT = Number(ENV.PORT || 17888);
const HOST = ENV.HOST || '0.0.0.0';
const DB_PATH = path.join(__dirname, 'data', 'pocketdev-cloud.db');
const db = openDb(DB_PATH);

const OFFICIAL_EMAIL = (ENV.OFFICIAL_EMAIL || 'official@pocketdev.local').toLowerCase();
const OFFICIAL_NICK = ENV.OFFICIAL_NICK || 'PocketDev 官方';
const OFFICIAL_PASSWORD = ENV.OFFICIAL_PASSWORD || 'pocketdev.official.2026';

function ensureOfficial() {
  const row = db.prepare('SELECT id FROM users WHERE email=?').get(OFFICIAL_EMAIL);
  if (row) return;
  db.prepare('INSERT INTO users(id,email,nickname,password_hash,is_official,created_at,last_login_at) VALUES(?,?,?,?,1,?,0)')
    .run('official-builtin', OFFICIAL_EMAIL, OFFICIAL_NICK, hashPassword(OFFICIAL_EMAIL, OFFICIAL_PASSWORD), Date.now());
}
ensureOfficial();

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type, Authorization', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve,reject)=>{ let raw=''; req.on('data',c=>{ raw+=c; if(raw.length>2_000_000) req.destroy(); }); req.on('end',()=>{ try{ resolve(raw?JSON.parse(raw):{}); }catch{ resolve({}); } }); req.on('error',reject); });
}
function now(){ return Date.now(); }
function cleanExpired() {
  const t=now();
  try { db.prepare('DELETE FROM codes WHERE expires_at<?').run(t); } catch {}
  try { db.prepare('DELETE FROM sessions WHERE expires_at<?').run(t); } catch {}
}
function authUser(req) {
  const h = req.headers['authorization'] || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!tok) return null;
  const s = db.prepare('SELECT s.token,s.user_id,s.expires_at,u.email,u.nickname,u.is_official FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').get(tok);
  if (!s) return null;
  if (s.expires_at < now()) { try{ db.prepare('DELETE FROM sessions WHERE token=?').run(tok); }catch{} return null; }
  return { token:s.token, userId:s.user_id, email:s.email, nickname:s.nickname, isOfficial:!!s.is_official };
}
function validEmail(e){ e=String(e||'').trim().toLowerCase(); if(e===OFFICIAL_EMAIL) return true; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

function officialReply(text){
  const t=String(text||'');
  if(/公告|更新|版本/.test(t)) return '可在「公告」查看最新消息；当前为 v1.0.7 云端登录版本。';
  if(/登录|账号|密码|注册/.test(t)) return '注册：邮箱→验证码→设置密码；之后邮箱+密码登录。云端账号不支持重复并发登录。';
  if(/存档|备份|云/.test(t)) return '云存档已同步到云端服务器，可在「云存档」创建/恢复。';
  if(/你好|hi|hello|在吗/i.test(t)) return '你好！我是 PocketDev 官方助手（云端渠道）。';
  return '收到，我们已记录你的消息。';
}

const server = http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS') return json(res,200,{ok:true});
  cleanExpired();
  const url = new URL(req.url, `http://${req.headers.host||'localhost'}`);
  const p = url.pathname;
  try {
    if(req.method==='GET' && p==='/health') return json(res,200,{ok:true,service:'pocketdev-cloud',version:'1.0.7',port:PORT,mail:!!(getMailEnv().QQ_MAIL_USER&&getMailEnv().QQ_MAIL_PASS)});

    // --- Auth ---
    if(req.method==='POST' && p==='/auth/register/send-code'){
      const b=await readBody(req); const email=String(b.email||'').trim().toLowerCase();
      if(!validEmail(email)||email===OFFICIAL_EMAIL) return json(res,400,{ok:false,error:'请输入有效的个人邮箱'});
      if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) return json(res,400,{ok:false,error:'该邮箱已注册，请直接登录'});
      const code=genCode();
      db.prepare('INSERT INTO codes(email,purpose,code,expires_at) VALUES(?,?,?,?) ON CONFLICT(email,purpose) DO UPDATE SET code=excluded.code,expires_at=excluded.expires_at')
        .run(email,'register',code,now()+10*60*1000);
      try { await sendMail({to:email,subject:'PocketDev 注册验证码',text:`您的验证码是：${code}（10分钟内有效）。验证后请设置登录密码。`}); }
      catch(e){ return json(res,502,{ok:false,error:'验证码发送失败：'+(e.message||e)}); }
      return json(res,200,{ok:true});
    }
    if(req.method==='POST' && p==='/auth/register/verify'){
      const b=await readBody(req); const email=String(b.email||'').trim().toLowerCase(); const code=String(b.code||'').trim();
      const row=db.prepare('SELECT code,expires_at FROM codes WHERE email=? AND purpose=?').get(email,'register');
      if(!row||row.expires_at<now()||row.code!==code) return json(res,400,{ok:false,error:'验证码错误或已过期'});
      return json(res,200,{ok:true});
    }
    if(req.method==='POST' && p==='/auth/register/complete'){
      const b=await readBody(req); const email=String(b.email||'').trim().toLowerCase(); const code=String(b.code||'').trim();
      const password=String(b.password||''); const nickname=String(b.nickname||'').trim()||email.split('@')[0];
      if(!validEmail(email)||email===OFFICIAL_EMAIL) return json(res,400,{ok:false,error:'邮箱无效'});
      if(password.length<6) return json(res,400,{ok:false,error:'密码至少 6 位'});
      const row=db.prepare('SELECT code,expires_at FROM codes WHERE email=? AND purpose=?').get(email,'register');
      if(!row||row.expires_at<now()||row.code!==code) return json(res,400,{ok:false,error:'验证码错误或已过期'});
      if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) return json(res,400,{ok:false,error:'该邮箱已注册'});
      const existing=db.prepare('SELECT token FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=? AND s.expires_at>?').get(email,now());
      if(existing) return json(res,409,{ok:false,error:'该账号已有活跃登录会话'});
      db.prepare('DELETE FROM codes WHERE email=? AND purpose=?').run(email,'register');
      const userId=uid('u_'); const tok=token(); const t=now();
      db.prepare('INSERT INTO users(id,email,nickname,password_hash,is_official,created_at,last_login_at) VALUES(?,?,?,?,0,?,?)').run(userId,email,nickname,hashPassword(email,password),t,t);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(tok,userId,t,t+30*24*3600*1000);
      return json(res,200,{ok:true,session:{userId,email,nickname,token:tok,loginAt:t,isOfficial:false}});
    }
    if(req.method==='POST' && p==='/auth/login'){
      const b=await readBody(req); const email=String(b.email||'').trim().toLowerCase(); const password=String(b.password||'');
      const force=!!b.force;
      const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if(!u||!verifyPassword(email,password,u.password_hash)) return json(res,401,{ok:false,error:'邮箱或密码错误'});
      const existing=db.prepare('SELECT token FROM sessions WHERE user_id=? AND expires_at>?').get(u.id,now());
      if(existing && !force) return json(res,409,{ok:false,error:'该账号已登录，不能重复登录（可先退出或强制登录）'});
      if(force) db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
      const tok=token(); const t=now();
      db.prepare('UPDATE users SET last_login_at=? WHERE id=?').run(t,u.id);
      db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(tok,u.id,t,t+30*24*3600*1000);
      return json(res,200,{ok:true,session:{userId:u.id,email:u.email,nickname:u.nickname,token:tok,loginAt:t,isOfficial:!!u.is_official}});
    }
    if(req.method==='POST' && p==='/auth/logout'){
      const u=authUser(req); if(u) db.prepare('DELETE FROM sessions WHERE token=?').run(u.token);
      return json(res,200,{ok:true});
    }
    if(req.method==='GET' && p==='/auth/me'){
      const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'});
      return json(res,200,{ok:true,session:u});
    }

    // --- Cloud saves ---
    if(p==='/cloud/saves'){
      const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'});
      if(req.method==='GET'){
        const list=db.prepare('SELECT id,name,size,keys_count,created_at FROM cloud_saves WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(u.userId);
        return json(res,200,{ok:true,list:list.map(r=>({id:r.id,name:r.name,size:r.size,keys:r.keys_count,createdAt:r.created_at}))});
      }
      if(req.method==='POST'){
        const b=await readBody(req); const payload=b.payload && typeof b.payload==='object' ? b.payload : (b.data?{_v:'1.0.7',_t:now(),data:b.data}:null);
        if(!payload) return json(res,400,{ok:false,error:'缺少存档数据'});
        const compact=JSON.stringify(payload); const id=uid('sav_'); const name=String(b.name||`云存档 ${new Date().toLocaleString()}`);
        const keysCount=payload.data&&typeof payload.data==='object'?Object.keys(payload.data).length:0;
        db.prepare('INSERT INTO cloud_saves(id,user_id,name,payload,size,keys_count,created_at) VALUES(?,?,?,?,?,?,?)').run(id,u.userId,name,compact,compact.length,keysCount,now());
        return json(res,200,{ok:true,meta:{id,name,size:compact.length,keys:keysCount,createdAt:now()}});
      }
    }
    const saveM = p.match(/^\/cloud\/saves\/([^/]+)$/);
    if(saveM){
      const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'});
      const id=saveM[1];
      if(req.method==='GET'){
        const r=db.prepare('SELECT * FROM cloud_saves WHERE id=? AND user_id=?').get(id,u.userId);
        if(!r) return json(res,404,{ok:false,error:'存档不存在'});
        return json(res,200,{ok:true,payload:JSON.parse(r.payload),meta:{id:r.id,name:r.name,size:r.size,keys:r.keys_count,createdAt:r.created_at}});
      }
      if(req.method==='DELETE'){ db.prepare('DELETE FROM cloud_saves WHERE id=? AND user_id=?').run(id,u.userId); return json(res,200,{ok:true}); }
    }

    // --- Announcements ---
    if(p==='/announcements'){
      if(req.method==='GET'){
        const list=db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 50').all();
        return json(res,200,{ok:true,list:list.map(r=>({id:r.id,title:r.title,body:r.body,author:r.author,level:r.level,pinned:!!r.pinned,createdAt:r.created_at}))});
      }
      if(req.method==='POST'){
        const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'});
        const b=await readBody(req); const id=uid('ann_'); const t=now();
        db.prepare('INSERT INTO announcements(id,title,body,author,level,pinned,created_at) VALUES(?,?,?,?,?,?,?)')
          .run(id,String(b.title||'公告'),String(b.body||''),u.isOfficial?'PocketDev 官方':u.nickname,String(b.level||'info'),b.pinned?1:0,t);
        return json(res,200,{ok:true,id});
      }
    }
    const annM=p.match(/^\/announcements\/([^/]+)$/);
    if(annM && req.method==='DELETE'){ const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'}); db.prepare('DELETE FROM announcements WHERE id=?').run(annM[1]); return json(res,200,{ok:true}); }

    // --- Channel ---
    if(p==='/channel/messages'){
      const u=authUser(req); if(!u) return json(res,401,{ok:false,error:'未登录'});
      if(req.method==='GET'){
        const list=db.prepare('SELECT id,from_side,text,created_at FROM channel_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 200').all(u.userId);
        return json(res,200,{ok:true,list:list.map(r=>({id:r.id,from:r.from_side,text:r.text,at:r.created_at}))});
      }
      if(req.method==='POST'){
        const b=await readBody(req); const text=String(b.text||'').trim(); if(!text) return json(res,400,{ok:false,error:'空消息'});
        const t=now();
        db.prepare('INSERT INTO channel_messages(id,user_id,from_side,text,created_at) VALUES(?,?,?,?,?)').run(uid('msg_'),u.userId,'me',text,t);
        const reply=officialReply(text);
        if(reply) db.prepare('INSERT INTO channel_messages(id,user_id,from_side,text,created_at) VALUES(?,?,?,?,?)').run(uid('msg_'),u.userId,'official',reply,t+1);
        const list=db.prepare('SELECT id,from_side,text,created_at FROM channel_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 200').all(u.userId);
        return json(res,200,{ok:true,list:list.map(r=>({id:r.id,from:r.from_side,text:r.text,at:r.created_at}))});
      }
    }

    return json(res,404,{ok:false,error:'not found'});
  } catch(e){ console.error(e); return json(res,500,{ok:false,error:(e&&e.message)||'server error'}); }
});

server.listen(PORT, HOST, ()=>{ console.log(`[pocketdev-cloud] http://${HOST}:${PORT} db=${DB_PATH} official=${OFFICIAL_EMAIL}`); });
