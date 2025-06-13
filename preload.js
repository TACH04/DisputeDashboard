// preload.js


const { contextBridge, ipcRenderer } = require('electron');

// We don't need to expose process.env anymore!
// Instead, we expose a function that the renderer can call.
contextBridge.exposeInMainWorld('electronAPI', {
  askGemini: (prompt) => ipcRenderer.invoke('ask-gemini', prompt)
});
