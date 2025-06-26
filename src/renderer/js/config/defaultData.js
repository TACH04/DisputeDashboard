// Default/sample data for the application
const defaultCases = [
    {
        caseId: 'gardner-navajo',
        caseName: "Gardner v. Navajo County, et al.",
        version: "1.1",
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