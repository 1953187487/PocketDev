/**
 * PocketDev 本地邮件服务（QQ SMTP 自动发送）
 * 仅在本设备运行，凭据从 mail-server/.env.local 读取，不入库。
 * 用法：node mail-server/server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const crypto = require('crypto');

function loadEnv() {
  const p = path.join(__dirname, '.env.local');
  const env = {};
  try {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return { ...process.env, ...env };
}

const ENV = loadEnv();
const PORT = Number(ENV.PORT || 17887);
const OFFICIAL_EMAIL = '2865529057@qq.com'; // 内置官方账号关联邮箱

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

async function sendMail({ to, subject, text, html }) {
  const host = ENV.SMTP_HOST || 'smtp.qq.com';
  const port = Number(ENV.SMTP_PORT || 465);
  const secure = String(ENV.SMTP_SECURE || 'true') !== 'false';
  const user = ENV.QQ_MAIL_USER;
  const pass = ENV.QQ_MAIL_PASS;
  if (!user || !pass) throw new Error('未配置 QQ_MAIL_USER / QQ_MAIL_PASS');
  if (!to) throw new Error('缺少收件人');

  const fromName = 'PocketDev';
  const msgId = `<${crypto.randomBytes(8).toString('hex')}@pocketdev.local>`;
  const boundary = 'b_' + crypto.randomBytes(6).toString('hex');
  const bodyText = text || (html ? html.replace(/<[^>]+>/g, '') : '');
  const mime = [
    `From: "${fromName}" <${user}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject || 'PocketDev 通知')}?=`,
    `Message-ID: ${msgId}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(bodyText),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(html || `<div style="font-family:sans-serif"><p>${String(bodyText).replace(/</g,'&lt;')}</p></div>`),
    `--${boundary}--`,
    '.',
  ].join('\r\n');

  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, onConnect)
      : require('net').connect(port, host, onConnect);
    let buf = '';
    let step = 0;
    const timer = setTimeout(() => { try { socket.destroy(); } catch {} reject(new Error('SMTP 超时')); }, 20000);
    function send(cmd) { socket.write(cmd + '\r\n'); }
    function fail(e) { clearTimeout(timer); try { socket.destroy(); } catch {} reject(e instanceof Error ? e : new Error(String(e))); }
    socket.setEncoding('utf8');
    socket.on('error', fail);
    function onConnect() { /* wait for greeting */ }
    socket.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/); buf = lines.pop() || '';
      for (const line of lines) {
        if (!line) continue;
        const code = line.slice(0, 3);
        const cont = line[3] === '-';
        if (cont) continue;
        try {
          if (step === 0 && code === '220') { step = 1; send(`EHLO pocketdev.local`); }
          else if (step === 1 && code === '250') { step = 2; send('AUTH LOGIN'); }
          else if (step === 2 && code === '334') { step = 3; send(b64(user)); }
          else if (step === 3 && code === '334') { step = 4; send(b64(pass)); }
          else if (step === 4 && code === '235') { step = 5; send(`MAIL FROM:<${user}>`); }
          else if (step === 5 && code === '250') { step = 6; send(`RCPT TO:<${to}>`); }
          else if (step === 6 && code === '250') { step = 7; send('DATA'); }
          else if (step === 7 && code === '354') { step = 8; socket.write(mime + '\r\n'); }
          else if (step === 8 && code === '250') { step = 9; send('QUIT'); clearTimeout(timer); try { socket.destroy(); } catch {} resolve({ ok: true, messageId: msgId }); }
          else if (code[0] === '4' || code[0] === '5') { fail(new Error(`SMTP ${code}: ${line.slice(4)}`)); }
        } catch (e) { fail(e); }
      }
    });
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'pocketdev-mail', port: PORT, user: ENV.QQ_MAIL_USER || '' });
  if (req.method === 'POST' && req.url === '/send') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 50000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const r = await sendMail(body);
        json(res, 200, r);
      } catch (e) { json(res, 400, { ok: false, error: (e && e.message) || String(e) }); }
    });
    return;
  }
  json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[pocketdev-mail] listening on 127.0.0.1:${PORT} as ${ENV.QQ_MAIL_USER || '(no user)'}`);
});
