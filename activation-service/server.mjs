import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||8787);
const HOST=process.env.HOST||'127.0.0.1';
const ADMIN=process.env.ADMIN_API_TOKEN||'';
const DATA=path.resolve(process.env.DATA_FILE||path.join(root,'data/activation-db.json'));
const PRIV=path.resolve(process.env.TOKEN_PRIVATE_KEY_FILE||path.join(root,'private-key.pem'));
const PUB=path.resolve(process.env.TOKEN_PUBLIC_KEY_FILE||path.join(root,'public-key.pem'));
const PRODUCT='Marketplace Bot';
let state={keys:{},redemptions:[]};
let queue=Promise.resolve();
const attempts=new Map();

function load(){
  if(fs.existsSync(DATA)){const d=JSON.parse(fs.readFileSync(DATA,'utf8'));state={keys:d.keys||{},redemptions:Array.isArray(d.redemptions)?d.redemptions:[]};}
  if(!ADMIN||ADMIN.length<32) throw new Error('Set ADMIN_API_TOKEN to a random secret of at least 32 characters.');
  if(!fs.existsSync(PRIV)||!fs.existsSync(PUB)) throw new Error('Signing key files are missing. Generate and protect an Ed25519 key pair before starting.');
  crypto.createPrivateKey(fs.readFileSync(PRIV)); crypto.createPublicKey(fs.readFileSync(PUB));
}
function persist(){fs.mkdirSync(path.dirname(DATA),{recursive:true});const tmp=DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(tmp,DATA);}
function hashKey(k){return crypto.createHash('sha256').update(k).digest('hex');}
function send(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(body);}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>1024*1024)throw Object.assign(new Error('Request too large'),{status:413});}try{return JSON.parse(s||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
function authorized(req){const h=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+ADMIN);return h.length===expected.length&&crypto.timingSafeEqual(h,expected);}
function rateLimited(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),old=attempts.get(ip)||[];const recent=old.filter(t=>now-t<10*60*1000);recent.push(now);attempts.set(ip,recent);return recent.length>15;}
function signedToken(payload){const b=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=crypto.sign(null,Buffer.from(b),fs.readFileSync(PRIV)).toString('base64url');return {format:'marketplace-bot-activation-v1',payload:b,signature:sig};}
function enqueue(fn){const p=queue.then(fn,fn);queue=p.catch(()=>{});return p;}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/health'){return send(res,200,{ok:true,product:PRODUCT});}
  if(req.method==='GET'&&url.pathname==='/v1/public-key'){return send(res,200,{algorithm:'Ed25519',publicKey:fs.readFileSync(PUB,'utf8')});}
  if(req.method==='POST'&&url.pathname==='/v1/admin/import-keys'){
   if(!authorized(req))return send(res,401,{error:'Unauthorized'});
   const data=await body(req);
   if(data.format!=='marketplace-bot-key-batch-v1'||!Array.isArray(data.keys)||data.keys.length<1||data.keys.length>1000)return send(res,400,{error:'Expected a Marketplace Bot key batch (1–1000 keys).'});
   const result=await enqueue(()=>{
    const seen=new Set();let added=0;
    for(const item of data.keys){
     const key=String(item.key||'');const days=Number(item.days);
     if(!/^\d{10}$/.test(key)||![30,90,180,365].includes(days))throw Object.assign(new Error('Every key must be 10 digits with a 30/90/180/365-day duration.'),{status:400});
     const hash=hashKey(key);if(seen.has(hash))throw Object.assign(new Error('Duplicate key in submitted batch.'),{status:409});seen.add(hash);
     if(state.keys[hash]&&state.keys[hash].days!==days)throw Object.assign(new Error('An existing key has a different duration.'),{status:409});
    }
    for(const item of data.keys){const hash=hashKey(String(item.key));if(state.keys[hash])continue;state.keys[hash]={days:Number(item.days),status:'unused',createdAt:new Date().toISOString(),batchId:String(item.batchId||'')};added++;}
    persist();return {imported:added};
   });
   return send(res,200,result);
  }
  if(req.method==='POST'&&url.pathname==='/v1/activate'){
   if(rateLimited(req))return send(res,429,{error:'Too many activation attempts. Try again later.'});
   const data=await body(req);const key=String(data.key||'');
   if(!/^\d{10}$/.test(key))return send(res,400,{error:'Enter a valid 10-digit key.'});
   const result=await enqueue(()=>{
    const hash=hashKey(key),record=state.keys[hash];
    if(!record)return {status:404,error:'Key not found.'};
    if(record.status!=='unused')return {status:409,error:'This key has already been redeemed or disabled.'};
    const now=new Date(),expiresAt=new Date(now.getTime()+record.days*86400000).toISOString();
    const payload={product:PRODUCT,licenseId:crypto.randomUUID(),issuedAt:now.toISOString(),expiresAt,plan:record.days+' days',keyLast4:key.slice(-4)};
    const token=signedToken(payload);
    record.status='redeemed';record.redeemedAt=now.toISOString();record.expiresAt=expiresAt;record.licenseId=payload.licenseId;
    state.redemptions.push({licenseId:payload.licenseId,keyHash:hash,redeemedAt:record.redeemedAt,expiresAt});
    persist();return {status:200,token,publicKey:fs.readFileSync(PUB,'utf8')};
   });
   return send(res,result.status||200,result);
  }
  if(req.method==='GET'&&url.pathname==='/v1/admin/redemptions'){
   if(!authorized(req))return send(res,401,{error:'Unauthorized'});
   return send(res,200,{format:'marketplace-bot-redemption-report-v1',generatedAt:new Date().toISOString(),redemptions:state.redemptions});
  }
  if(req.method==='GET'&&url.pathname==='/v1/admin/summary'){
   if(!authorized(req))return send(res,401,{error:'Unauthorized'});
   const values=Object.values(state.keys);return send(res,200,{total:values.length,unused:values.filter(x=>x.status==='unused').length,redeemed:values.filter(x=>x.status==='redeemed').length,expired:state.redemptions.filter(x=>Date.parse(x.expiresAt)<=Date.now()).length});
  }
  return send(res,404,{error:'Not found'});
 }catch(e){return send(res,e.status||500,{error:e.message||'Internal server error'});}
});
load();
server.listen(PORT,HOST,()=>process.stdout.write('Activation service listening on '+HOST+':'+PORT+'\n'));
