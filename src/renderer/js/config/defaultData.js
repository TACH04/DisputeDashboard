// Default/sample data for the application
const defaultCases = [
    {
        caseId: 'gardner-navajo',
        caseName: "Gardner v. Navajo County, et al.",
        version: "1.1",
        caseData: {
            caseNumber: "CV-2024-000123",
            court: "United States District Court for the District of Arizona",
            judge: "Hon. John Smith",
            filingDate: "2024-01-15",
            plaintiff: "Amanda Gardner",
            defendants: ["Navajo County", "Wexford Health Sources, Inc.", "Dr. Jane Doe"],
            caseType: "Civil Rights - Medical Negligence",
            jurisdiction: "Federal",
            venue: "Phoenix Division",
            status: "Active",
            discoveryDeadline: "2024-06-30",
            trialDate: "2025-01-15"
        },
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
        version: "1.1",
        caseData: {
            caseNumber: "2024-CV-456",
            court: "Superior Court of Arizona, Maricopa County",
            judge: "Hon. Mary Johnson",
            filingDate: "2024-02-20",
            plaintiff: "Acme Corporation",
            defendants: ["Wile E. Coyote"],
            caseType: "Breach of Contract",
            jurisdiction: "State",
            venue: "Phoenix",
            status: "Active",
            discoveryDeadline: "2024-08-15",
            trialDate: "2025-03-20"
        },
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
];

export { defaultCases }; 