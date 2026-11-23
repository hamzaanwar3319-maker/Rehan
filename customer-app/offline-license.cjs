const crypto = require('node:crypto');
function verifyOfflineEntry(entry, publicKey) {
  if (!entry || !entry.payload || !/^\d{10}$/.test(String(entry.payload.key || ''))) return false;
  const payload = entry.payload;
  if (payload.product !== 'Marketplace Bot' || ![30, 90, 180, 365].includes(Number(payload.days))) return false;
  try {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return crypto.verify(null, Buffer.from(body), crypto.createPublicKey(publicKey), Buffer.from(entry.signature || '', 'base64url'));
  } catch { return false; }
}
module.exports = { verifyOfflineEntry };
