// main.js

// 1. Module Imports
const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // Add dialog
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require('fs'); // Add Node.js file system module
const pdf = require('pdf-parse'); // Add the new library

// In main.js, REPLACE the old standardResponses object with this new one:

const objectionLibrary = {
  "vague": {
    argument: "The objection is a conclusory boilerplate allegation. A party objecting on the grounds of vagueness must explain the specific ways in which a request is vague.",
    cases: [
      "See, e.g., Moss v. Blue Cross & Blue Shield of Kan., Inc., 241 F.R.D. 683, 696 (D.Kan.2007)",
      "Milinazzo v. State Farm Ins. Co., 247 F.R.D. 691, 695 (S.D.Fla.2007)"
    ]
  },
  "overly broad": {
    argument: "The objection is a conclusory boilerplate allegation. A party opposing discovery as allegedly overbroad bears the burden of showing why discovery should be denied.",
    cases: [
      "See SEC v. Brady, 238 F.R.D. 429, 437 (N.D.Tex.2006)"
    ]
  },
  "overburdensome": {
    argument: "The objection is a conclusory boilerplate allegation without any factual showing to support the claim of burdensomeness. Courts must balance the burden against the benefit of the discovery.",
    cases: [
      "See, e.g., Hoffman v. United Telecommunications, Inc., 117 F.R.D. 436, 438 (D.Kan.1987)"
    ]
  },
  "qualified response": {
    argument: "The use of a 'subject to and without waiving' qualified response is an improper practice prohibited by the rules of procedure, as such responses are confusing, misleading, and waive the objections.",
    cases: [
      "See Fay Avenue Properties, LLC v. Travelers Property Casualty Companies of America, 2014 WL 12570974, at *1 (S.D. Cal. 2014)",
      "Herrera v. AllianceOne Receivable Mgmt., Inc., 2016 WL 1182751, at *3 (S.D. Cal. Mar. 28, 2016)"
    ]
  },
  "work product": {
    argument: "The objection improperly asserts the work product doctrine without providing a privilege log or establishing that the information was prepared in anticipation of litigation.",
    cases: [
      "See Rogers v. Giurbino, 288 F.R.D. 469, 487 (S.D. Cal. 2012) ('general boilerplate objections are insufficient')"
    ]
  },
  "privileged": {
    argument: "The objection improperly asserts a privilege without providing a privilege log or providing one that is insufficient under the rules.",
    cases: [] // You can add specific privilege cases here
  },
  // Add other objections from your list here in the same format
  "irrelevant": {
    argument: "The objection is a conclusory boilerplate allegation. Plaintiff has met the threshold burden for relevance.",
    cases: []
  },
  "unclassifiable": { // The fallback
    argument: "A general persuasive argument is required.",
    cases: []
  }
};


// Load environment variables from .env file
require('dotenv').config();


// In main.js, add this new function

// In main.js, replace the entire upload function

async function handleUploadAndProcess(event, requestsFromUI) {
  console.log("Main process: Starting file upload and processing...");

  // 1. Open File Dialog
  // The corrected call inside the handleUploadAndProcess function
  const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Opponent's Response PDF",
      buttonLabel: "Upload and Process",
      properties: ['openFile'],
      filters: [
          { name: 'PDF Documents', extensions: ['pdf'] }
      ]
  });

  if (canceled || filePaths.length === 0) {
      return { success: false, error: "File selection canceled." };
    }
    const filePath = filePaths[0];

    try {
      // 2. Read and Parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      const rawText = pdfData.text;

      // 3. Initialize AI
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not found.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // --- NEW LOGIC: Process requests one by one ---
      const extractedData = [];
      for (const request of requestsFromUI) {
        console.log(`AI is now searching for the response to Request #${request.id}`);
        

        // In main.js, inside the handleUploadAndProcess loop

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
        
        // Clean up the AI's response to ensure it's valid JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedObject = JSON.parse(jsonMatch[0]);
          if (extractedObject.objection) { // Only add if an objection was actually found
              extractedData.push(extractedObject);
              console.log(`Successfully extracted objection for Request #${extractedObject.id}`);
          }
        }
      }
      
      console.log("AI extraction complete. Final data:", extractedData);
      return { success: true, data: extractedData };

    } catch (error) {
      console.error("Error during file processing:", error);
      return { success: false, error: error.message };
    }
}




async function handleAskGemini(event, { requestText, objectionText }) {
  console.log("Main process: Generating final response with full legal argument structure...");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Your working model

    // --- Create the "Rulebook with Case Law" for the AI ---
    let rulesForAI = "";
    for (const key in objectionLibrary) {
        if (key !== "unclassifiable") {
            const rule = objectionLibrary[key];
            const caseList = rule.cases.length > 0 ? ` Relevant cases include: ${rule.cases.join('; ')}.` : '';
            rulesForAI += `Rule for objections about "${key}": The core argument is: "${rule.argument}"${caseList}\n\n`;
        }
    }

    // --- THE DEFINITIVE PROMPT ---
    const finalPrompt = `
      You are an expert legal assistant AI. Your task is to draft a single, persuasive paragraph refuting an opponent's discovery objection. You must follow a specific three-part structure.

      --- RULEBOOK & STYLE GUIDE ---
      ${rulesForAI}
      --- END OF GUIDE ---

      --- CURRENT DISPUTE ---
      - Plaintiff's Request: "${requestText}"
      - Defendant's Objection: "${objectionText}"
      --- END OF DISPUTE ---

      INSTRUCTIONS FOR YOUR RESPONSE:
      Your final paragraph MUST be structured in the following three parts:
      1.  **State the Legal Principle:** Begin by identifying the single most relevant rule from the RULEBOOK and stating its core legal argument. You MUST cite a relevant case from the rulebook if one is available.
      2.  **Apply the Principle to the Facts:** Immediately after stating the principle, explain WHY the Defendant's Objection is improper in the context of the specific Plaintiff's Request. For example, explain how the request is actually narrow, not vague, or how the objection lacks a factual basis.
      3.  **Demand Action:** Conclude the paragraph with a clear instruction to the opponent, such as "Please supplement your response" or "Please provide a good faith objection or produce the requested documents."

      Do NOT use meta-commentary. Output ONLY the final, structured legal paragraph.
    `;
    
    // Make the single API call
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const finalText = response.text();

    return { success: true, text: finalText };

  } catch (error) {
    console.error("Error in definitive handleAskGemini flow:", error);
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
ipcMain.handle('upload-and-process', handleUploadAndProcess); // <-- ADD THIS LINE

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