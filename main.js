// main.js

// 1. Module Imports
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const pdf = require('pdf-parse');

const objectionLibrary = {
  "qualified response": {
    argument: "Responses to discovery requests that are 'subject to' and 'without waiving objections' are improper, confusing, misleading, and without basis in the Federal Rules of Civil Procedure, and waive the objections.",
    cases: [
      "Fay Avenue Properties, LLC v. Travelers Property Casualty Companies of America, 2014 WL 12570974, at *1 (S.D. Cal. 2014)",
      "Herrera v. AllianceOne Receivable Mgmt., Inc., 2016 WL 1182751, at *3 (S.D. Cal. Mar. 28, 2016)"
    ]
  },
  "multiple subparts": {
    argument: "Not all subparts are 'discrete subparts' under Rule 33(a)(1). Interrogatory subparts are to be counted as one interrogatory if they are logically or factually subsumed within and necessarily related to the primary question.",
    cases: [
      "Trevino v. ACB American Inc., 232 F.R.D. 612, 614 (N.D. Cal. 2006)"
    ]
  },
  "vague": {
    argument: "A party making a vagueness objection bears the burden to show such vagueness or ambiguity by demonstrating that more than 'mere reason and common sense' is needed to attribute ordinary definitions to the terms.",
    cases: [
      "Moss v. Blue Cross & Blue Shield of Kan., Inc., 241 F.R.D. 683, 696 (D.Kan.2007)"
    ]
  },
  "not limited in time or scope": {
    argument: "The objection is a conclusory boilerplate allegation. The request is appropriately limited to the relevant time period and subject matter of the litigation.",
    cases: []
  },
  "third party custody": {
    argument: "This is an invalid objection. Rule 33 imposes a duty on the responding party to secure all information available to it, including information possessed by its officers, agents, and in some cases, corporate subsidiaries.",
    cases: [
      "Thomas v. Cate, 715 F. Supp. 2d 1012, 1032 (E.D. Cal. 2010)",
      "General Dynamics Corp. v. Selb Mfg. Co., 481 F.2d 1204, 1211 (8th Cir.1973)"
    ]
  },
  "overly broad": {
    argument: "A party opposing discovery as allegedly overbroad bears the burden of showing why discovery should be denied. A conclusory allegation is insufficient.",
    cases: [
      "SEC v. Brady, 238 F.R.D. 429, 437 (N.D.Tex.2006)"
    ]
  },
  "premature/early discovery": {
    argument: "A party must respond to interrogatories based on the information presently available and has an obligation to review appropriate materials and respond to the fullest extent possible. A reasonable effort to respond must be made.",
    cases: [
      "Fredrics v. City of Scottsdale, 2022 WL 60546, at *1 (D. Ariz. Jan. 6, 2022)"
    ]
  },
  "unduly burdensome": {
    argument: "To sustain an 'unduly burdensome' objection, a party must provide a factual basis for the claim. Courts must balance the burden on the interrogated party against the benefit to the discovering party.",
    cases: [
      "Hoffman v. United Telecommunications, Inc., 117 F.R.D. 436, 438 (D.Kan.1987)"
    ]
  },
  "work product": {
    argument: "General boilerplate objections are insufficient to assert the work product doctrine. A party must establish that the information it seeks to withhold was prepared in anticipation of litigation and provide a privilege log.",
    cases: [
      "Rogers v. Giurbino, 288 F.R.D. 469, 487 (S.D. Cal. 2012)"
    ]
  },
  "unclassifiable": { // Fallback
    argument: "A general persuasive argument is required.",
    cases: []
  }
};


require('dotenv').config();

// Data storage configuration
const DATA_DIR = path.join(app.getPath('userData'), 'case_data');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const CURRENT_DATA_VERSION = '1.0';

// Ensure data directories exist
async function initializeDataDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        console.log('Data directories initialized');
    } catch (error) {
        console.error('Error initializing data directories:', error);
    }
}

// Data versioning and backup
async function createBackup(caseId) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `${caseId}_${timestamp}.json`);
        const caseData = await loadCaseData(caseId);
        await fs.writeFile(backupPath, JSON.stringify(caseData, null, 2));
        
        // Keep only last 5 backups per case
        const backups = await fs.readdir(BACKUP_DIR);
        const caseBackups = backups.filter(f => f.startsWith(caseId));
        if (caseBackups.length > 5) {
            const oldestBackup = caseBackups.sort()[0];
            await fs.unlink(path.join(BACKUP_DIR, oldestBackup));
        }
    } catch (error) {
        console.error(`Error creating backup for case ${caseId}:`, error);
    }
}

