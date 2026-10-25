// Forteller sidene at de kjører i programmet (startmenyen, ingen reklameplass på forsiden) og lar
// dem avslutte det (Quit) og bytte fullskjerm. Ingen Node-tilgang for sidene (contextIsolation + sandbox).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('liminalDesktop', {
  platform: process.platform,
  quit: () => ipcRenderer.send('liminal:quit'),
  toggleFullscreen: () => ipcRenderer.send('liminal:fullscreen'),
});
