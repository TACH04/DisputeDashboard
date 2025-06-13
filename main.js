// main.js

// 1. Module Imports
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from .env file
require('dotenv').config();

// 2. Main Logic: Function to call the Google GenAI SDK
async function handleAskGemini(event, prompt) {
  console.log("Main process received prompt. Attempting to generate content...");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the .env file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // =================================================================
    // THE SOLUTION IS HERE: Use the base model name "gemini-pro".
    // The SDK handles routing to the correct version for this API key.
    // =================================================================
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Call the AI to generate content from the user's prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Successfully received AI Response.");
    
    // Return a structured success object
    return { success: true, text: text };

  } catch (error) {
    console.error("Error in handleAskGemini:", error);
    // Return a structured error object
    return { success: false, error: error.message };
  }
}

// 3. Main Window Creation
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');
};

// 4. Electron App Lifecycle

// Register the IPC handler before the app is ready
ipcMain.handle('ask-gemini', handleAskGemini);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});