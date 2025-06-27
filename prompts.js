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
  - Relevant Cases: [${Array.isArray(rule.cases) ? rule.cases.join(", ") : ""}]
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

// Enhanced letter section prompts based on exact Gemini analysis
exports.headerPrompt = (data, userProfile) => `
  Generate a professional legal letter header following exact formatting standards for US courts.

  **Data:**
  - Date: "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"
  - Recipient Emails: ${JSON.stringify(data.recipientEmails)}
  - Case Caption: "${data.caseCaption}"
  - Case Info: "${data.caseInfo}"
  - Salutation Names: "${data.salutationNames}"
  - Response Date: "${data.responseDate}"
  - User Profile: ${JSON.stringify(userProfile)}

  **Generate the complete HTML header section with this exact structure:**

  <header class="letterhead">
      <p class="letterhead-title">${userProfile.org || 'Law Offices of [Attorney Name]'}</p>
      <p class="contact-info">${userProfile.orgAddress || 'Address Line 1, City, State ZIP'}</p>
      <p class="contact-info">Voice: ${userProfile.phone || 'Phone'} • E-mail: ${userProfile.email || 'Email'}</p>
      ${userProfile.barNumber ? `<p class="contact-info">Bar Number: ${userProfile.barNumber}</p>` : ''}
  </header>

  <p class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="recipient-info">
      <p><strong>VIA EMAIL ONLY:</strong></p>
      ${Array.isArray(data.recipientEmails) ? data.recipientEmails.map(email => `<p>${email}</p>`).join('') : `<p>${data.recipientEmails}</p>`}
  </div>

  <div class="case-caption">
      <p>
          <span class="caption-label">RE:</span>
          <span class="caption-text">
              <strong>Discovery Dispute</strong><br>
              <em>${data.caseCaption}</em><br>
              ${data.caseInfo}
          </span>
      </p>
  </div>

  <p class="salutation">Dear ${data.salutationNames}:</p>

  <div class="main-body">
      <p>I have received Defendants' Response to Plaintiff's First Set of Interrogatories dated ${data.responseDate}. This letter addresses several perceived deficiencies in the Response. Under LR Civ. P. 37.1, this letter gives a detailed description of the deficiencies and seeks voluntary compliance.</p>
      
      <h2 class="interrogatory-heading">Interrogatories:</h2>
  </div>

  Return ONLY the complete, raw HTML for this entire header section. Do not wrap it in markdown or add any explanations.
`;

exports.requestPrompt = (data) => `
  Generate a professional legal interrogatory section following exact formatting standards.

  **Data:**
  - Request Number: ${data.request.id}
  - Request Topic: "${data.requestTopic || data.request.text.substring(0, 50) + '...'}"
  - Opponent's Response: "${data.request.objection}"
  - Our Rebuttal/Reply: "${data.request.reply}"
  
  **Generate the complete HTML section with this exact structure:**

  <h3 class="interrogatory-subheading">Interrogatory Number ${data.request.id}</h3>
  <p>We asked for information about ${data.requestTopic || data.request.text.substring(0, 50) + '...'}. You asserted various objections, which I will discuss in turn, but then answered the Interrogatory as stated:</p>
  
  <blockquote class="response-quote">
      <p class="no-indent">${data.request.objection.replace(/\n/g, '<br>')}</p>
  </blockquote>
  
  <div class="legal-argument">
      ${data.request.reply}
  </div>

  Return ONLY the raw HTML for this single request section. Do not wrap it in markdown or add any explanations.
`;

exports.conclusionPrompt = (userProfile) => `
  Generate a professional legal letter conclusion following exact formatting standards.

  **Data:**
  - Attorney Name: "${userProfile.name || 'Attorney Name'}"
  - Firm Name: "${userProfile.org || 'Law Offices of [Attorney Name]'}"
  - Signature Block: "${userProfile.signature || 'Sincerely yours,\\n\\n[Attorney Name]\\n[Firm Name]'}"
  - Closing Date: "June 7, 2024"
  
  **Generate the complete HTML conclusion with this exact structure:**

  <p class="conclusion">I look forward to receiving your supplemental discovery responses by the close of business on June 7, 2024.</p>
  
  <div class="signature-block">
      ${userProfile.signature ? userProfile.signature.replace(/\n/g, '<br>') : `
      <p>Sincerely yours,</p>
      <div class="signature-space"></div>
      <p>${userProfile.org || 'Law Offices of [Attorney Name]'}</p>
      <div class="signature-space"></div>
      <p>${userProfile.name || 'Attorney Name'}</p>
      `}
  </div>
  
  <p class="author-initials">${userProfile.name ? userProfile.name.split(' ').map(n => n[0]).join('') : 'AN'}/km</p>

  Return ONLY the raw HTML for this conclusion section. Do not wrap it in markdown or add any explanations.
`;

