const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyOfflineEntry } = require('../offline-license.cjs');

test('offline license pack entries verify with the Admin public key', () => {
  const pair = crypto.generateKeyPairSync('ed25519');
  const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const payload = { product: 'Marketplace Bot', key: '1234567890', days: 30, plan: '30 days', createdAt: '2026-11-24T00:00:00.000Z' };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const entry = { payload, signature: crypto.sign(null, Buffer.from(body), privateKey).toString('base64url') };
  assert.equal(verifyOfflineEntry(entry, publicKey), true);
  assert.equal(verifyOfflineEntry({ ...entry, payload: { ...payload, days: 365 } }, publicKey), false);
  assert.equal(verifyOfflineEntry({ ...entry, payload: { ...payload, key: 'abc' } }, publicKey), false);
});
