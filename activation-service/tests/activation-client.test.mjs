import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyActivationToken } from '../../customer-app/activation-client.mjs';

const pair=crypto.generateKeyPairSync('ed25519');
const publicKey=pair.publicKey.export({type:'spki',format:'pem'});
function token(payload){
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const signature=crypto.sign(null,Buffer.from(encoded),pair.privateKey).toString('base64url');
 return {format:'marketplace-bot-activation-v1',payload:encoded,signature};
}
test('accepts a valid current signed activation',()=>{
 const t=token({product:'Marketplace Bot',licenseId:'abc',issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),plan:'30 days'});
 assert.equal(verifyActivationToken(t,publicKey).valid,true);
});
test('rejects tampered payload',()=>{
 const t=token({product:'Marketplace Bot',expiresAt:new Date(Date.now()+86400000).toISOString()});
 t.payload=Buffer.from(JSON.stringify({product:'Marketplace Bot',expiresAt:new Date(Date.now()+86400000).toISOString(),plan:'365 days'})).toString('base64url');
 assert.equal(verifyActivationToken(t,publicKey).valid,false);
});
test('rejects expired activation',()=>{
 const t=token({product:'Marketplace Bot',expiresAt:new Date(Date.now()-1000).toISOString()});
 assert.equal(verifyActivationToken(t,publicKey).valid,false);
});
test('rejects another product',()=>{
 const t=token({product:'Other App',expiresAt:new Date(Date.now()+86400000).toISOString()});
 assert.equal(verifyActivationToken(t,publicKey).valid,false);
});
