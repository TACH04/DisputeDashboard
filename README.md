# Discovery Dispute Management Dashboard

An Electron-based application for legal professionals to manage and respond to discovery objections using AI assistance.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Gemini API key (for AI features)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd bartelle

# Install dependencies
npm install

# Start the application
npm start
```

### First Time Setup
1. Launch the application
2. Click the user profile icon (bottom-right menu)
3. Enter your Gemini API key
4. Fill in your professional information
5. Start creating cases and managing disputes

## 📚 Documentation

- **[Architecture Guide](ARCHITECTURE.md)** - Complete system architecture overview
- **[Development Guide](DEVELOPMENT.md)** - Development patterns and guidelines
- **[Configuration Schemas](CONFIG_SCHEMAS.md)** - Data structures and validation rules

## 🏗️ Architecture

This application follows a modular Electron architecture:

```
bartelle/
├── main.js                 # Electron main process
├── preload.js             # IPC bridge setup
├── index.html             # Main UI
├── src/
│   ├── main/              # Backend services
│   │   ├── handlers/      # IPC communication
│   │   └── services/      # Business logic
│   └── renderer/          # Frontend modules
│       ├── css/           # Styling
│       └── js/            # UI logic
├── objectionLibrary.json  # Legal objection templates
├── prompts.js            # AI prompt templates
└── user_strategy_map.json # User customizations
```

## 🔧 Key Features

### Case Management
- Create and organize legal cases
- Manage multiple request letters per case
- Track discovery requests and objections

### AI-Powered Analysis
- Extract objections from uploaded PDFs
- Generate legal responses using Gemini AI
- Customizable legal argument library

### Document Generation
- Build professional response letters
- Export to PDF and DOCX formats
- Real-time preview and editing

### User Experience
- Dark/light theme support
- Auto-save functionality
- Responsive design
- Keyboard navigation

## 🛠️ Development

### For AI Agents

This codebase is optimized for AI-assisted development with:

- **Clear Documentation**: Comprehensive guides in `ARCHITECTURE.md` and `DEVELOPMENT.md`
- **Modular Structure**: Well-separated concerns with service layer pattern
- **Consistent Patterns**: Standardized error handling and data flow
- **Schema Documentation**: Complete data structure definitions

### Development Workflow

1. **Understand the Architecture**: Start with `ARCHITECTURE.md`
2. **Review Patterns**: Check `DEVELOPMENT.md` for common patterns
3. **Follow the Flow**: Use established service → IPC → frontend patterns

### Adding Features

```javascript
// 1. Add service method
class YourService {
    async newFeature(data) {
        // Implementation
        return result;
    }
}

// 2. Add IPC handler
ipcMain.handle('new-feature', async (event, data) => {
    return await this.yourService.newFeature(data);
});

// 3. Expose in preload
newFeature: (data) => ipcRenderer.invoke('new-feature', data)

// 4. Add frontend handler
handleNewFeature() {
    // Implementation
}
```

### Testing

```bash
# Manual testing checklist
- [ ] All view transitions work
- [ ] Data persists correctly
- [ ] AI integration functions
- [ ] File uploads/exports work
- [ ] Error handling is robust
- [ ] Theme switching works
```

## 📁 Data Storage

All user data is stored locally in the Electron user data directory:

- **Cases**: `userData/case_data/`
- **Backups**: `userData/backups/`
- **Profile**: `userData/user_profile.json`
- **Logs**: `userData/logs/`

## 🔒 Security

- API keys stored locally only
- No data transmitted to external servers (except AI API)
- File operations sandboxed
- Input validation and sanitization

## 🤝 Contributing

### For AI Agents

1. **Follow Established Patterns**: Use existing service/event/view architecture
2. **Update Documentation**: Keep `ARCHITECTURE.md` and `DEVELOPMENT.md` current
3. **Test Thoroughly**: Ensure features work across all views
4. **Maintain Consistency**: Follow existing naming and structure conventions

### Code Style

- ES6 modules for imports/exports
- Async/await for asynchronous operations
- Descriptive variable names
- JSDoc comments for complex functions
- CSS custom properties for theming

## 📄 License

[Add your license information here]

## 🆘 Support

For development questions:
1. Check the documentation files
2. Examine the architecture guide for system understanding
3. Look at existing code patterns for implementation examples