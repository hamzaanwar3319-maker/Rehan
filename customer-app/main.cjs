const {app,BrowserWindow,ipcMain,dialog,shell,clipboard,safeStorage,session}=require('electron');
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
let verifyActivationToken;
let db={listings:[],accounts:[],tasks:[],logs:[],settings:{activationServer:''},activation:null,cookieVault:null};
const dbFile=()=>path.join(app.getPath('userData'),'marketplace-bot-data.json');
function load(){try{const saved=JSON.parse(fs.readFileSync(dbFile(),'utf8'));db={...db,...saved,settings:{...db.settings,...saved.settings}};}catch{}}
function save(){fs.mkdirSync(path.dirname(dbFile()),{recursive:true});const tmp=dbFile()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,dbFile());}
function log(type,message){db.logs.unshift({id:crypto.randomUUID(),type,message,at:new Date().toISOString()});db.logs=db.logs.slice(0,500);save();}
function safeText(v,max=5000){return String(v??'').trim().slice(0,max);}
function createWindow(){const w=new BrowserWindow({width:1440,height:920,minWidth:1100,minHeight:720,backgroundColor:'#0b1220',title:'Marketplace Bot',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.loadFile(path.join(__dirname,'index.html'));}
app.whenReady().then(async()=>{({verifyActivationToken}=await import('./activation-client.mjs'));load();createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('app:state',()=>({listings:db.listings,accounts:db.accounts,tasks:db.tasks,logs:db.logs,settings:db.settings,activated:validActivation()}));
function validActivation(){if(!db.activation||!safeStorage.isEncryptionAvailable())return false;try{const token=JSON.parse(safeStorage.decryptString(Buffer.from(db.activation,'base64')));const pem=fs.readFileSync(path.join(__dirname,'activation-public-key.pem'),'utf8');return verifyActivationToken(token,pem).valid;}catch{return false;}}
ipcMain.handle('activation:activate',async(_e,{key,serverUrl})=>{
 if(!safeStorage.isEncryptionAvailable())throw Error('Windows secure storage is unavailable.');
 const pem=fs.readFileSync(path.join(__dirname,'activation-public-key.pem'),'utf8');
 if(!pem.includes('BEGIN PUBLIC KEY'))throw Error('This release has no pinned activation public key. Contact the software administrator for the signed release build.');
 const url=safeText(serverUrl,300).replace(/\/$/,'');if(!/^https:\/\//i.test(url))throw Error('Activation server must use HTTPS.');
 const response=await fetch(url+'/v1/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:safeText(key,10)})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Activation failed.');
 const check=verifyActivationToken(data.token,pem);if(!check.valid)throw Error('Activation token verification failed: '+check.reason);
 db.activation=safeStorage.encryptString(JSON.stringify(data.token)).toString('base64');db.settings.activationServer=url;save();log('success','Product activated.');return {ok:true,expiresAt:check.payload.expiresAt,plan:check.payload.plan};
});
ipcMain.handle('activation:status',()=>({active:validActivation(),activation:validActivation()?(()=>{try{const t=JSON.parse(safeStorage.decryptString(Buffer.from(db.activation,'base64')));return verifyActivationToken(t,fs.readFileSync(path.join(__dirname,'activation-public-key.pem'),'utf8')).payload;}catch{return null;}})():null}));
ipcMain.handle('listing:save',(_e,data)=>{
 const title=safeText(data.title,180),description=safeText(data.description,5000),price=safeText(data.price,40);
 if(!title||!description||!price)throw Error('Title, description and price are required.');
 const item={id:data.id||crypto.randomUUID(),title,description,price,category:safeText(data.category,100),condition:safeText(data.condition,50),availability:safeText(data.availability,50),location:safeText(data.location,180),tags:safeText(data.tags,300),delivery:safeText(data.delivery,100),images:Array.isArray(data.images)?data.images.slice(0,10).map(x=>safeText(x,1000)):[],updatedAt:new Date().toISOString(),createdAt:data.createdAt||new Date().toISOString()};
 const i=db.listings.findIndex(x=>x.id===item.id);if(i>=0)db.listings[i]=item;else db.listings.unshift(item);save();log('info',(i>=0?'Updated':'Created')+' listing draft: '+title);return item;
});
ipcMain.handle('listing:delete',(_e,{id})=>{db.listings=db.listings.filter(x=>x.id!==id);save();log('info','Deleted local listing draft.');return true;});
ipcMain.handle('listing:images',async()=>{const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']} ]});return r.canceled?[]:r.filePaths.slice(0,10);});
ipcMain.handle('listing:copy',(_e,{id})=>{const l=db.listings.find(x=>x.id===id);if(!l)throw Error('Listing not found');clipboard.writeText([l.title,l.description,'Price: '+l.price,'Category: '+l.category,'Condition: '+l.condition,'Location: '+l.location,'Tags: '+l.tags].filter(Boolean).join('\n'));return true;});
ipcMain.handle('account:add',(_e,data)=>{const name=safeText(data.name,80);if(!name)throw Error('Enter an account label.');const a={id:crypto.randomUUID(),name,createdAt:new Date().toISOString()};db.accounts.unshift(a);save();log('info','Added account profile: '+name);return a;});
ipcMain.handle('account:remove',(_e,{id})=>{db.accounts=db.accounts.filter(x=>x.id!==id);save();return true;});
ipcMain.handle('account:open',async(_e,{id})=>{const a=db.accounts.find(x=>x.id===id);if(!a)throw Error('Account profile not found');const partition='persist:fb-'+a.id;const win=new BrowserWindow({width:1280,height:850,title:'Facebook Login — '+a.name,webPreferences:{partition,contextIsolation:true,nodeIntegration:false,sandbox:true}});await win.loadURL('https://www.facebook.com/marketplace/');log('info','Opened Facebook Marketplace browser profile: '+a.name);return true;});
ipcMain.handle('task:add',(_e,data)=>{const task={id:crypto.randomUUID(),listingId:data.listingId||'',type:safeText(data.type,60),status:'pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.tasks.unshift(task);save();log('info','Added manual task: '+task.type);return task;});
ipcMain.handle('task:update',(_e,{id,status})=>{const t=db.tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');if(!['pending','in-progress','completed','cancelled'].includes(status))throw Error('Invalid task status');t.status=status;t.updatedAt=new Date().toISOString();save();return t;});
ipcMain.handle('browser:marketplace',async()=>{await shell.openExternal('https://www.facebook.com/marketplace/');return true;});
ipcMain.handle('cookies:import',async()=>{if(!safeStorage.isEncryptionAvailable())throw Error('Windows secure storage is unavailable.');const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Cookie JSON',extensions:['json']}]});if(r.canceled)return false;const raw=fs.readFileSync(r.filePaths[0],'utf8');const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('Expected a cookie JSON array.');const allowed=data.filter(c=>c&&typeof c.name==='string'&&typeof c.value==='string'&&typeof c.domain==='string'&&/(^|\\.)facebook\\.com$/i.test(c.domain.replace(/^\\./,'')));if(!allowed.length)throw Error('No Facebook-domain cookies found.');db.cookieVault=safeStorage.encryptString(JSON.stringify(allowed)).toString('base64');save();log('warning','Imported '+allowed.length+' Facebook cookie records into encrypted local vault. Not injected into browser sessions.');return {count:allowed.length,note:'Encrypted local archive only; import does not sign in or inject cookies.'};});
ipcMain.handle('data:backup',async()=>{const r=await dialog.showSaveDialog({defaultPath:'marketplace-bot-backup.json',filters:[{name:'JSON backup',extensions:['json']}]});if(r.canceled)return false;const out={...db,cookieVault:db.cookieVault?undefined:null,activation:db.activation?undefined:null};fs.writeFileSync(r.filePath,JSON.stringify(out,null,2),{mode:0o600});return true;});
ipcMain.handle('data:restore',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'JSON backup',extensions:['json']}]});if(r.canceled)return false;const incoming=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(!Array.isArray(incoming.listings)||!Array.isArray(incoming.accounts))throw Error('Invalid backup file.');db={...db,...incoming};save();return true;});