// New comprehensive letter generation prompt based on exact Gemini analysis
exports.completeLetterPrompt = (caseData, letterData, userProfile, extractRequestTopic) => `
  Generate a complete professional legal discovery dispute letter following exact US court formatting standards.

  **Case Information:**
  - Case Name: "${caseData.caseName}"
  - Case Number: "${caseData.caseData?.caseNumber || ''}"
  - Court: "${caseData.caseData?.court || ''}"
  - Letter Description: "${letterData.description}"
  - Response Date: "${letterData.responseDate || 'recent date'}"

  **User Profile (Use these exact values for letterhead and signature):**
  - Attorney Name: "${userProfile.name || 'Attorney Name'}"
  - Firm Name: "${userProfile.org || 'Law Offices of [Attorney Name]'}"
  - Firm Address: "${userProfile.orgAddress || 'Address'}"
  - Firm Phone: "${userProfile.phone || 'Phone'}"
  - Firm Email: "${userProfile.email || 'Email'}"
  - Bar Number: "${userProfile.barNumber || ''}"
  - Signature Block: "${userProfile.signature || 'Sincerely yours,\\n\\n[Attorney Name]\\n[Firm Name]'}"

  **Requests with Objections (${letterData.requests.filter(r => r.objection && r.reply).length} total):**
  ${letterData.requests.filter(r => r.objection && r.reply).map(request => {
      const requestTopic = extractRequestTopic ? extractRequestTopic(request.text) : request.text.substring(0, 50) + '...';
      return `Request ${request.id}: ${requestTopic}`;
  }).join('\n')}

  **Generate a complete legal letter with this exact structure:**

  <div class="letter-container">
      <!-- Letterhead Section -->
      <header class="letterhead">
          <p class="letterhead-title">${userProfile.org || 'Law Offices of [Attorney Name]'}</p>
          <p class="contact-info">${userProfile.orgAddress || 'Address Line 1, City, State ZIP'}</p>
          <p class="contact-info">Voice: ${userProfile.phone || 'Phone'} • E-mail: ${userProfile.email || 'Email'}</p>
          ${userProfile.barNumber ? `<p class="contact-info">Bar Number: ${userProfile.barNumber}</p>` : ''}
      </header>

      <!-- Date -->
      <p class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <!-- Recipient Info -->
      <div class="recipient-info">
          <p><strong>VIA EMAIL ONLY:</strong></p>
          <p>opposing@counsel.com</p>
      </div>

      <!-- Case Caption -->
      <div class="case-caption">
          <p>
              <span class="caption-label">RE:</span>
              <span class="caption-text">
                  <strong>Discovery Dispute</strong><br>
                  <em>${caseData.caseName}</em><br>
                  ${caseData.caseData?.court || 'Court'} • ${caseData.caseData?.caseNumber || 'Case Number'}
              </span>
          </p>
      </div>

      <!-- Salutation -->
      <p class="salutation">Dear Counsel:</p>

      <!-- Introduction -->
      <div class="main-body">
          <p>I have received Defendants' Response to Plaintiff's First Set of Interrogatories dated ${letterData.responseDate || 'recent date'}.</p>
          <p>I am writing to address several perceived deficiencies in the Response. Under LR Civ. P. 37.1, this letter gives you a detailed description of the deficiencies and seeks to obtain your voluntary compliance with your disclosure obligations without filing a joint statement of dispute and motion to compel.</p>
          
          <h2 class="interrogatory-heading">Interrogatories:</h2>
      </div>

      <!-- Interrogatory Sections -->
      ${letterData.requests.filter(r => r.objection && r.reply).map(request => {
          const requestTopic = extractRequestTopic ? extractRequestTopic(request.text) : request.text.substring(0, 50) + '...';
          return `
          <h3 class="interrogatory-subheading">Interrogatory Number ${request.id}</h3>
          <p>We asked for information about ${requestTopic}. You asserted various objections, which I will discuss in turn, but then answered the Interrogatory as stated:</p>
          
          <blockquote class="response-quote">
              <p class="no-indent">${request.objection.replace(/\n/g, '<br>')}</p>
          </blockquote>
          
          <div class="legal-argument">
              ${request.reply}
          </div>
      `}).join('\n')}

      <!-- Conclusion -->
      <p class="conclusion">I look forward to receiving your supplemental discovery responses by the close of business on June 7, 2024.</p>
      
      <!-- Signature Block -->
      <div class="signature-block">
          ${userProfile.signature ? userProfile.signature.replace(/\n/g, '<br>') : `
          <p>Sincerely yours,</p>
          <div class="signature-space"></div>
          <p>${userProfile.org || 'Law Offices of [Attorney Name]'}</p>
          <div class="signature-space"></div>
          <p>${userProfile.name || 'Attorney Name'}</p>
          `}
      </div>
      
      <p class="author-initials">${userProfile.name ? userProfile.name.split(' ').map(n => n[0]).join('') : 'AN'}/km</p>
  </div>

  **Formatting Requirements:**
  - Use Times New Roman 12pt font
  - 1.5 line spacing for main text
  - 1-inch margins
  - Professional legal document standards
  - Include all necessary CSS classes for proper styling
  - Follow exact content patterns from the target document
  - IMPORTANT: Generate ALL interrogatory sections (${letterData.requests.filter(r => r.objection && r.reply).length} total)

  Return the complete HTML document with proper structure and formatting. Ensure ALL interrogatory sections are included.
`; 