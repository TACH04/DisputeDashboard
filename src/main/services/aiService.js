const { GoogleGenerativeAI } = require("@google/generative-ai");
const objectionLibrary = require('../../../objectionLibrary.json');
const prompts = require('../../../prompts.js');

class AIService {
    constructor() {
        this.model = null;
        this.apiKey = null;
    }

    initialize(apiKey) {
        if (!apiKey) {
            throw new Error("API key is required to initialize AI service");
        }
        this.apiKey = apiKey;
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    async extractObjections(requestsFormatted, rawText) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        const result = await this.model.generateContent(prompts.extractionPrompt(requestsFormatted, rawText));
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

            return extractedData;
        } else {
            throw new Error("Failed to extract objections from the document.");
        }
    }

    async extractRequests(rawText) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        const result = await this.model.generateContent(prompts.requestExtractionPrompt(rawText));
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const extractedRequests = JSON.parse(jsonMatch[0]);
            return extractedRequests;
        } else {
            throw new Error("Failed to extract requests from the document.");
        }
    }

    async generateReplies(requestText, objectionText, contextText = '') {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        console.log("Deconstructor: Identifying objection types...");
        const deconstructorResult = await this.model.generateContent(prompts.deconstructorPrompt(objectionText, Object.keys(objectionLibrary).join(", ")));
        const deconstructorResponseText = deconstructorResult.response.text();
        const jsonMatch = deconstructorResponseText.match(/\[.*\]/s);
        
        if (!jsonMatch) {
            throw new Error("Deconstructor AI failed to return a valid JSON array.");
        }
        
        const identifiedObjections = JSON.parse(jsonMatch[0]);
        console.log(`Deconstructor: Found objections: ${identifiedObjections.join(', ')}`);

        console.log("Drafter: Generating individual refutation paragraphs...");
        const draftPromises = identifiedObjections.map(objectionKey => {
            const rule = objectionLibrary[objectionKey] || objectionLibrary["unclassifiable"];
            return this.model.generateContent(prompts.drafterPrompt(objectionKey, rule, requestText, objectionText, contextText)).then(result => ({
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

        return finalHtmlResponse;
    }

    async generateResponseLetter(caseName, letterDescription, requests) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

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

        const result = await this.model.generateContent(letterPrompt);
        return result.response.text();
    }

    async generateLetterSection(data, userProfile = null) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        let prompt = '';
        
        switch (data.type) {
            case 'header':
                prompt = prompts.headerPrompt(data, userProfile);
                break;

            case 'request':
                prompt = prompts.requestPrompt(data);
                break;

            case 'conclusion':
                prompt = prompts.conclusionPrompt(userProfile);
                break;
                
            default:
                throw new Error('Invalid section type');
        }

        const result = await this.model.generateContent(prompt);
        return result.response.text().replace(/```html|```/g, '').trim();
    }

    // New comprehensive letter generation method based on exact Gemini analysis
    async generateCompleteLetter(caseData, letterData, userProfile, progressCallback = null) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        console.log("Generating complete professional legal letter...");
        
        // Check if we should use modular approach from the start
        const expectedRequests = letterData.requests.filter(r => r.objection && r.reply);
        if (expectedRequests.length > 5) {
            console.log(`Too many requests (${expectedRequests.length}), using modular approach directly`);
            return await this.generateFormattedLetter(caseData, letterData, userProfile, progressCallback);
        }
        
        try {
            // First, try to generate the complete letter in one go
            const letterPrompt = prompts.completeLetterPrompt(caseData, letterData, userProfile, this.extractRequestTopic);
            
            console.log("Attempting single-pass letter generation...");
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'setup',
                    message: 'Attempting single-pass letter generation...',
                    progress: 10
                });
            }
            
            const result = await this.model.generateContent(letterPrompt);
            const responseText = result.response.text();
            
            // Clean up the response to ensure it's valid HTML
            let cleanedResponse = responseText
                .replace(/```html|```/g, '')
                .replace(/```/g, '')
                .trim();
            
            console.log(`Generated response length: ${cleanedResponse.length} characters`);
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'body',
                    message: 'Single-pass generation completed, validating content...',
                    progress: 80
                });
            }
            
            // Check if the response is complete by looking for all expected sections
            const hasAllSections = this.validateLetterCompleteness(cleanedResponse, letterData);
            
            if (hasAllSections) {
                console.log("Complete letter generated successfully in one pass");
                
                if (progressCallback) {
                    progressCallback({ 
                        type: 'progress', 
                        stage: 'formatting',
                        message: 'Single-pass generation successful!',
                        progress: 95
                    });
                }
                
                return cleanedResponse;
            } else {
                console.log("Letter generation incomplete, falling back to modular approach");
                
                if (progressCallback) {
                    progressCallback({ 
                        type: 'progress', 
                        stage: 'setup',
                        message: 'Single-pass incomplete, switching to modular generation...',
                        progress: 5
                    });
                }
                
                return await this.generateFormattedLetter(caseData, letterData, userProfile, progressCallback);
            }
            
        } catch (error) {
            console.error("Error in complete letter generation, falling back to modular approach:", error);
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'setup',
                    message: 'Single-pass failed, switching to modular generation...',
                    progress: 5
                });
            }
            
            return await this.generateFormattedLetter(caseData, letterData, userProfile, progressCallback);
        }
    }

    // Helper method to validate if the generated letter is complete
    validateLetterCompleteness(htmlContent, letterData) {
        const expectedRequests = letterData.requests.filter(r => r.objection && r.reply);
        
        console.log(`Validating letter completeness: ${expectedRequests.length} expected requests`);
        
        // Check if all expected interrogatory sections are present
        for (const request of expectedRequests) {
            const interrogatoryPattern = new RegExp(`Interrogatory Number ${request.id}`, 'i');
            if (!interrogatoryPattern.test(htmlContent)) {
                console.log(`Missing interrogatory section for request ${request.id}`);
                return false;
            }
            
            // Also check for the legal argument content
            const hasLegalArgument = htmlContent.includes('legal-argument') || 
                                   htmlContent.includes('Legal Argument') ||
                                   htmlContent.includes('You asserted various objections');
            
            if (!hasLegalArgument) {
                console.log(`Missing legal argument content for request ${request.id}`);
                return false;
            }
        }
        
        // Check for essential sections
        const essentialSections = [
            'letterhead',
            'salutation',
            'conclusion',
            'signature-block'
        ];
        
        for (const section of essentialSections) {
            if (!htmlContent.includes(section)) {
                console.log(`Missing essential section: ${section}`);
                return false;
            }
        }
        
        // Check for proper HTML structure
        if (!htmlContent.includes('<div class="letter-container">') && 
            !htmlContent.includes('letter-container')) {
            console.log('Missing letter container structure');
            return false;
        }
        
        // Check if the response seems truncated (common AI issue)
        const wordCount = htmlContent.split(/\s+/).length;
        const expectedMinWords = expectedRequests.length * 100; // Rough estimate
        
        if (wordCount < expectedMinWords) {
            console.log(`Response seems truncated: ${wordCount} words, expected at least ${expectedMinWords}`);
            return false;
        }
        
        console.log('Letter validation passed - all sections present');
        return true;
    }

    // Enhanced letter generation with modular approach
    async generateFormattedLetter(caseData, letterData, userProfile, progressCallback = null) {
        if (!this.model) {
            throw new Error("AI service not initialized. Please set API key first.");
        }

        console.log("Generating formatted letter with modular approach...");
        
        try {
            // Generate header section
            console.log("Generating header section...");
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'header',
                    message: 'Generating letter header...',
                    progress: 15
                });
            }
            
            const headerData = {
                recipientEmails: letterData.recipientEmails || ['opposing@counsel.com'],
                caseCaption: caseData.caseName,
                caseInfo: `${caseData.caseData?.court || 'Court'} • ${caseData.caseData?.caseNumber || 'Case Number'}`,
                salutationNames: letterData.salutationNames || 'Counsel',
                responseDate: letterData.responseDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            };
            
            const header = await this.generateLetterSection({ type: 'header', ...headerData }, userProfile);
            console.log("Header section generated");
            
            // Send header content for real-time preview
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'header',
                    message: 'Header generated successfully',
                    progress: 25,
                    html: header
                });
            }
            
            // Generate request sections
            const requestSections = [];
            const requestsToProcess = letterData.requests.filter(r => r.objection && r.reply);
            console.log(`Generating ${requestsToProcess.length} request sections...`);
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'body',
                    message: `Preparing to generate ${requestsToProcess.length} request sections...`,
                    progress: 30
                });
            }
            
            for (let i = 0; i < requestsToProcess.length; i++) {
                const request = requestsToProcess[i];
                console.log(`Generating section ${i + 1}/${requestsToProcess.length} for request ${request.id}...`);
                
                if (progressCallback) {
                    const progress = 30 + ((i / requestsToProcess.length) * 50); // 30% to 80%
                    progressCallback({ 
                        type: 'progress', 
                        stage: 'body',
                        message: `Generating section ${i + 1}/${requestsToProcess.length} (Request #${request.id})...`,
                        progress: Math.round(progress)
                    });
                }
                
                const requestData = {
                    type: 'request',
                    request: request,
                    requestTopic: this.extractRequestTopic(request.text)
                };
                
                const section = await this.generateLetterSection(requestData, userProfile);
                requestSections.push(section);
                console.log(`Section ${i + 1} completed`);
                
                // Send section content for real-time preview
                if (progressCallback) {
                    const progress = 30 + (((i + 1) / requestsToProcess.length) * 50); // 30% to 80%
                    progressCallback({ 
                        type: 'progress', 
                        stage: 'body',
                        message: `Completed section ${i + 1}/${requestsToProcess.length}`,
                        progress: Math.round(progress),
                        sectionHtml: section
                    });
                }
            }
            
            // Generate conclusion
            console.log("Generating conclusion section...");
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'conclusion',
                    message: 'Generating conclusion section...',
                    progress: 85
                });
            }
            
            const conclusion = await this.generateLetterSection({ type: 'conclusion' }, userProfile);
            console.log("Conclusion section generated");
            
            // Send conclusion content for real-time preview
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'conclusion',
                    message: 'Conclusion generated successfully',
                    progress: 90,
                    html: conclusion
                });
            }
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'formatting',
                    message: 'Finalizing letter formatting...',
                    progress: 95
                });
            }
            
            // Combine all sections
            const completeLetter = `
                <div class="letter-container">
                    ${header}
                    ${requestSections.join('\n')}
                    ${conclusion}
                </div>
            `;
            
            console.log("Formatted letter generated successfully with modular approach");
            
            if (progressCallback) {
                progressCallback({ 
                    type: 'progress', 
                    stage: 'complete',
                    message: 'Letter generation complete!',
                    progress: 100
                });
            }
            
            return completeLetter;
            
        } catch (error) {
            console.error("Error generating formatted letter:", error);
            if (progressCallback) {
                progressCallback({ 
                    type: 'error', 
                    error: error.message 
                });
            }
            throw new Error(`Failed to generate formatted letter: ${error.message}`);
        }
    }

    // Helper method to extract request topic
    extractRequestTopic(requestText) {
        // Simple extraction of the main topic from request text
        const words = requestText.split(' ').slice(0, 10).join(' ');
        return words.length > 50 ? words.substring(0, 50) + '...' : words;
    }
}

module.exports = AIService; 