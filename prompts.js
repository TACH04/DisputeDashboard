// Extraction prompt for processing uploaded responses
exports.extractionPrompt = (requestsFormatted, rawText) => `
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

// Deconstructor prompt for analyzing objections
exports.deconstructorPrompt = (objectionText, objectionLibraryKeys) => `
  Analyze the following legal objection text. Identify every distinct legal objection made from the following list: [${objectionLibraryKeys}].
  Return your findings as a JSON array of strings. For example: ["vague", "overly broad", "work product"].
  Do not explain yourself. Respond ONLY with the JSON array.

  Objection Text to Analyze: "${objectionText}"
`;

// Drafter prompt for generating refutation paragraphs
exports.drafterPrompt = (objectionKey, rule, requestText, objectionText, contextText) => `
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

// Request extraction prompt for processing request letters
exports.requestExtractionPrompt = (rawText) => `
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

// Letter section prompts
exports.headerPrompt = (data, userProfile) => `
  Generate an HTML header for a formal legal discovery dispute letter using the provided CSS classes.

  **Data:**
  - Date: "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"
  - Recipient Emails: ${JSON.stringify(data.recipientEmails)}
  - Case Caption: "${data.caseCaption}"
  - Case Info: "${data.caseInfo}"
  - Salutation Names: "${data.salutationNames}"
  - Introduction Text: You have received Defendants Wexford's Response to Plaintiff's First Set of Interrogatories dated ${data.responseDate}. This letter addresses several perceived deficiencies in the Response. Under LR Civ. P. 37.1, this letter gives a detailed description of the deficiencies and seeks voluntary compliance.

  **HTML Structure to Generate:**
  <div class="letter-header">
      <p class="law-firm-name">${userProfile.firmName}</p>
      <p class="law-firm-details">${userProfile.firmAddress}<br>${userProfile.firmContact}<br>Web: ${userProfile.firmWeb}</p>
  </div>
  <div class="letter-meta">
      <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <br>
      <p class="via-email">VIA EMAIL ONLY:</p>
      <p>${data.recipientEmails.join('<br>')}</p>
  </div>
  <div class="re-block">
      <p><b>RE:</b>     <b>Discovery Dispute</b></p>
      <p>          <i>${data.caseCaption}</i></p>
      <p>          ${data.caseInfo}</p>
  </div>
  <div class="letter-body">
      <p class="no-indent">Dear ${data.salutationNames}:</p>
      <p>You have received Defendants Wexford's Response to Plaintiff's First Set of Interrogatories dated ${data.responseDate}. This letter addresses several perceived deficiencies in the Response. Under LR Civ. P. 37.1, this letter gives a detailed description of the deficiencies and seeks voluntary compliance.</p>
      <h3 class="interrogatory-title" style="text-align: center; margin-top: 2em;">Interrogatories:</h3>
  </div>
  
  Return ONLY the complete, raw HTML for this entire header section. Do not wrap it in markdown.
`;

exports.requestPrompt = (data) => `
  Generate an HTML section for a single discovery request rebuttal using the provided CSS classes.

  **Data:**
  - Request Number: ${data.request.id}
  - Request Topic: "${data.requestTopic}"
  - Opponent's Response (to be quoted): "${data.request.objection}"
  - Our Rebuttal/Reply (HTML formatted): "${data.request.reply}"
  
  **HTML Structure to Generate:**
  <div class="interrogatory-section">
      <h3 class="interrogatory-title">Interrogatory Number ${data.request.id}</h3>
      <div class="letter-body">
          <p class="no-indent">We asked for information about ${data.requestTopic}. You asserted various objections, which I will discuss in turn, but then answered the Interrogatory as stated:</p>
          <div class="response-quote">
              <p class="no-indent">${data.request.objection.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="legal-argument">
             ${data.request.reply}
          </div>
      </div>
  </div>

  Return ONLY the raw HTML for this single request section.
`;

exports.conclusionPrompt = (userProfile) => `
  Generate an HTML conclusion for a formal legal letter using the provided CSS classes.

  **Data:**
  - Attorney Name: "${userProfile.attorneyName}"
  - Attorney Initials: "${userProfile.attorneyInitials}"
  - Closing Line: "I look forward to receiving your supplemental discovery responses by the close of business on June 7, 2024."
  
  **HTML Structure to Generate:**
  <div class="letter-body">
    <p>I look forward to receiving your supplemental discovery responses by the close of business on June 7, 2024.</p>
  </div>
  <div class="signature-block">
      <p>Sincerely yours,</p>
      <p>${userProfile.firmName}</p>
      <br><br><br><br>
      <p>${userProfile.attorneyName}</p>
      <br>
      <p>${userProfile.attorneyInitials}/km</p>
  </div>
`; 