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
        const options = {
            format: 'Letter',
            border: {
                top: "1in",
                right: "1in",
                bottom: "1in",
                left: "1in"
            }
        };

        return new Promise((resolve, reject) => {
            html2pdf.create(content, options).toFile(filePath, (error) => {
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
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [new docx.TextRun(content.replace(/<[^>]+>/g, ''))]
                        })
                    ]
                }]
            });

            const buffer = await docx.Packer.toBuffer(doc);
            await fs.promises.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            throw new Error(`Error exporting to DOCX: ${error.message}`);
        }
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