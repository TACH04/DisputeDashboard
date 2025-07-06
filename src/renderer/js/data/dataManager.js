// Data management and persistence
import { defaultCases } from '../config/defaultData.js';

export class DataManager {
    constructor() {
        this.cases = [];
    }

    async loadAllCases() {
        console.log('DataManager: loadAllCases called'); // Debug log
        try {
            console.log('DataManager: Calling electronAPI.loadAllCases()'); // Debug log
            const cases = await window.electronAPI.loadAllCases();
            console.log('DataManager: Received cases from main process:', cases); // Debug log
            
            if (cases && cases.length > 0) {
                this.cases = cases;
                console.log('DataManager: Using cases from main process'); // Debug log
            } else {
                this.cases = JSON.parse(JSON.stringify(defaultCases));
                console.log('DataManager: Using default data cases'); // Debug log
            }
            console.log('DataManager: Final cases array:', this.cases); // Debug log
            return this.cases;
        } catch (error) {
            console.error('Error loading cases:', error);
            this.cases = JSON.parse(JSON.stringify(defaultCases));
            console.log('DataManager: Using default data due to error'); // Debug log
            return this.cases;
        }
    }

    async saveCase(caseData) {
        try {
            await window.electronAPI.saveCase(caseData);
            console.log('Case data saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving case data:', error);
            return false;
        }
    }

    async saveCurrentCase(caseId) {
        const caseData = this.getCase(caseId);
        if (caseData) {
            return await this.saveCase(caseData);
        }
        return false;
    }

    getCase(caseId) {
        return this.cases.find(c => c.caseId === caseId);
    }

    getLetter(caseId, letterId) {
        const caseData = this.getCase(caseId);
        return caseData?.requestLetters.find(l => l.id === letterId);
    }

    getRequest(caseId, letterId, requestId) {
        const letter = this.getLetter(caseId, letterId);
        return letter?.requests.find(r => r.id === requestId);
    }

    addCase(caseData) {
        // Ensure new cases have the correct version
        if (!caseData.version) {
            caseData.version = "1.1";
        }
        this.cases.push(caseData);
    }

    validateCaseData(caseData) {
        if (!caseData.caseId || !caseData.caseName) {
            throw new Error('Invalid case data: missing required fields');
        }
        
        // Validate caseData structure if present
        if (caseData.caseData) {
            // Ensure defendants is always an array
            if (caseData.caseData.defendants && !Array.isArray(caseData.caseData.defendants)) {
                caseData.caseData.defendants = [caseData.caseData.defendants];
            }
            
            // Validate date formats
            const dateFields = ['filingDate', 'discoveryDeadline', 'trialDate'];
            dateFields.forEach(field => {
                if (caseData.caseData[field] && caseData.caseData[field] !== '') {
                    const date = new Date(caseData.caseData[field]);
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date format for ${field}`);
                    }
                }
            });
        }
        
        return true;
    }

    updateCase(caseId, updates) {
        const caseIndex = this.cases.findIndex(c => c.caseId === caseId);
        if (caseIndex !== -1) {
            this.cases[caseIndex] = { ...this.cases[caseIndex], ...updates };
        }
    }

    addLetter(caseId, letterData) {
        const caseData = this.getCase(caseId);
        if (caseData) {
            caseData.requestLetters.push(letterData);
        }
    }

    updateRequest(caseId, letterId, requestId, updates) {
        const request = this.getRequest(caseId, letterId, requestId);
        if (request) {
            Object.assign(request, updates);
        }
    }

    // Statistics helpers
    getCaseStats(caseId) {
        const caseData = this.getCase(caseId);
        if (!caseData) return null;

        const allRequests = caseData.requestLetters.reduce((acc, letter) => acc + letter.requests.length, 0);
        const unresolvedCount = caseData.requestLetters.reduce((acc, letter) => {
            return acc + letter.requests.filter(r => r.objection && !r.reply).length;
        }, 0);

        return {
            totalRequests: allRequests,
            unresolvedCount,
            letterCount: caseData.requestLetters.length
        };
    }

    getLetterStats(caseId, letterId) {
        const letter = this.getLetter(caseId, letterId);
        if (!letter) return null;

        const totalRequests = letter.requests.length;
        const withObjections = letter.requests.filter(r => r.objection && r.objection.trim()).length;
        const withResponses = letter.requests.filter(r => r.reply && r.reply.trim()).length;
        const pending = withObjections - withResponses;

        return {
            totalRequests,
            withObjections,
            withResponses,
            pending
        };
    }
} 