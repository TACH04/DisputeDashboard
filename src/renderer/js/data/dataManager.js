// Data management and persistence
export class DataManager {
    constructor() {
        this.cases = [];
        this.initialData = {
            cases: [
                {
                    caseId: 'gardner-navajo',
                    caseName: "Gardner v. Navajo County, et al.",
                    requestLetters: [
                        {
                            id: 'rog-set1',
                            dateAdded: '2024-03-15',
                            description: 'First Set of Interrogatories to Defendant Wexford',
                            requests: [
                                {
                                    id: 1,
                                    text: "For each employee or agent of Wexford... affirm or deny whether that person will testify about any spoken statements allegedly made by Amanda Gardner...",
                                    objection: null,
                                    reply: null
                                },
                                {
                                    id: 2,
                                    text: "Identify all spoken or written statements made by each employee or agent of Wexford... regarding the treatment of Amanda Gardner.",
                                    objection: "Objection. Plaintiff's Interrogatory contains multiple subparts, is not limited in time or scope, and requests information...",
                                    reply: null
                                }
                            ]
                        }
                    ]
                },
                {
                    caseId: 'acme-vs-wile',
                    caseName: "Acme Corp. v. Wile E. Coyote",
                    requestLetters: [
                        {
                            id: 'rog-set1',
                            dateAdded: '2024-03-10',
                            description: 'First Set of Interrogatories',
                            requests: [
                                {
                                    id: 1,
                                    text: "Identify all rocket-powered devices purchased...",
                                    objection: "Overly broad.",
                                    reply: null
                                },
                                {
                                    id: 2,
                                    text: "Describe the intended use of the 'Giant Rubber Band'...",
                                    objection: null,
                                    reply: null
                                }
                            ]
                        }
                    ]
                }
            ]
        };
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
                this.cases = JSON.parse(JSON.stringify(this.initialData.cases));
                console.log('DataManager: Using initial data cases'); // Debug log
            }
            console.log('DataManager: Final cases array:', this.cases); // Debug log
            return this.cases;
        } catch (error) {
            console.error('Error loading cases:', error);
            this.cases = JSON.parse(JSON.stringify(this.initialData.cases));
            console.log('DataManager: Using initial data due to error'); // Debug log
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
        this.cases.push(caseData);
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