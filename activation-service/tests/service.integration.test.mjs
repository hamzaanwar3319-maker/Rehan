import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('activation service imports a key once and redeems it globally once',async(t)=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mb-activation-'));
 const pair=crypto.generateKeyPairSync('ed25519');
 fs.writeFileSync(path.join(dir,'private.pem'),pair.privateKey.export({type:'pkcs8',format:'pem'}));
 fs.writeFileSync(path.join(dir,'public.pem'),pair.publicKey.export({type:'spki',format:'pem'}));
 const port=crypto.randomInt(20000,50000),secret=crypto.randomBytes(32).toString('hex');
 const serverPath=new URL('../server.mjs',import.meta.url);
 const child=spawn(process.execPath,[serverPath.pathname],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),ADMIN_API_TOKEN:secret,TOKEN_PRIVATE_KEY_FILE:path.join(dir,'private.pem'),TOKEN_PUBLIC_KEY_FILE:path.join(dir,'public.pem'),DATA_FILE:path.join(dir,'db.json')},stdio:['ignore','pipe','pipe']});\n let childOutput='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>childOutput+=chunk);child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>childOutput+=chunk);
 t.after(()=>{child.kill();fs.rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+port;
 let ready=false;
 for(let i=0;i<60;i++){try{const r=await fetch(base+'/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 assert.equal(ready,true,'activation service did not start. Child output: '+childOutput);
 const batch={format:'marketplace-bot-key-batch-v1',keys:[{key:'1234567890',days:30,batchId:'test'}]};
 let r=await fetch(base+'/v1/admin/import-keys',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(batch)});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{imported:1});
 r=await fetch(base+'/v1/admin/import-keys',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(batch)});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{imported:0});
 r=await fetch(base+'/v1/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:'1234567890'})});
 assert.equal(r.status,200);const activated=await r.json();assert.equal(activated.token.format,'marketplace-bot-activation-v1');
 r=await fetch(base+'/v1/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:'1234567890'})});
 assert.equal(r.status,409);
 r=await fetch(base+'/v1/admin/redemptions',{headers:{authorization:'Bearer '+secret}});
 const report=await r.json();assert.equal(report.format,'marketplace-bot-redemption-report-v1');assert.equal(report.redemptions.length,1);
});
