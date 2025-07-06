# Development Guide for AI Agents

## Quick Start for AI Development

### Understanding the Codebase
1. **Start with `ARCHITECTURE.md`** - Understand the overall structure
2. **Review `main.js`** - Entry point and service initialization
3. **Check `src/main/services/`** - Core business logic
4. **Examine `src/renderer/js/`** - Frontend modules

### Common Development Tasks

#### Adding a New Feature
```javascript
// 1. Add service method
// src/main/services/yourService.js
class YourService {
    async newFeature(data) {
        // Implementation
        return result;
    }
}

// 2. Add IPC handler
// src/main/handlers/ipcHandlers.js
ipcMain.handle('new-feature', async (event, data) => {
    return await this.yourService.newFeature(data);
});

// 3. Expose in preload
// preload.js
newFeature: (data) => ipcRenderer.invoke('new-feature', data)

// 4. Add frontend handler
// src/renderer/js/handlers/eventHandlers.js
handleNewFeature() {
    // Implementation
}

// 5. Update UI
// src/renderer/js/ui/viewManager.js
renderNewFeature() {
    // Implementation
}
```

#### Modifying AI Prompts
- Edit `prompts.js` for AI interaction changes
- Update `objectionLibrary.json` for legal content
- Modify `user_strategy_map.json` for user customizations

#### Adding New Views
1. Add HTML structure to `index.html`
2. Add CSS classes to `src/renderer/css/styles.css`
3. Add view methods to `ViewManager`
4. Update navigation in `EventHandlers`

### Data Structures

#### Case Object
```javascript
{
    caseId: "unique-id",
    caseName: "Case Name",
    requestLetters: [
        {
            id: "letter-id",
            dateAdded: "2024-01-01",
            description: "Letter description",
            requests: [
                {
                    id: 1,
                    text: "Request text",
                    objection: "Opponent's objection",
                    reply: "Our response"
                }
            ]
        }
    ]
}
```

#### User Profile
```javascript
{
    name: "Attorney Name",
    title: "Job Title",
    email: "email@example.com",
    phone: "Phone Number",
    org: "Organization",
    orgAddress: "Address",
    barNumber: "Bar Number",
    signature: "Signature block",
    apiKey: "Gemini API Key"
}
```

### Error Handling Patterns

#### Service Layer
```javascript
try {
    const result = await this.someOperation();
    return { success: true, data: result };
} catch (error) {
    console.error('Operation failed:', error);
    return { success: false, error: error.message };
}
```

#### Frontend
```javascript
try {
    const result = await window.electronAPI.someOperation();
    if (result.success) {
        // Handle success
    } else {
        // Handle error
        console.error(result.error);
    }
} catch (error) {
    console.error('Critical error:', error);
}
```

### Testing Patterns

#### Manual Testing Checklist
- [ ] Test all view transitions
- [ ] Verify data persistence
- [ ] Check AI integration
- [ ] Test file uploads/exports
- [ ] Validate error handling
- [ ] Test theme switching

#### Common Issues
1. **IPC not working** - Check preload.js exposure
2. **Data not saving** - Verify DataService paths
3. **AI errors** - Check API key in user profile
4. **UI not updating** - Ensure ViewManager methods called

### Code Style Guidelines

#### JavaScript
- Use ES6 modules for imports/exports
- Prefer async/await over promises
- Use descriptive variable names
- Add JSDoc comments for complex functions

#### CSS
- Use CSS custom properties for theming
- Follow BEM-like naming for components
- Keep selectors specific but not overly nested

#### HTML
- Use semantic elements
- Include data attributes for JavaScript hooks
- Maintain accessibility attributes

### Performance Considerations

#### Frontend
- Debounce user input events
- Use event delegation for dynamic content
- Minimize DOM queries with caching

#### Backend
- Stream large file operations
- Cache frequently accessed data
- Use async operations for I/O

### Security Best Practices

#### Data Validation
- Validate all user inputs
- Sanitize HTML content
- Check file types before processing

#### API Security
- Never log API keys
- Validate file paths
- Use try-catch for all external calls

### Debugging Tips

#### Console Logging
```javascript
// Use structured logging
console.log('Operation:', { 
    caseId: this.currentCaseId, 
    step: 'processing' 
});
```

#### Error Tracking
```javascript
// Always include context in errors
throw new Error(`Failed to save case ${caseId}: ${originalError.message}`);
```

#### Development Tools
- Use Electron DevTools for frontend debugging
- Check main process logs in terminal
- Use `console.log` strategically for flow tracking

### Common Patterns

#### Modal Management
```javascript
showModal(modalId) {
    document.getElementById(modalId).classList.add('visible');
}

hideModal(modalId) {
    document.getElementById(modalId).classList.remove('visible');
}
```

#### Progress Updates
```javascript
updateProgress(message, percent) {
    const statusBar = document.getElementById('status-bar');
    const progressBar = document.getElementById('progress-bar');
    statusBar.textContent = message;
    progressBar.style.width = `${percent}%`;
}
```

#### Data Validation
```javascript
validateCaseData(caseData) {
    if (!caseData.caseId || !caseData.caseName) {
        throw new Error('Invalid case data: missing required fields');
    }
    return true;
}
```

### Migration Guidelines

#### Data Version Updates
- **Current version**: `1.1` (current data format)
- **Version field is automatically added to cases without it**
- **No migration logic needed for new versions**

#### Data Format
- Version 1.1 format is the current standard
- Cases without version field are automatically updated
- Full backward compatibility maintained
- New installations start with version 1.1 format 