// Save case data
async function saveCaseData(caseData) {
    try {
        const filePath = path.join(DATA_DIR, `${caseData.caseId}.json`);
        const dataToSave = {
            version: CURRENT_DATA_VERSION,
            lastModified: new Date().toISOString(),
            data: caseData
        };
        await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
        await createBackup(caseData.caseId);
        return true;
    } catch (error) {
        console.error('Error saving case data:', error);
        return false;
    }
}

// Load case data
async function loadCaseData(caseId) {
    try {
        const filePath = path.join(DATA_DIR, `${caseId}.json`);
        const rawData = await fs.readFile(filePath, 'utf8');
        const savedData = JSON.parse(rawData);
        
        // Handle data version migrations if needed
        if (savedData.version !== CURRENT_DATA_VERSION) {
            // Implement version migration logic here
            console.log(`Data migration needed from ${savedData.version} to ${CURRENT_DATA_VERSION}`);
        }
        
        return savedData.data;
    } catch (error) {
        console.error('Error loading case data:', error);
        return null;
    }
}

// Load all cases
async function loadAllCases() {
    try {
        const files = await fs.readdir(DATA_DIR);
        const caseFiles = files.filter(f => f.endsWith('.json'));
        const cases = await Promise.all(
            caseFiles.map(async file => {
                const caseId = path.basename(file, '.json');
                return await loadCaseData(caseId);
            })
        );
        return cases.filter(Boolean); // Remove any null results
    } catch (error) {
        console.error('Error loading all cases:', error);
        return [];
    }
}

// IPC handlers for data operations
ipcMain.handle('save-case', async (event, caseData) => {
    return await saveCaseData(caseData);
});

ipcMain.handle('load-case', async (event, caseId) => {
    return await loadCaseData(caseId);
});

ipcMain.handle('load-all-cases', async () => {
    return await loadAllCases();
});

