const DataService = require('../services/dataService');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');
const UserProfileService = require('../services/userProfileService');

class IPCHandlers {
    constructor() {
        this.dataService = new DataService();
        this.aiService = new AIService();
        this.fileService = new FileService();
        this.userProfileService = new UserProfileService();
    }

    setupHandlers(ipcMain) {
        // Data operations
        ipcMain.handle('save-case', async (event, caseData) => {
            return await this.dataService.saveCaseData(caseData);
        });

        ipcMain.handle('load-case', async (event, caseId) => {
            return await this.dataService.loadCaseData(caseId);
        });

        ipcMain.handle('load-all-cases', async () => {
            return await this.dataService.loadAllCases();
        });

        // AI operations
        ipcMain.handle('ask-gemini', async (event, { requestText, objectionText, contextText }) => {
            try {
                const userProfile = await this.userProfileService.loadUserProfile();
                const apiKey = userProfile?.apiKey;
                if (!apiKey) throw new Error("Gemini API Key not found. Please set it in your User Profile.");
                
                this.aiService.initialize(apiKey);
                const html = await this.aiService.generateReplies(requestText, objectionText, contextText);
                return { success: true, html };
            } catch (error) {
                console.error("Error in Deconstructor/Drafter pipeline:", error);
                return { success: false, error: error.message };
            }
        });

        // File upload and processing
        ipcMain.handle('upload-and-process', async (event, requestsFromUI) => {
            return await this.handleUploadAndProcess(event, requestsFromUI);
        });

        ipcMain.handle('upload-request-letter', async (event) => {
            return await this.handleRequestLetterUpload(event);
        });

        // Letter generation
        ipcMain.handle('generate-response-letter', async (event, { caseName, letterDescription, requests }) => {
            try {
                const userProfile = await this.userProfileService.loadUserProfile();
                const apiKey = userProfile?.apiKey;
                if (!apiKey) throw new Error("Gemini API Key not found. Please set it in your User Profile.");
                
                this.aiService.initialize(apiKey);
                const letterHtml = await this.aiService.generateResponseLetter(caseName, letterDescription, requests);
                return { success: true, html: letterHtml };
            } catch (error) {
                console.error("Error generating response letter:", error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('generate-letter-section', async (event, data) => {
            return await this.handleGenerateLetterSection(event, data);
        });

        // Export operations
        ipcMain.handle('export-letter', async (event, { content, format, fileName }) => {
            return await this.fileService.exportLetter(content, format, fileName);
        });

        // User profile operations
        ipcMain.handle('save-user-profile', async (event, profileData) => {
            return await this.userProfileService.saveUserProfile(profileData);
        });

        ipcMain.handle('load-user-profile', async () => {
            return await this.userProfileService.loadUserProfile();
        });

        ipcMain.handle('get-user-data-path', () => {
            return this.userProfileService.getUserDataPath();
        });

        // Cleanup old format cases
        ipcMain.handle('cleanup-old-cases', async () => {
            return await this.dataService.cleanupOldFormatCases();
        });
    }

    async handleUploadAndProcess(event, requestsFromUI) {
        const parentWindow = require('electron').BrowserWindow.fromWebContents(event.sender);
        if (!parentWindow) return;

        try {
            const filePath = await this.fileService.selectFile(
                "Select Opponent's Response PDF",
                "Upload and Process",
                [{ name: 'PDF Documents', extensions: ['pdf'] }]
            );

            if (!filePath) {
                parentWindow.webContents.send('upload-progress', { type: 'cancel' });
                return;
            }

            // Phase 1: Reading PDF (0-20%)
            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'reading',
                message: 'Reading PDF file...',
                progress: 0
            });

            const rawText = await this.fileService.readPDFFile(filePath);

            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'reading',
                message: 'PDF file read successfully.',
                progress: 20
            });

            // Phase 2: Text preprocessing (20-35%)
            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'preparing',
                message: 'Preprocessing document text...',
                progress: 25
            });

            const userProfile = await this.userProfileService.loadUserProfile();
            const apiKey = userProfile?.apiKey;
            if (!apiKey) throw new Error("API key not found.");
            
            this.aiService.initialize(apiKey);

