// main.js

// 1. Module Imports
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const pdf = require('pdf-parse');
const docx = require('docx');
const html2pdf = require('html-pdf');
const PDFDocument = require('pdfkit');
const mammoth = require('mammoth');

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

// User profile storage
const USER_PROFILE_FILE = path.join(app.getPath('userData'), 'user_profile.json');

// Ensure data directories exist
async function initializeDataDirectories() {
    try {
        await fs.promises.mkdir(DATA_DIR, { recursive: true });
        await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
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
        await fs.promises.writeFile(backupPath, JSON.stringify(caseData, null, 2));
        
        // Keep only last 5 backups per case
        const backups = await fs.promises.readdir(BACKUP_DIR);
        const caseBackups = backups.filter(f => f.startsWith(caseId));
        if (caseBackups.length > 5) {
            const oldestBackup = caseBackups.sort()[0];
            await fs.promises.unlink(path.join(BACKUP_DIR, oldestBackup));
        }
    } catch (error) {
        console.error(`Error creating backup for case ${caseId}:`, error);
    }
}

// Save case data
async function saveCaseData(caseData) {
    try {
        const caseDir = path.join(DATA_DIR, caseData.caseId);
        if (!fs.existsSync(caseDir)) {
            fs.mkdirSync(caseDir, { recursive: true });
        }

        // Save main case data
        const caseFile = path.join(caseDir, 'case.json');
        await fs.promises.writeFile(caseFile, JSON.stringify(caseData, null, 2));

        // Save version history if it exists
        if (caseData.letterVersions && caseData.letterVersions.length > 0) {
            const versionsDir = path.join(caseDir, 'versions');
            if (!fs.existsSync(versionsDir)) {
                fs.mkdirSync(versionsDir, { recursive: true });
            }

            // Save each version in a separate file
            for (const version of caseData.letterVersions) {
                const versionFile = path.join(versionsDir, `${version.id}.json`);
                await fs.promises.writeFile(versionFile, JSON.stringify(version, null, 2));
            }
        }

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
        const caseDir = path.join(DATA_DIR, caseId);
        const caseFile = path.join(caseDir, 'case.json');
        
        if (!fs.existsSync(caseFile)) {
            return null;
        }

        // Load main case data
        const caseData = JSON.parse(await fs.promises.readFile(caseFile, 'utf8'));

        // Load version history if it exists
        const versionsDir = path.join(caseDir, 'versions');
        if (fs.existsSync(versionsDir)) {
            const versionFiles = await fs.promises.readdir(versionsDir);
            caseData.letterVersions = [];
            
            for (const file of versionFiles) {
                if (file.endsWith('.json')) {
                    const versionFile = path.join(versionsDir, file);
                    const version = JSON.parse(await fs.promises.readFile(versionFile, 'utf8'));
                    caseData.letterVersions.push(version);
                }
            }

            // Sort versions by timestamp
            caseData.letterVersions.sort((a, b) => b.id - a.id);
        }

        return caseData;
    } catch (error) {
        console.error('Error loading case data:', error);
        return null;
    }
}

// Load all cases
async function loadAllCases() {
    try {
        const files = await fs.promises.readdir(DATA_DIR);
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

    const dataBuffer = await fs.promises.readFile(filePath);
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

    const dataBuffer = await fs.promises.readFile(filePath);
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

async function handleGenerateResponseLetter(event, { caseName, letterDescription, requests }) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const letterPrompt = `
      You are a legal assistant tasked with drafting a formal discovery dispute letter. Format the letter using the following structure:

      1. Header with current date, law firm info (use placeholder), and recipient info (use placeholder)
      2. Re: line with case name and letter description
      3. Opening paragraph introducing the letter's purpose
      4. For each discovery request:
         - Request number and text
         - Opponent's objection
         - Our response/reply
      5. Closing paragraph requesting supplemental responses
      6. Signature block (use placeholder)

      Case Information:
      - Case Name: ${caseName}
      - Letter Description: ${letterDescription}
      
      Requests to Include:
      ${JSON.stringify(requests, null, 2)}

      Return the letter in HTML format with appropriate styling. Use semantic HTML elements and inline CSS for formatting.
    `;

    const result = await model.generateContent(letterPrompt);
    const letterHtml = result.response.text();

    return { success: true, html: letterHtml };
  } catch (error) {
    console.error("Error generating response letter:", error);
    return { success: false, error: error.message };
  }
}

