'use strict';
const crypto = require('crypto');

function uid(prefix='') {
  return prefix + crypto.randomBytes(8).toString('hex') + Date.now().toString(36).slice(-4);
}
function token() { return crypto.randomBytes(24).toString('hex'); }
function genCode() { return String(Math.floor(100000 + crypto.randomInt(900000))); }

function hashPassword(email, password) {
  // scrypt - strong hash, small params fine for this device
  const salt = 'pd_cloud_v2:' + String(email||'').trim().toLowerCase();
  const buf = crypto.scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return buf.toString('hex');
}
function verifyPassword(email, password, hash) {
  try {
    const h = hashPassword(email, password);
    return crypto.timingSafeEqual(Buffer.from(h,'hex'), Buffer.from(hash,'hex'));
  } catch { return false; }
}

module.exports = { uid, token, genCode, hashPassword, verifyPassword };
