const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let mainWindow;
const dataFile = () => path.join(app.getPath('userData'), 'listings.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 620,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('open-facebook', async () => {
  // No "persist:" prefix: this Electron session exists only in memory.
  const partition = 'temp-facebook-' + Date.now();
  const win = new BrowserWindow({ width: 1100, height: 800, webPreferences: { partition, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const ses = win.webContents.session;
  win.on('closed', async () => {
    try { await ses.clearStorageData(); await ses.clearCache(); } catch (_) {}
  });
  await win.loadURL('https://www.facebook.com/marketplace/');
  return true;
});
ipcMain.handle('save-listings', async (_event, listings) => {
  fs.writeFileSync(dataFile(), JSON.stringify(listings, null, 2), 'utf8');
  return true;
});
ipcMain.handle('load-listings', async () => {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return []; }
});