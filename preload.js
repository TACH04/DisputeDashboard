// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Your existing function
  askGemini: (payload) => ipcRenderer.invoke('ask-gemini', payload),

  // Your existing function
  uploadAndProcess: (requests) => ipcRenderer.invoke('upload-and-process', requests),

  // --- NEW: A listener for our progress stream ---
  onUploadProgress: (callback) => ipcRenderer.on('upload-progress', (_event, value) => callback(value)),
  
  // The 'onUploadComplete' is no longer needed, so we remove it to avoid confusion.
});