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
        // Create a complete HTML document with proper styling
        const htmlDocument = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.5;
                        margin: 0;
                        padding: 1in;
                        color: #000000;
                        background: #ffffff;
                    }
                    .letter-header .law-firm-name {
                        text-align: center;
                        font-weight: bold;
                        font-size: 14pt;
                        margin-bottom: 0;
                    }
                    .letter-header .law-firm-details {
                        text-align: center;
                        font-size: 10pt;
                        margin-top: 2px;
                        margin-bottom: 3em;
                    }
                    .letter-meta {
                        margin-bottom: 2em;
                    }
                    .letter-meta .via-email {
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .letter-meta p {
                        text-indent: 0;
                        margin: 0 0 4px 0;
                    }
                    .re-block {
                        margin-bottom: 2em;
                        padding-left: 1in;
                    }
                    .re-block p {
                        margin: 0;
                        text-indent: 0;
                    }
                    .letter-body p {
                        text-indent: 0.5in;
                        margin: 0 0 1em 0;
                    }
                    .letter-body p.no-indent {
                        text-indent: 0;
                    }
                    .interrogatory-section {
                        margin-top: 2em;
                        margin-bottom: 2em;
                    }
                    .interrogatory-section h3.interrogatory-title {
                        font-weight: bold;
                        text-decoration: underline;
                        font-size: 12pt;
                        text-indent: 0;
                        margin-bottom: 1em;
                    }
                    .interrogatory-section .response-quote {
                        margin-left: 0.5in;
                        margin-right: 0.5in;
                        margin-bottom: 1em;
                        font-style: italic;
                        border-left: 2px solid #ccc;
                        padding-left: 1em;
                    }
                    .interrogatory-section .legal-argument {
                        text-indent: 0;
                    }
                    .interrogatory-section .legal-argument p:first-child {
                        text-indent: 0;
                    }
                    .interrogatory-section .legal-argument p {
                        text-indent: 0.5in;
                    }
                    .signature-block {
                        margin-top: 3em;
                        padding-left: 4.5in;
                    }
                    .signature-block p {
                        margin: 0;
                        text-indent: 0;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 1in;
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
                top: "0.5in",
                right: "0.5in",
                bottom: "0.5in",
                left: "0.5in"
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