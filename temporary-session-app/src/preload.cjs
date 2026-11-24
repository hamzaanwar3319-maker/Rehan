const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('marketplaceApp', {
  openFacebook: () => ipcRenderer.invoke('open-facebook'),
  saveListings: (items) => ipcRenderer.invoke('save-listings', items),
  loadListings: () => ipcRenderer.invoke('load-listings')
});