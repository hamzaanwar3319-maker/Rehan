const {app,BrowserWindow,ipcMain,dialog,shell,clipboard,safeStorage,session}=require('electron');
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
let db={listings:[],accounts:[],tasks:[],logs:[],settings:{},activation:null,offlineKeyPack:null,usedOfflineKeys:[],cookieVault:null};
const dbFile=()=>path.join(app.getPath('userData'),'marketplace-bot-data.json');
function load(){try{const saved=JSON.parse(fs.readFileSync(dbFile(),'utf8'));db={...db,...saved,settings:{...db.settings,...saved.settings},usedOfflineKeys:Array.isArray(saved.usedOfflineKeys)?saved.usedOfflineKeys:[]};}catch{}}
function save(){fs.mkdirSync(path.dirname(dbFile()),{recursive:true});const tmp=dbFile()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,dbFile());}
function log(type,message){db.logs.unshift({id:crypto.randomUUID(),type,message,at:new Date().toISOString()});db.logs=db.logs.slice(0,500);save();}
function safeText(v,max=5000){return String(v??'').trim().slice(0,max);}
function createWindow(){const w=new BrowserWindow({width:1440,height:920,minWidth:1100,minHeight:720,backgroundColor:'#0b1220',title:'Marketplace Bot',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.loadFile(path.join(__dirname,'index.html'));}
app.whenReady().then(()=>{load();createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('app:state',()=>({listings:db.listings,accounts:db.accounts,tasks:db.tasks,logs:db.logs,settings:db.settings,activated:validActivation()}));
function verifyOfflineEntry(entry,publicKey){
 if(!entry||!entry.payload||!/^\d{10}$/.test(String(entry.payload.key||'')))return false;
 const p=entry.payload;if(p.product!=='Marketplace Bot'||![30,90,180,365].includes(Number(p.days)))return false;
 try{const body=Buffer.from(JSON.stringify(p)).toString('base64url');return crypto.verify(null,Buffer.from(body),crypto.createPublicKey(publicKey),Buffer.from(entry.signature||'','base64url'));}catch{return false;}
}
function validActivation(){
 if(!db.activation||!safeStorage.isEncryptionAvailable()||!db.offlineKeyPack)return false;
 try{const active=JSON.parse(safeStorage.decryptString(Buffer.from(db.activation,'base64')));const entry=db.offlineKeyPack.keys.find(x=>x.payload.key===active.key);
 return !!entry&&verifyOfflineEntry(entry,db.offlineKeyPack.publicKey)&&Date.parse(active.expiresAt)>Date.now()&&db.usedOfflineKeys.includes(active.key);
 }catch{return false;}
}
ipcMain.handle('offline:importPack',async()=>{
 const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Offline key pack',extensions:['json']}]});if(r.canceled)return false;
 const pack=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));
 if(pack.product!=='Marketplace Bot'||pack.format!=='marketplace-bot-offline-key-pack-v1'||typeof pack.publicKey!=='string'||!Array.isArray(pack.keys)||!pack.keys.length)throw Error('Invalid offline key pack.');
 if(db.offlineKeyPack&&db.offlineKeyPack.publicKey!==pack.publicKey)throw Error('This app is already enrolled to a different Admin signing key. Contact your software administrator.');
 const valid=pack.keys.filter(x=>verifyOfflineEntry(x,pack.publicKey));
 if(valid.length!==pack.keys.length)throw Error('The offline key pack contains an invalid signature or key.');
 const merged=new Map((db.offlineKeyPack?.keys||[]).map(x=>[x.payload.key,x]));for(const item of valid)merged.set(item.payload.key,item);
 db.offlineKeyPack={publicKey:pack.publicKey,keys:[...merged.values()]};save();log('success','Imported '+valid.length+' signed offline subscription keys.');return {count:valid.length};
});
ipcMain.handle('offline:activate',(_e,{key})=>{
 if(!safeStorage.isEncryptionAvailable())throw Error('Windows secure storage is unavailable.');
 const value=String(key||'').trim();if(!/^\d{10}$/.test(value))throw Error('Enter your 10-digit subscription key.');
 if(!db.offlineKeyPack)throw Error('First import the offline key pack supplied by your Admin.');
 if(validActivation())throw Error('This workspace is already activated.');
 if(db.usedOfflineKeys.includes(value))throw Error('This key has already been used on this installation.');
 const entry=db.offlineKeyPack.keys.find(x=>x.payload.key===value);if(!entry||!verifyOfflineEntry(entry,db.offlineKeyPack.publicKey))throw Error('Invalid key. Check the 10 digits or ask your Admin for the correct offline key pack.');
 const activatedAt=new Date(),expiresAt=new Date(activatedAt.getTime()+Number(entry.payload.days)*86400000);
 const active={key:value,plan:entry.payload.plan,days:Number(entry.payload.days),activatedAt:activatedAt.toISOString(),expiresAt:expiresAt.toISOString()};
 db.usedOfflineKeys.push(value);db.activation=safeStorage.encryptString(JSON.stringify(active)).toString('base64');save();log('success','Offline key activated until '+expiresAt.toISOString());return {ok:true,expiresAt:active.expiresAt,plan:active.plan};
});
ipcMain.handle('activation:status',()=>{let activation=null;if(validActivation()){try{activation=JSON.parse(safeStorage.decryptString(Buffer.from(db.activation,'base64')));}catch{}}return {active:!!activation,activation,hasPack:!!db.offlineKeyPack};});
ipcMain.handle('listing:save',(_e,data)=>{
 const title=safeText(data.title,180),description=safeText(data.description,5000),price=safeText(data.price,40);
 if(!title||!description||!price)throw Error('Title, description and price are required.');
 const item={id:data.id||crypto.randomUUID(),title,description,price,category:safeText(data.category,100),condition:safeText(data.condition,50),availability:safeText(data.availability,50),location:safeText(data.location,180),tags:safeText(data.tags,300),delivery:safeText(data.delivery,100),images:Array.isArray(data.images)?data.images.slice(0,10).map(x=>safeText(x,1000)):[],updatedAt:new Date().toISOString(),createdAt:data.createdAt||new Date().toISOString()};
 const i=db.listings.findIndex(x=>x.id===item.id);if(i>=0)db.listings[i]=item;else db.listings.unshift(item);save();log('info',(i>=0?'Updated':'Created')+' listing draft: '+title);return item;
});
ipcMain.handle('listing:delete',(_e,{id})=>{db.listings=db.listings.filter(x=>x.id!==id);save();log('info','Deleted local listing draft.');return true;});
ipcMain.handle('listing:images',async()=>{const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']} ]});return r.canceled?[]:r.filePaths.slice(0,10);});
ipcMain.handle('listing:copy',(_e,{id})=>{const l=db.listings.find(x=>x.id===id);if(!l)throw Error('Listing not found');clipboard.writeText([l.title,l.description,'Price: '+l.price,'Category: '+l.category,'Condition: '+l.condition,'Location: '+l.location,'Tags: '+l.tags].filter(Boolean).join('\n'));return true;});
ipcMain.handle('listing:copyField',(_e,{id,field})=>{const l=db.listings.find(x=>x.id===id);if(!l)throw Error('Listing not found');const allowed={title:l.title,description:l.description,price:l.price};if(!Object.prototype.hasOwnProperty.call(allowed,field))throw Error('Unsupported listing field');clipboard.writeText(allowed[field]||'');return true;});
ipcMain.handle('listing:openComposer',async(_e,{id,accountId})=>{const l=db.listings.find(x=>x.id===id);if(!l)throw Error('Listing not found');const a=db.accounts.find(x=>x.id===accountId);if(!a)throw Error('Choose a saved Facebook account profile first');const partition='persist:fb-'+a.id;const win=new BrowserWindow({width:1280,height:900,title:'Facebook Marketplace — '+a.name,webPreferences:{partition,contextIsolation:true,nodeIntegration:false,sandbox:true}});await win.loadURL('https://www.facebook.com/marketplace/create/item/');clipboard.writeText(l.title);log('info','Opened Marketplace listing composer for draft: '+l.title+' (manual review and submission required).');return {ok:true,title:l.title,images:l.images.length,account:a.name};});
ipcMain.handle('account:add',(_e,data)=>{const name=safeText(data.name,80);if(!name)throw Error('Enter an account label.');const a={id:crypto.randomUUID(),name,createdAt:new Date().toISOString()};db.accounts.unshift(a);save();log('info','Added account profile: '+name);return a;});
ipcMain.handle('account:remove',(_e,{id})=>{db.accounts=db.accounts.filter(x=>x.id!==id);save();return true;});
ipcMain.handle('account:open',async(_e,{id})=>{const a=db.accounts.find(x=>x.id===id);if(!a)throw Error('Account profile not found');const partition='persist:fb-'+a.id;const win=new BrowserWindow({width:1280,height:850,title:'Facebook Login — '+a.name,webPreferences:{partition,contextIsolation:true,nodeIntegration:false,sandbox:true}});await win.loadURL('https://www.facebook.com/marketplace/');log('info','Opened Facebook Marketplace browser profile: '+a.name);return true;});
ipcMain.handle('task:add',(_e,data)=>{const task={id:crypto.randomUUID(),listingId:data.listingId||'',type:safeText(data.type,60),status:'pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.tasks.unshift(task);save();log('info','Added manual task: '+task.type);return task;});
ipcMain.handle('task:update',(_e,{id,status})=>{const t=db.tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');if(!['pending','in-progress','completed','cancelled'].includes(status))throw Error('Invalid task status');t.status=status;t.updatedAt=new Date().toISOString();save();return t;});
ipcMain.handle('browser:marketplace',async()=>{await shell.openExternal('https://www.facebook.com/marketplace/');return true;});
ipcMain.handle('cookies:import',async()=>{if(!safeStorage.isEncryptionAvailable())throw Error('Windows secure storage is unavailable.');const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Cookie JSON',extensions:['json']}]});if(r.canceled)return false;const raw=fs.readFileSync(r.filePaths[0],'utf8');const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('Expected a cookie JSON array.');const allowed=data.filter(c=>c&&typeof c.name==='string'&&typeof c.value==='string'&&typeof c.domain==='string'&&/(^|\.)facebook\.com$/i.test(c.domain.replace(/^\./,'')));if(!allowed.length)throw Error('No Facebook-domain cookies found.');db.cookieVault=safeStorage.encryptString(JSON.stringify(allowed)).toString('base64');save();log('warning','Imported '+allowed.length+' Facebook cookie records into encrypted local vault. Not injected into browser sessions.');return {count:allowed.length,note:'Encrypted local archive only; import does not sign in or inject cookies.'};});
ipcMain.handle('data:backup',async()=>{const r=await dialog.showSaveDialog({defaultPath:'marketplace-bot-backup.json',filters:[{name:'JSON backup',extensions:['json']}]});if(r.canceled)return false;const out={...db,cookieVault:db.cookieVault?undefined:null,activation:db.activation?undefined:null};fs.writeFileSync(r.filePath,JSON.stringify(out,null,2),{mode:0o600});return true;});
ipcMain.handle('data:restore',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'JSON backup',extensions:['json']}]});if(r.canceled)return false;const incoming=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(!Array.isArray(incoming.listings)||!Array.isArray(incoming.accounts))throw Error('Invalid backup file.');db={...db,...incoming};save();return true;});
