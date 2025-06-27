const fs = require('fs');
const { dialog, BrowserWindow } = require('electron');
const pdf = require('pdf-parse');
const docx = require('docx');
const html2pdf = require('html-pdf');

class FileService {
    async selectFile(title, buttonLabel, filters) {
        const parentWindow = BrowserWindow.getFocusedWindow();
        if (!parentWindow) {
            throw new Error("No active window found");
        }

        const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
            title,
            buttonLabel,
            properties: ['openFile'],
            filters
        });

        parentWindow.focus();

        if (canceled || filePaths.length === 0) {
            return null;
        }

        return filePaths[0];
    }

    async selectSaveFile(title, defaultPath, filters) {
        const parentWindow = BrowserWindow.getFocusedWindow();
        if (!parentWindow) {
            throw new Error("No active window found");
        }

        const { filePath } = await dialog.showSaveDialog(parentWindow, {
            title,
            defaultPath,
            filters
        });

        return filePath;
    }

    async readPDFFile(filePath) {
        try {
            const dataBuffer = await fs.promises.readFile(filePath);
            const pdfData = await pdf(dataBuffer);
            return pdfData.text;
        } catch (error) {
            throw new Error(`Error reading PDF file: ${error.message}`);
        }
    }

    async exportToPDF(content, filePath) {
        // Create a complete HTML document with exact CSS specifications from Gemini analysis
        const htmlDocument = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    /* --- Global & Print Setup --- */
                    @page {
                        size: letter; /* US Letter 8.5in x 11in */
                        margin: 1in;
                        
                        /* Page Numbering - Starts on Page 2 */
                        @bottom-right {
                            content: counter(page);
                            font-family: 'Times New Roman', Times, serif;
                            font-size: 12pt;
                        }
                    }

                    @page :first {
                        /* Suppress page number on the first page */
                        @bottom-right {
                            content: "";
                        }
                    }

                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.5; /* Visually consistent with 1.5 or double spacing with space after */
                        color: #000000;
                        background-color: #ffffff;
                        margin: 0;
                        padding: 0;
                    }

                    /* --- General Typography --- */
                    p {
                        margin-top: 0;
                        margin-bottom: 12pt; /* Creates a single line break space after each paragraph */
                        text-align: left;
                    }

                    strong {
                        font-weight: bold;
                    }

                    em {
                        font-style: italic;
                    }

                    /* --- Letterhead Section --- */
                    .letterhead {
                        text-align: center;
                        margin-bottom: 1in;
                    }

                    .letterhead-title {
                        font-size: 14pt;
                        font-weight: bold;
                        margin: 0;
                    }

                    .contact-info {
                        font-size: 11pt;
                        margin: 2pt 0; /* Tighter spacing for contact lines */
                        line-height: 1.2;
                    }

                    /* --- Header & Caption Section --- */
                    .date {
                        margin-bottom: 24pt;
                    }

                    .recipient-info {
                        margin-bottom: 24pt;
                    }

                    .recipient-info p {
                        margin: 0;
                        line-height: 1.2;
                    }

                    .case-caption p {
                        /* Creates a hanging indent for the "RE:" block */
                        padding-left: 3.5em; 
                        text-indent: -3.5em;
                    }

                    .caption-label {
                        font-weight: bold;
                    }

                    .caption-text {
                        margin-left: 1em;
                    }

                    .caption-text em {
                        font-style: italic;
                    }

                    .salutation {
                        margin-bottom: 24pt;
                    }

                    /* --- Main Body & Interrogatories --- */
                    .main-body {
                        margin-bottom: 24pt;
                    }

                    .main-body p {
                        margin-bottom: 12pt;
                    }

                    .interrogatory-heading {
                        font-weight: bold;
                        text-decoration: underline;
                        margin-top: 24pt;
                        margin-bottom: 12pt;
                    }

                    .interrogatory-subheading {
                        font-weight: bold;
                        text-decoration: underline;
                        margin-top: 24pt;
                        margin-bottom: 12pt;
                    }

                    .sub-objection-heading {
                        font-weight: bold;
                        margin-top: 12pt;
                        margin-bottom: 6pt;
                        padding-left: 0.5in; /* Indent lettered subheadings */
                    }

                    /* --- Quote Block Styling --- */
                    .response-quote {
                        margin-left: 0.5in;
                        margin-right: 0.5in;
                        margin-top: 12pt;
                        margin-bottom: 12pt;
                        line-height: 1.2; /* Tighter line spacing for quotes */
                        font-style: normal; /* Quotes are not italicized */
                        border-left: 2px solid #ccc;
                        padding-left: 1em;
                    }

                    .response-quote p {
                        margin: 0;
                        line-height: 1.2;
                    }

                    .response-quote p.no-indent {
                        text-indent: 0;
                    }

                    /* --- Legal Argument Sections --- */
                    .legal-argument {
                        margin-top: 12pt;
                        margin-bottom: 12pt;
                    }

                    .legal-argument p {
                        margin-bottom: 12pt;
                        text-indent: 0.5in;
                    }

                    .legal-argument p:first-child {
                        text-indent: 0;
                    }

                    /* --- Conclusion & Signature --- */
                    .conclusion {
                        margin-top: 24pt;
                    }

                    .conclusion p {
                        margin-bottom: 12pt;
                    }

                    .signature-block {
                        margin-top: 12pt;
                        padding-left: 4.5in; /* Right-align signature block */
                    }

                    .signature-block p {
                        margin: 0;
                        line-height: 1.2;
                    }

                    .signature-space {
                        height: 48pt; /* Reserve vertical space for the handwritten signature */
                    }

                    .author-initials {
                        margin-top: 24pt;
                        text-transform: uppercase;
                    }

                    /* --- Print-Specific Rules --- */
                    @media print {
                        /* Avoid breaking key blocks across pages */
                        .interrogatory-heading, 
                        .interrogatory-subheading,
                        .signature-block, 
                        .response-quote {
                            page-break-inside: avoid;
                        }
                        
                        /* Encourage page breaks before major sections if needed */
                        .interrogatory-heading,
                        .interrogatory-subheading {
                            page-break-before: auto;
                        }
                        
                        /* Ensure proper page setup */
                        body, 
                        .legal-letter,
                        .letter-container {
                            margin: 0;
                            padding: 0;
                        }
                        
                        /* Maintain proper spacing in print */
                        .interrogatory-section {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;

        const options = {
            format: 'Letter',
            border: {
                top: "0in",
                right: "0in",
                bottom: "0in",
                left: "0in"
            },
            header: {
                height: "0in"
            },
            footer: {
                height: "0in"
            }
        };

        return new Promise((resolve, reject) => {
            html2pdf.create(htmlDocument, options).toFile(filePath, (error) => {
                if (error) {
                    reject({ success: false, error: error.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    }

    async exportToDOCX(content, filePath) {
        try {
            // Parse HTML content and convert to DOCX format
            const paragraphs = this.parseHTMLToParagraphs(content);
            
            const doc = new docx.Document({
                sections: [{
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch in twips
                                right: 1440,
                                bottom: 1440,
                                left: 1440
                            }
                        }
                    },
                    children: paragraphs
                }]
            });

            const buffer = await docx.Packer.toBuffer(doc);
            await fs.promises.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            throw new Error(`Error exporting to DOCX: ${error.message}`);
        }
    }

    parseHTMLToParagraphs(htmlContent) {
        const paragraphs = [];
        
        // Split content by paragraph tags and other block elements
        const blocks = htmlContent.split(/(<\/?(?:p|div|h[1-6]|br)\b[^>]*>)/i);
        
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();
            if (!block) continue;
            
            // Handle different HTML elements
            if (block.startsWith('<p')) {
                // Extract text content from paragraph
                const textContent = this.extractTextContent(block);
                if (textContent.trim()) {
                    paragraphs.push(new docx.Paragraph({
                        children: [new docx.TextRun({
                            text: textContent,
                            font: 'Times New Roman',
                            size: 24 // 12pt
                        })],
                        spacing: {
                            after: 240 // 12pt spacing after paragraph
                        }
                    }));
                }
            } else if (block.startsWith('<h')) {
                // Handle headers
                const textContent = this.extractTextContent(block);
                if (textContent.trim()) {
                    paragraphs.push(new docx.Paragraph({
                        children: [new docx.TextRun({
                            text: textContent,
                            font: 'Times New Roman',
                            size: 24, // 12pt
                            bold: true
                        })],
                        spacing: {
                            before: 240,
                            after: 240
                        }
                    }));
                }
            } else if (block.startsWith('<div')) {
                // Handle div elements
                const textContent = this.extractTextContent(block);
                if (textContent.trim()) {
                    paragraphs.push(new docx.Paragraph({
                        children: [new docx.TextRun({
                            text: textContent,
                            font: 'Times New Roman',
                            size: 24
                        })],
                        spacing: {
                            after: 240
                        }
                    }));
                }
            } else if (!block.startsWith('<') && block.trim()) {
                // Plain text content
                paragraphs.push(new docx.Paragraph({
                    children: [new docx.TextRun({
                        text: block,
                        font: 'Times New Roman',
                        size: 24
                    })],
                    spacing: {
                        after: 240
                    }
                }));
            }
        }
        
        return paragraphs;
    }

    extractTextContent(htmlElement) {
        // Simple text extraction - remove HTML tags
        return htmlElement.replace(/<[^>]*>/g, '').trim();
    }

    async exportLetter(content, format, fileName) {
        const filePath = await this.selectSaveFile(
            'Save Response Letter',
            fileName,
            [{ name: format.toUpperCase(), extensions: [format] }]
        );

        if (!filePath) {
            return { success: false, error: "Export cancelled" };
        }

        try {
            if (format === 'pdf') {
                return await this.exportToPDF(content, filePath);
            } else if (format === 'docx') {
                return await this.exportToDOCX(content, filePath);
            } else {
                return { success: false, error: "Unsupported format" };
            }
        } catch (error) {
            console.error("Error exporting letter:", error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = FileService; 