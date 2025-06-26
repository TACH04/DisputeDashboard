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
}

module.exports = AIService; 