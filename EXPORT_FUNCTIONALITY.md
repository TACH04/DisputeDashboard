# Export Functionality Documentation

## Overview
The application now supports exporting response letters in both PDF and DOCX formats. This functionality is available in the Response Letter Editor view.

## Features

### PDF Export
- **Format**: Professional legal document formatting
- **Styling**: Times New Roman font, 12pt size, proper margins
- **Content**: Preserves all HTML formatting and styling
- **Layout**: Includes proper letter headers, body text, and signature blocks

### DOCX Export
- **Format**: Microsoft Word compatible document
- **Styling**: Times New Roman font, 12pt size, proper paragraph spacing
- **Content**: Converts HTML content to structured Word document
- **Layout**: Maintains document structure with proper formatting

## Usage

### In the Response Letter Editor
1. Navigate to a case and select a request letter
2. Click "Build Response Letter" to generate content
3. Use the export buttons in the preview toolbar:
   - **Export PDF**: Creates a PDF file with the current letter content
   - **Export DOCX**: Creates a Word document with the current letter content

### File Naming
- Files are automatically named using the pattern: `{CaseName}_Response_Letter_{Date}`
- Users can modify the filename in the save dialog
- Special characters in case names are replaced with underscores

### Export Process
1. Click the export button (PDF or DOCX)
2. A file save dialog appears with a suggested filename
3. Choose location and modify filename if desired
4. Click "Save" to export the file
5. Success/error message is displayed

## Technical Implementation

### Backend (Main Process)
- **FileService**: Handles file operations and export logic
- **PDF Export**: Uses `html-pdf` library with custom CSS styling
- **DOCX Export**: Uses `docx` library with HTML parsing
- **File Dialogs**: Uses Electron's native file dialogs

### Frontend (Renderer Process)
- **Event Handlers**: Process export button clicks
- **Content Extraction**: Gets HTML content from preview panel
- **User Feedback**: Shows success/error messages
- **File Naming**: Generates default filenames

### IPC Communication
- **exportLetterToPDF**: Exports content as PDF
- **exportLetterToDOCX**: Exports content as DOCX
- **Error Handling**: Returns success/error status with messages

## File Structure
```
src/main/services/fileService.js     # Export logic
src/renderer/js/handlers/eventHandlers.js  # Frontend handlers
preload.js                           # IPC bridge
index.html                           # Export buttons
```

## Dependencies
- `html-pdf`: PDF generation from HTML
- `docx`: Word document creation
- `electron`: File dialogs and IPC

## Error Handling
- Validates content exists before export
- Handles file dialog cancellation
- Provides user-friendly error messages
- Logs errors for debugging

## Future Enhancements
- Custom export templates
- Batch export functionality
- Export progress indicators
- Additional file formats (RTF, TXT)
- Custom styling options 