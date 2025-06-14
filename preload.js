// preload.js


const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  askGemini: (prompt) => ipcRenderer.invoke('ask-gemini', prompt),
  generateLetter: (disputes) => ipcRenderer.invoke('generate-letter', disputes),
  uploadAndProcess: (requests) => ipcRenderer.invoke('upload-and-process', requests)
});