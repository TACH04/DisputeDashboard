// main.js - Refactored to use service modules

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
require('dotenv').config();

// Import services
const DataService = require('./src/main/services/dataService');
const IPCHandlers = require('./src/main/handlers/ipcHandlers');

// Initialize services
const dataService = new DataService();
const ipcHandlers = new IPCHandlers();

// Global reference to main window
let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Create application menu
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                { label: 'New Case', accelerator: 'CmdOrCtrl+N', click: () => { /* Placeholder */ } },
                { label: 'Open Case...', accelerator: 'CmdOrCtrl+O', click: () => { /* Placeholder */ } },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [ { role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' } ]
        },
        {
            label: 'Navigate',
            submenu: [
                {
                    label: 'Go Back',
                    accelerator: 'Esc',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) focusedWindow.webContents.send('menu-action', 'go-back');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Next Item',
                    accelerator: 'CmdOrCtrl+Right',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) focusedWindow.webContents.send('menu-action', 'nav-next');
                    }
                },
                {
                    label: 'Previous Item',
                    accelerator: 'CmdOrCtrl+Left',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) focusedWindow.webContents.send('menu-action', 'nav-prev');
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [ { role: 'reload' }, { role: 'forcereload' }, { role: 'toggledevtools' }, { type: 'separator' }, { role: 'togglefullscreen' } ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, { type: 'info', title: 'About', message: 'Discovery Dispute Management Dashboard', detail: 'Version 1.0.0' });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    mainWindow.loadFile('index.html');
    
    return mainWindow;
};

// App lifecycle events
app.whenReady().then(async () => {
    console.log('App starting...');
    
    // Create main window
    mainWindow = createWindow();

    // Set up IPC handlers
    ipcHandlers.setupHandlers(ipcMain);

    // Clean up old format cases on startup
    try {
        const deletedCount = await dataService.cleanupOldFormatCases();
        if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} old format cases during startup`);
        }
    } catch (error) {
        console.error('Error during startup cleanup:', error);
    }

    // Set up periodic autosave (every 5 minutes)
    setInterval(async () => {
        try {
            // Check if main window exists and is not destroyed
            if (mainWindow && !mainWindow.isDestroyed()) {
                const cases = await mainWindow.webContents.executeJavaScript('appData.cases');
                await dataService.saveAllCases(cases);
                console.log('Autosave completed');
            } else {
                console.log('Main window not available for autosave');
            }
        } catch (error) {
            console.error('Autosave failed:', error);
        }
    }, 5 * 60 * 1000);

    console.log('App ready');
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle before quit to save data
app.on('before-quit', async () => {
    try {
        // Check if main window exists and is not destroyed
        if (mainWindow && !mainWindow.isDestroyed()) {
            const cases = await mainWindow.webContents.executeJavaScript('appData.cases');
            await dataService.saveAllCases(cases);
            console.log('Data saved before quit');
        } else {
            console.log('Main window not available for data save before quit');
        }
    } catch (error) {
        console.error('Error saving data before quit:', error);
    }
});
