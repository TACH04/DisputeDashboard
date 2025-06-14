// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Your existing function
  askGemini: (payload) => ipcRenderer.invoke('ask-gemini', payload),

  // Your existing function
  uploadAndProcess: (requests) => ipcRenderer.invoke('upload-and-process', requests),

  // --- NEW FUNCTION ---
  // This allows the main process to send data to the renderer process
  // The 'callback' is a function from your index.html that will handle the result
  onUploadComplete: (callback) => ipcRenderer.on('upload-complete', (_event, value) => callback(value))
});