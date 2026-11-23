const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('botAPI',{
 state:()=>ipcRenderer.invoke('app:state'),
 activationStatus:()=>ipcRenderer.invoke('activation:status'),importOfflineKeyPack:()=>ipcRenderer.invoke('offline:importPack'),activateOffline:v=>ipcRenderer.invoke('offline:activate',v),
 saveListing:v=>ipcRenderer.invoke('listing:save',v),deleteListing:v=>ipcRenderer.invoke('listing:delete',v),chooseImages:()=>ipcRenderer.invoke('listing:images'),copyListing:v=>ipcRenderer.invoke('listing:copy',v),copyListingField:v=>ipcRenderer.invoke('listing:copyField',v),openListingComposer:v=>ipcRenderer.invoke('listing:openComposer',v),publishListing:v=>ipcRenderer.invoke('listing:publish',v),
 addAccount:v=>ipcRenderer.invoke('account:add',v),removeAccount:v=>ipcRenderer.invoke('account:remove',v),openAccount:v=>ipcRenderer.invoke('account:open',v),
 addTask:v=>ipcRenderer.invoke('task:add',v),updateTask:v=>ipcRenderer.invoke('task:update',v),
 openMarketplace:()=>ipcRenderer.invoke('browser:marketplace'),importCookies:()=>ipcRenderer.invoke('cookies:import'),
 backup:()=>ipcRenderer.invoke('data:backup'),restore:()=>ipcRenderer.invoke('data:restore')
});
