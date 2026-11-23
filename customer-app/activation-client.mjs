import crypto from 'node:crypto';
import fs from 'node:fs';

export async function activate({serverUrl,key,saveToken}){
  const response=await fetch(new URL('/v1/activate',serverUrl),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Activation failed');
  const verified=verifyActivationToken(data.token,data.publicKey);
  if(!verified.valid)throw new Error('Activation token signature is invalid.');
  await saveToken(data.token);
  return verified.payload;
}
export function verifyActivationToken(token,publicKeyPem,now=Date.now()){
  if(!token||token.format!=='marketplace-bot-activation-v1')return {valid:false,reason:'Invalid token format'};
  try{
    const bytes=Buffer.from(token.payload,'base64url');
    const signature=Buffer.from(token.signature,'base64url');
    if(!crypto.verify(null,Buffer.from(token.payload),crypto.createPublicKey(publicKeyPem),signature))return {valid:false,reason:'Bad signature'};
    const payload=JSON.parse(bytes.toString('utf8'));
    if(payload.product!=='Marketplace Bot')return {valid:false,reason:'Wrong product'};
    if(!Number.isFinite(Date.parse(payload.expiresAt))||Date.parse(payload.expiresAt)<=now)return {valid:false,reason:'Expired'};
    return {valid:true,payload};
  }catch{return {valid:false,reason:'Malformed token'};}
}