async function handleUploadAndProcess(event, requestsFromUI) {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (!parentWindow) return;

  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: "Select Opponent's Response PDF",
    buttonLabel: "Upload and Process",
    properties: ['openFile'],
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  parentWindow.focus();

  if (canceled || filePaths.length === 0) {
    parentWindow.webContents.send('upload-progress', { type: 'cancel' });
    return;
  }
  
  const filePath = filePaths[0];

  try {
    // Phase 1: Reading PDF (0-20%)
    parentWindow.webContents.send('upload-progress', { 
      type: 'progress',
      stage: 'reading',
      message: 'Reading PDF file...',
      progress: 0
    });

    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    const rawText = pdfData.text;

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

    const extractionPrompt = `
      You are an AI data extraction expert. Your task is to find objections to specific interrogatory requests in a legal document.

      --- Original Requests ---
      ${requestsFormatted}
      --- End of Original Requests ---

      --- Raw Text from Opponent's Response Document ---
      ${rawText}
      --- End of Raw Text ---

      INSTRUCTIONS:
      1. For each numbered request above, find the corresponding objection/response in the opponent's document.
      2. Return a JSON array of objects, where each object has:
         - "id": the request number (as a number)
         - "objection": the complete text of the objection/response for that specific request
      3. If no objection is found for a request, set "objection" to null
      4. Ensure each objection is matched to the correct request number
      5. Include ONLY the actual objection text, not the original request text
      6. Maintain the exact wording of each objection
      7. IMPORTANT: If you cannot find ANY objections in the document, return {"error": "No objections found in document"}

      Return ONLY the JSON array or error object.
    `;

    // Update progress during AI processing
    const progressUpdates = [
      { progress: 45, message: 'Analyzing document structure...' },
      { progress: 55, message: 'Identifying request sections...' },
      { progress: 65, message: 'Locating objection responses...' },
      { progress: 75, message: 'Extracting objection text...' },
      { progress: 85, message: 'Finalizing matches...' }
    ];

    let currentUpdateIndex = 0;
    const progressInterval = setInterval(() => {
      if (currentUpdateIndex < progressUpdates.length) {
        const update = progressUpdates[currentUpdateIndex];
        parentWindow.webContents.send('upload-progress', {
          type: 'progress',
          stage: 'processing',
          message: update.message,
          progress: update.progress
        });
        currentUpdateIndex++;
      }
    }, 2000);

    const result = await model.generateContent(extractionPrompt);
    clearInterval(progressInterval);

    // Phase 4: Final Processing (85-100%)
    parentWindow.webContents.send('upload-progress', { 
      type: 'progress',
      stage: 'finalizing',
      message: 'Processing extracted objections...',
      progress: 85
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Check if we got an error response
      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      // Check if we found any actual objections
      const hasAnyObjections = extractedData.some(item => item.objection !== null && item.objection.trim() !== '');
      if (!hasAnyObjections) {
        throw new Error("No objections found in the uploaded document. Please check that you've uploaded the correct response document.");
      }

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
    } else {
      throw new Error("Failed to extract objections from the document.");
    }

  } catch (error) {
    console.error("Error during file processing:", error);
    parentWindow.webContents.send('upload-progress', { 
      type: 'error', 
      message: error.message 
    });
  }
}

async function handleAskGemini(event, { requestText, objectionText, contextText}) {
  console.log("Main process: Starting Deconstructor/Drafter pipeline...");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const deconstructorPrompt = `
      Analyze the following legal objection text. Identify every distinct legal objection made from the following list: [${Object.keys(objectionLibrary).join(", ")}].
      Return your findings as a JSON array of strings. For example: ["vague", "overly broad", "work product"].
      Do not explain yourself. Respond ONLY with the JSON array.

      Objection Text to Analyze: "${objectionText}"
    `;
    console.log("Deconstructor: Identifying objection types...");
    const deconstructorResult = await model.generateContent(deconstructorPrompt);
    const deconstructorResponseText = deconstructorResult.response.text();
    const jsonMatch = deconstructorResponseText.match(/\[.*\]/s);
    if (!jsonMatch) throw new Error("Deconstructor AI failed to return a valid JSON array.");
    const identifiedObjections = JSON.parse(jsonMatch[0]);
    console.log(`Deconstructor: Found objections: ${identifiedObjections.join(', ')}`);

    console.log("Drafter: Generating individual refutation paragraphs...");
    const draftPromises = identifiedObjections.map(objectionKey => {
      const rule = objectionLibrary[objectionKey] || objectionLibrary["unclassifiable"];
      const drafterPrompt = `
              You are an expert legal assistant AI. Your task is to draft a single, persuasive paragraph refuting a specific discovery objection, following a precise chain of thought.
              
              --- RULE TO APPLY ---
              - Objection Type: "${objectionKey}"
              - Core Argument: "${rule.argument}"
              - Relevant Cases: [${rule.cases.join(", ")}]
              --- END OF RULE ---

              --- DISPUTE CONTEXT ---
              - Plaintiff's Request: "${requestText}"
              - Full Text of Defendant's Objection: "${objectionText}"
              --- END OF CONTEXT ---

              --- ADDITIONAL USER-PROVIDED CONTEXT TO CONSIDER ---
              ${contextText ? contextText : "None provided."}
              --- END OF ADDITIONAL CONTEXT ---

              INSTRUCTIONS:
              1.  **Integrate Context:** Carefully consider the "ADDITIONAL USER-PROVIDED CONTEXT". If it contains specific facts or case law, prioritize using it to make your argument more specific and powerful.
              2.  **State the Law:** Begin by stating the Core Argument for the specified Objection Type. You MUST cite one or more of the Relevant Cases if provided, or cases from the user's context.
              3.  **Apply to Facts:** Immediately after, explain WHY the Defendant's Objection is improper in the context of the specific Plaintiff's Request, directly refuting their reasoning. Use details from the user context if available.
              4.  **Demand Action:** Conclude the paragraph with a professional instruction, like "Please supplement your response."
              5.  **Final Output:** Provide ONLY the single, complete legal paragraph.
              
              Draft the paragraph now.
            `;
      return model.generateContent(drafterPrompt).then(result => ({
          key: objectionKey,
          paragraph: result.response.text()
      }));
    });

    const draftedReplies = await Promise.all(draftPromises);
    console.log(`Drafter: Successfully generated ${draftedReplies.length} structured replies.`);

    const finalHtmlResponse = draftedReplies.map(reply => {
        const safeParagraph = reply.paragraph
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;")
          .replace(/\n/g, '<br>');

        
        const header = `<strong>Refuting: '${reply.key}'</strong>`;
        
        return `<p>${header}<br>${safeParagraph}</p>`;
    }).join('<hr style="margin: 16px 0; border: none; border-top: 1px solid #dee2e6;">');

    return { success: true, html: finalHtmlResponse };

  } catch (error) {
    console.error("Error in Deconstructor/Drafter pipeline:", error);
    return { success: false, error: error.message };
  }
}

