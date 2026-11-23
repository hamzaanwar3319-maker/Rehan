const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('adminAPI', {
  authStatus:()=>ipcRenderer.invoke('auth:status'), setup:(v)=>ipcRenderer.invoke('auth:setup',v), login:(v)=>ipcRenderer.invoke('auth:login',v), changePassword:(v)=>ipcRenderer.invoke('auth:changePassword',v),
  summary:()=>ipcRenderer.invoke('app:summary'), customers:()=>ipcRenderer.invoke('customers:list'), addCustomer:(v)=>ipcRenderer.invoke('customers:add',v),
  licenseKeys:()=>ipcRenderer.invoke('licenseKeys:list'), generateKeys:(v)=>ipcRenderer.invoke('licenseKeys:generate',v), exportKeys:()=>ipcRenderer.invoke('licenseKeys:export'), importRedemptions:()=>ipcRenderer.invoke('licenseKeys:importRedemptions'),
  licenses:()=>ipcRenderer.invoke('licenses:list'), createLicense:(v)=>ipcRenderer.invoke('licenses:create',v), renew:(v)=>ipcRenderer.invoke('licenses:renew',v), revoke:(v)=>ipcRenderer.invoke('licenses:revoke',v), exportLicense:(v)=>ipcRenderer.invoke('licenses:export',v),
  exportBackup:()=>ipcRenderer.invoke('data:export'), importBackup:()=>ipcRenderer.invoke('data:import'), publicKey:()=>ipcRenderer.invoke('security:publicKey')
});