async function handleExportLetter(event, { content, format, fileName }) {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (!parentWindow) return { success: false, error: "Window not found" };

  try {
    const { filePath } = await dialog.showSaveDialog(parentWindow, {
      title: 'Save Response Letter',
      defaultPath: fileName,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (!filePath) return { success: false, error: "Export cancelled" };

    if (format === 'pdf') {
      // Convert HTML to PDF
      const options = {
        format: 'Letter',
        border: {
          top: "1in",
          right: "1in",
          bottom: "1in",
          left: "1in"
        }
      };

      return new Promise((resolve, reject) => {
        html2pdf.create(content, options).toFile(filePath, (error) => {
          if (error) {
            reject({ success: false, error: error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    } else if (format === 'docx') {
      // Convert HTML to DOCX
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              children: [new docx.TextRun(content.replace(/<[^>]+>/g, ''))]
            })
          ]
        }]
      });

      const buffer = await docx.Packer.toBuffer(doc);
      await fs.promises.writeFile(filePath, buffer);
      return { success: true };
    }

    return { success: false, error: "Unsupported format" };
  } catch (error) {
    console.error("Error exporting letter:", error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle('generate-response-letter', handleGenerateResponseLetter);
ipcMain.handle('export-letter', handleExportLetter);

async function handleGenerateLetterSection(event, data) {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (!parentWindow) return;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = '';
    let logMessage = '';
    
    switch (data.type) {
      case 'header':
        logMessage = 'Generating letter header...';
        prompt = `
          Generate the header section of a formal legal discovery dispute letter. Include:
          1. Current date
          2. Law firm letterhead (use placeholder info)
          3. Recipient information (use placeholder)
          4. Re: line with "${data.caseName} - ${data.letterDescription}"
          5. Opening paragraph explaining this is a discovery dispute letter

          Return ONLY the HTML for this section. Use semantic HTML and inline CSS for proper legal document formatting.
        `;
        break;

      case 'request':
        logMessage = `Processing Request #${data.requestNumber}...`;
        prompt = `
          Generate a section for Request #${data.requestNumber} in a discovery dispute letter. Include:
          1. Request text: "${data.requestText}"
          2. Objection: "${data.objectionText}"
          3. Our Reply: "${data.replyText}"

          Format this as a properly numbered section with appropriate spacing and formatting.
          Return ONLY the HTML for this section. Use semantic HTML and inline CSS for proper legal document formatting.
        `;
        break;

      case 'conclusion':
        logMessage = 'Generating conclusion section...';
        prompt = `
          Generate the conclusion section of a discovery dispute letter. Include:
          1. Summary paragraph requesting supplemental responses
          2. Professional closing
          3. Signature block (use placeholder attorney information)
          4. Certificate of service (use placeholder)

          Return ONLY the HTML for this section. Use semantic HTML and inline CSS for proper legal document formatting.
        `;
        break;

      default:
        throw new Error('Invalid section type');
    }

    // Log to terminal
    console.log('\x1b[36m%s\x1b[0m', logMessage); // Cyan color for visibility

    // Send progress to renderer
    parentWindow.webContents.send('letter-progress', {
      type: 'section-start',
      section: data.type,
      message: logMessage
    });

    const result = await model.generateContent(prompt);
    const html = result.response.text();

    // Log completion
    console.log('\x1b[32m%s\x1b[0m', `✓ ${logMessage.replace('...', ' completed')}`); // Green color for success

    // Send completion to renderer
    parentWindow.webContents.send('letter-progress', {
      type: 'section-complete',
      section: data.type,
      html: html
    });

    return { success: true, html };
  } catch (error) {
    // Log error
    console.error('\x1b[31m%s\x1b[0m', `Error: ${error.message}`); // Red color for errors

    // Send error to renderer
    parentWindow.webContents.send('letter-progress', {
      type: 'error',
      section: data.type,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

// Add to your IPC handlers
ipcMain.handle('generate-letter-section', handleGenerateLetterSection);

async function handleSaveUserProfile(event, profileData) {
  try {
    await fs.promises.writeFile(USER_PROFILE_FILE, JSON.stringify(profileData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { success: false, error: error.message };
  }
}

async function handleLoadUserProfile() {
  try {
    if (fs.existsSync(USER_PROFILE_FILE)) {
      const data = await fs.promises.readFile(USER_PROFILE_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

// Add to your IPC handlers
ipcMain.handle('save-user-profile', handleSaveUserProfile);
ipcMain.handle('load-user-profile', handleLoadUserProfile);