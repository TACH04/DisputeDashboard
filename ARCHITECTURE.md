# Architecture Documentation

## Overview
This is an Electron-based legal discovery dispute management application. It helps legal professionals manage and respond to discovery objections using AI assistance.

## Architecture Pattern
- **Main Process**: Node.js backend handling file operations, AI services, and data persistence
- **Renderer Process**: Frontend UI built with vanilla JavaScript modules
- **IPC Bridge**: Secure communication between main and renderer processes

## Directory Structure

### Root Level
- `main.js` - Electron main process entry point
- `preload.js` - IPC bridge setup
- `index.html` - Main application UI
- `package.json` - Dependencies and scripts
- `objectionLibrary.json` - Legal objection templates
- `prompts.js` - AI prompt templates
- `user_strategy_map.json` - User-customized legal strategies

### Main Process (`src/main/`)
- `handlers/ipcHandlers.js` - All IPC communication handlers
- `services/` - Business logic services
  - `aiService.js` - Gemini AI integration
  - `dataService.js` - Case data persistence
  - `fileService.js` - File operations (PDF, DOCX)
  - `userProfileService.js` - User settings management

### Renderer Process (`src/renderer/`)
- `css/styles.css` - Complete styling with theme system
- `js/` - Frontend modules
  - `app.js` - Main application entry point
  - `config/defaultData.js` - Sample data for new installations
  - `data/dataManager.js` - Frontend data management
  - `handlers/eventHandlers.js` - UI event handling
  - `state/appState.js` - Application state management
  - `ui/viewManager.js` - View rendering and navigation
  - `utils/autoSave.js` - Auto-save functionality

## Key Design Patterns

### 1. Service Layer Pattern
All business logic is encapsulated in service classes:
- `DataService` - Handles all data persistence
- `AIService` - Manages AI interactions
- `FileService` - Handles file operations
- `UserProfileService` - Manages user settings

### 2. Event-Driven Architecture
- Frontend uses event delegation for UI interactions
- IPC handlers manage main-renderer communication
- Progress events for long-running operations

### 3. State Management
- `AppState` class manages navigation and current context
- View history stack for back navigation
- Current case/letter/request tracking

### 4. View Management
- CSS-based view switching using body classes
- `ViewManager` handles view rendering and transitions
- Modular view components

## Data Flow

### Case Management
1. User creates/selects case → `DataManager.addCase()`
2. Data saved via IPC → `DataService.saveCaseData()`
3. UI updated via `ViewManager.renderCasesDashboard()`

### AI Processing
1. User uploads PDF → `FileService.readPDFFile()`
2. Text sent to AI → `AIService.extractObjections()`
3. Results processed → UI updated with objections

### Letter Generation
1. User requests letter → `AIService.generateLetterSection()`
2. Sections built progressively → Real-time preview
3. Final letter exported → `FileService.exportLetter()`

## IPC Communication

### Main → Renderer
- Progress updates for file processing
- Menu action commands
- Error notifications

### Renderer → Main
- Data persistence requests
- AI processing requests
- File operations
- User profile management

## Configuration Files

### `objectionLibrary.json`
Contains legal objection templates with:
- Objection type (e.g., "vague", "overly broad")
- Standard legal argument
- Supporting case citations

### `prompts.js`
AI prompt templates for:
- Objection extraction from documents
- Legal argument generation
- Letter section creation

### `user_strategy_map.json`
User-customized legal strategies that override defaults

## Error Handling
- Try-catch blocks in all async operations
- User-friendly error messages
- Graceful fallbacks to default data
- Progress indicators for long operations

## Security Considerations
- Context isolation enabled
- No direct Node.js access from renderer
- API keys stored locally only
- File operations sandboxed

## Development Guidelines

### Adding New Features
1. Add service method in appropriate service class
2. Add IPC handler in `ipcHandlers.js`
3. Expose method in `preload.js`
4. Add frontend handler in `eventHandlers.js`
5. Update UI in `viewManager.js`

### Data Persistence
- All data stored in user data directory
- Automatic backups on save
- Version migration support
- JSON format for human readability

### UI Patterns
- Consistent button styling with `btn` classes
- Theme-aware CSS variables
- Responsive grid layouts
- Modal dialogs for complex interactions 