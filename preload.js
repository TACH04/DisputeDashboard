// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Your existing functions
  askGemini: (payload) => ipcRenderer.invoke('ask-gemini', payload),
  uploadAndProcess: (requests) => ipcRenderer.invoke('upload-and-process', requests),
  uploadRequestLetter: () => ipcRenderer.invoke('upload-request-letter'),
  onUploadProgress: (callback) => ipcRenderer.on('upload-progress', (_event, value) => callback(value)),
  onRequestProgress: (callback) => ipcRenderer.on('request-progress', (_event, value) => callback(value)),
  
  // --- NEW: A listener for commands from the native menu ---
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, action) => callback(action)),
  
  // Data persistence functions
  saveCase: (caseData) => ipcRenderer.invoke('save-case', caseData),
  loadCase: (caseId) => ipcRenderer.invoke('load-case', caseId),
  loadAllCases: () => ipcRenderer.invoke('load-all-cases'),

  // New functions for response letter
  generateResponseLetter: (data) => ipcRenderer.invoke('generate-response-letter', data),
  exportLetter: (data) => ipcRenderer.invoke('export-letter', data),

  // Letter generation functions
  generateLetterSection: (data) => ipcRenderer.invoke('generate-letter-section', data),
  onLetterProgress: (callback) => ipcRenderer.on('letter-progress', (_event, value) => callback(value)),

  // User profile functions
  saveUserProfile: (profileData) => ipcRenderer.invoke('save-user-profile', profileData),
  loadUserProfile: () => ipcRenderer.invoke('load-user-profile'),

  // System information
  getWorkspacePath: () => process.cwd(),
  getOSInfo: () => process.platform + ' ' + process.version
});