async function handleRequestLetterUpload(event) {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (!parentWindow) return;

  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: "Select Request Letter PDF",
    buttonLabel: "Upload and Process",
    properties: ['openFile'],
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  parentWindow.focus();

  if (canceled || filePaths.length === 0) {
    parentWindow.webContents.send('request-progress', { type: 'cancel' });
    return;
  }
  
  const filePath = filePaths[0];

  try {
    // Update progress: Starting file read
    parentWindow.webContents.send('request-progress', { 
      type: 'progress',
      stage: 'reading',
      message: 'Reading PDF file...',
      progress: 0
    });

    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    const rawText = pdfData.text;

    // Update progress: PDF read complete
    parentWindow.webContents.send('request-progress', { 
      type: 'progress',
      stage: 'preparing',
      message: 'Preparing for analysis...',
      progress: 25
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Update progress: Starting AI processing
    parentWindow.webContents.send('request-progress', { 
      type: 'progress',
      stage: 'processing',
      message: 'Analyzing document with AI...',
      progress: 50
    });

    const extractionPrompt = `
      You are an AI data extraction expert. Your task is to extract interrogatory requests from a legal document.
      
      --- Raw Text from Request Document ---
      ${rawText}
      --- End of Raw Text ---
      
      INSTRUCTIONS:
      1. Find all interrogatory requests in the document.
      2. For each request:
         - Extract the request number
         - Extract the complete text of the request
      3. Return a JSON array of objects, where each object has:
         - "id": the request number (as a number)
         - "text": the complete text of the request
      4. Include ONLY actual interrogatory requests.
      5. Maintain the exact wording of each request.
      
      Return ONLY the JSON array.
    `;

    const result = await model.generateContent(extractionPrompt);
    
    // Update progress: AI processing complete
    parentWindow.webContents.send('request-progress', { 
      type: 'progress',
      stage: 'finalizing',
      message: 'Finalizing results...',
      progress: 75
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const extractedRequests = JSON.parse(jsonMatch[0]);
      parentWindow.webContents.send('request-progress', { 
        type: 'complete',
        data: extractedRequests
      });
    } else {
      throw new Error("Failed to extract requests from the document.");
    }

  } catch (error) {
    console.error("Error during request letter processing:", error);
    parentWindow.webContents.send('request-progress', { 
      type: 'error', 
      message: error.message 
    });
  }
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

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

ipcMain.handle('ask-gemini', handleAskGemini);
ipcMain.handle('upload-and-process', handleUploadAndProcess);
ipcMain.handle('upload-request-letter', handleRequestLetterUpload);

// Save all cases
async function saveAllCases(cases) {
  try {
    await Promise.all(cases.map(caseData => saveCaseData(caseData)));
    return true;
  } catch (error) {
    console.error('Error saving all cases:', error);
    return false;
  }
}

// Handle saving data before quit
async function handleBeforeQuit(cases) {
  await saveAllCases(cases);
}

app.whenReady().then(async () => {
  await initializeDataDirectories();
  const mainWindow = createWindow();

  // Set up periodic autosave (every 5 minutes)
  setInterval(async () => {
    try {
      const cases = await mainWindow.webContents.executeJavaScript('appData.cases');
      await saveAllCases(cases);
      console.log('Autosave completed');
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }, 5 * 60 * 1000);

  // Save data when window is closed
  mainWindow.on('close', async (e) => {
    e.preventDefault(); // Prevent the window from closing immediately
    const webContents = mainWindow.webContents;
    const cases = await webContents.executeJavaScript('appData.cases');
    await handleBeforeQuit(cases);
    mainWindow.destroy(); // Now close the window
  });

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