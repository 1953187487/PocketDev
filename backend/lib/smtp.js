'use strict';
const tls = require('tls');
const net = require('net');
const crypto = require('crypto');

function b64(s){ return Buffer.from(String(s),'utf8').toString('base64'); }
function loadEnvFile(p){
  const fs=require('fs'); const env={};
  try{ for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){ const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m) env[m[1]]=m[2]; } }catch{}
  return env;
}
function getMailEnv(){
  const path=require('path');
  const local=loadEnvFile(path.join(__dirname,'..','.env.local'));
  return {...process.env,...local};
}

async function sendMail({to,subject,text,html}){
  const ENV=getMailEnv();
  const host=ENV.SMTP_HOST||'smtp.qq.com';
  const port=Number(ENV.SMTP_PORT||465);
  const secure=String(ENV.SMTP_SECURE||'true')!=='false';
  const user=ENV.QQ_MAIL_USER; const pass=ENV.QQ_MAIL_PASS;
  if(!user||!pass) throw new Error('SMTP 未配置（缺少 QQ_MAIL_USER/QQ_MAIL_PASS）');
  if(!to) throw new Error('缺少收件人');
  const fromName='PocketDev';
  const msgId=`<${crypto.randomBytes(8).toString('hex')}@pocketdev.cloud>`;
  const boundary='b_'+crypto.randomBytes(6).toString('hex');
  const bodyText=text||(html?String(html).replace(/<[^>]+>/g,''):'');
  const mime=[
    `From: "${fromName}" <${user}>`,`To: <${to}>`,`Subject: =?UTF-8?B?${b64(subject||'PocketDev 通知')}?=`,
    `Message-ID: ${msgId}`,`Date: ${new Date().toUTCString()}`,`MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,'',
    `--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(bodyText),
    `--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(html||`<p>${String(bodyText).replace(/</g,'&lt;')}</p>`),
    `--${boundary}--`,'.',
  ].join('\r\n');
  return new Promise((resolve,reject)=>{
    const socket=secure?tls.connect({host,port,servername:host},()=>{}):net.connect(port,host,()=>{});
    let buf=''; let step=0;
    const timer=setTimeout(()=>{try{socket.destroy();}catch{} reject(new Error('SMTP 超时'));},20000);
    function send(cmd){ socket.write(cmd+'\r\n'); }
    function fail(e){ clearTimeout(timer); try{socket.destroy();}catch{} reject(e instanceof Error?e:new Error(String(e))); }
    socket.setEncoding('utf8'); socket.on('error',fail);
    socket.on('data',(chunk)=>{
      buf+=chunk; const lines=buf.split(/\r?\n/); buf=lines.pop()||'';
      for(const line of lines){ if(!line) continue; const code=line.slice(0,3); if(line[3]==='-') continue;
        try{
          if(step===0&&code==='220'){step=1;send('EHLO pocketdev.cloud');}
          else if(step===1&&code==='250'){step=2;send('AUTH LOGIN');}
          else if(step===2&&code==='334'){step=3;send(b64(user));}
          else if(step===3&&code==='334'){step=4;send(b64(pass));}
          else if(step===4&&code==='235'){step=5;send(`MAIL FROM:<${user}>`);}
          else if(step===5&&code==='250'){step=6;send(`RCPT TO:<${to}>`);}
          else if(step===6&&code==='250'){step=7;send('DATA');}
          else if(step===7&&code==='354'){step=8;socket.write(mime+'\r\n');}
          else if(step===8&&code==='250'){step=9;send('QUIT');clearTimeout(timer);try{socket.destroy();}catch{} resolve({ok:true,messageId:msgId});}
          else if(code[0]==='4'||code[0]==='5'){fail(new Error(`SMTP ${code}: ${line.slice(4)}`));}
        }catch(e){fail(e);}
      }
    });
  });
}
module.exports={sendMail,getMailEnv};
