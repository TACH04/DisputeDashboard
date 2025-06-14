// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Your existing functions
  askGemini: (payload) => ipcRenderer.invoke('ask-gemini', payload),
  uploadAndProcess: (requests) => ipcRenderer.invoke('upload-and-process', requests),
  onUploadProgress: (callback) => ipcRenderer.on('upload-progress', (_event, value) => callback(value)),
  
  // --- NEW: A listener for commands from the native menu ---
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, action) => callback(action)),
});