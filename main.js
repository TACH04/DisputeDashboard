// main.js

// 1. Module Imports
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require('fs');
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
  const totalRequests = requestsFromUI.length;

  parentWindow.webContents.send('upload-progress', { type: 'start', total: totalRequests });

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const rawText = pdfData.text;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let completedCount = 0;
    for (const request of requestsFromUI) {
      const extractionPrompt = `
        You are an AI data extraction expert. Your task is to find the "RESPONSE" to a specific interrogatory in a legal document and extract ONLY the text of that response.
        --- Raw Text from Opponent's Document ---
        ${rawText}
        --- End of Raw Text ---
        --- Specific Request to Find ---
        Find the section that responds to Interrogatory Number ${request.id}.
        --- End of Specific Request ---
        INSTRUCTIONS:
        1.  Locate the section for Interrogatory Number ${request.id} in the "Raw Text".
        2.  Find the "RESPONSE:" or "Objection." label that follows it.
        3.  **Extract ONLY the text that comes AFTER that label.** Do NOT include the original interrogatory text.
        4.  Return a single JSON object with two keys: "id" (the number ${request.id}) and "objection" (the extracted response/objection text as a string).
        5.  If no response is found, return an object where "objection" is null.
        Provide ONLY the single JSON object as your response.
      `;
      const result = await model.generateContent(extractionPrompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      completedCount++;
      if (jsonMatch) {
        const extractedObject = JSON.parse(jsonMatch[0]);
        if (extractedObject.objection) {
          parentWindow.webContents.send('upload-progress', {
            type: 'progress',
            data: extractedObject,
            current: completedCount
          });
        }
      }
    }
    
    parentWindow.webContents.send('upload-progress', { type: 'complete' });

  } catch (error) {
    console.error("Error during file processing:", error);
    parentWindow.webContents.send('upload-progress', { type: 'error', message: error.message });
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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
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
};

ipcMain.handle('ask-gemini', handleAskGemini);
ipcMain.handle('upload-and-process', handleUploadAndProcess);

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