            // Create a structured format of the requests for the AI
            const requestsFormatted = requestsFromUI.map(req => 
                `Request ${req.id}: ${req.text}`
            ).join('\n\n');

            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'preparing',
                message: 'Document prepared for analysis.',
                progress: 35
            });

            // Phase 3: AI Analysis (35-85%)
            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'processing',
                message: 'Starting AI analysis...',
                progress: 35
            });

            const extractedData = await this.aiService.extractObjections(requestsFormatted, rawText);

            // Phase 4: Final Processing (85-100%)
            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'finalizing',
                message: 'Processing extracted objections...',
                progress: 85
            });

            parentWindow.webContents.send('upload-progress', { 
                type: 'progress',
                stage: 'finalizing',
                message: 'Validating extracted data...',
                progress: 95
            });

            // Send successful results
            parentWindow.webContents.send('upload-progress', { 
                type: 'complete',
                data: extractedData
            });

        } catch (error) {
            console.error("Error during file processing:", error);
            parentWindow.webContents.send('upload-progress', { 
                type: 'error', 
                message: error.message 
            });
        }
    }

    async handleRequestLetterUpload(event) {
        const parentWindow = require('electron').BrowserWindow.fromWebContents(event.sender);
        if (!parentWindow) return;

        try {
            const filePath = await this.fileService.selectFile(
                "Select Request Letter PDF",
                "Upload and Process",
                [{ name: 'PDF Documents', extensions: ['pdf'] }]
            );

            if (!filePath) {
                parentWindow.webContents.send('request-progress', { type: 'cancel' });
                return;
            }

            // Update progress: Starting file read
            parentWindow.webContents.send('request-progress', { 
                type: 'progress',
                stage: 'reading',
                message: 'Reading PDF file...',
                progress: 0
            });

            const rawText = await this.fileService.readPDFFile(filePath);

            // Update progress: PDF read complete
            parentWindow.webContents.send('request-progress', { 
                type: 'progress',
                stage: 'preparing',
                message: 'Preparing for analysis...',
                progress: 25
            });

            const userProfile = await this.userProfileService.loadUserProfile();
            const apiKey = userProfile?.apiKey;
            if (!apiKey) throw new Error("Gemini API Key not found. Please set it in your User Profile.");
            
            this.aiService.initialize(apiKey);

            // Update progress: Starting AI processing
            parentWindow.webContents.send('request-progress', { 
                type: 'progress',
                stage: 'processing',
                message: 'Analyzing document with AI...',
                progress: 50
            });

            const extractedRequests = await this.aiService.extractRequests(rawText);
            
            // Update progress: AI processing complete
            parentWindow.webContents.send('request-progress', { 
                type: 'progress',
                stage: 'finalizing',
                message: 'Finalizing results...',
                progress: 75
            });

            parentWindow.webContents.send('request-progress', { 
                type: 'complete',
                data: extractedRequests
            });

        } catch (error) {
            console.error("Error during request letter processing:", error);
            parentWindow.webContents.send('request-progress', { 
                type: 'error', 
                message: error.message 
            });
        }
    }

    async handleGenerateLetterSection(event, data) {
        const parentWindow = require('electron').BrowserWindow.fromWebContents(event.sender);
        if (!parentWindow) return;

        try {
            const userProfile = await this.userProfileService.loadUserProfile();
            const apiKey = userProfile?.apiKey;
            if (!apiKey) throw new Error("Gemini API Key not found. Please set it in your User Profile.");
            
            this.aiService.initialize(apiKey);

            let logMessage = '';
            
            switch (data.type) {
                case 'header':
                    logMessage = 'Generating letter header...';
                    break;

                case 'request':
                    logMessage = `Processing Request #${data.request.id}...`;
                    break;

                case 'conclusion':
                    logMessage = 'Generating conclusion section...';
                    break;
                    
                default:
                    throw new Error('Invalid section type');
            }

            parentWindow.webContents.send('letter-progress', { type: 'section-start', section: data.type, message: logMessage });
            const html = await this.aiService.generateLetterSection(data, userProfile);
            parentWindow.webContents.send('letter-progress', { type: 'section-complete', section: data.type, html: html });
            return { success: true, html };

        } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', `Error: ${error.message}`);
            parentWindow.webContents.send('letter-progress', { type: 'error', section: data.type, error: error.message });
            return { success: false, error: error.message };
        }
    }
}

module.exports = IPCHandlers; 