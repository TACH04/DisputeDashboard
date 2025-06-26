// Main application entry point
import { AppState } from './state/appState.js';
import { ViewManager } from './ui/viewManager.js';
import { DataManager } from './data/dataManager.js';
import { EventHandlers } from './handlers/eventHandlers.js';
import { AutoSave } from './utils/autoSave.js';

class App {
    constructor() {
        this.state = new AppState();
        this.viewManager = new ViewManager();
        this.dataManager = new DataManager();
        this.eventHandlers = new EventHandlers(this);
        this.autoSave = new AutoSave(this);
        
        this.init();
    }

    async init() {
        console.log('App init started'); // Debug log
        
        // Load saved data
        console.log('Loading cases...'); // Debug log
        await this.dataManager.loadAllCases();
        console.log('Cases loaded:', this.dataManager.cases); // Debug log
        
        // Set up event listeners
        console.log('Setting up event listeners...'); // Debug log
        this.eventHandlers.setupEventListeners();
        
        // Initialize auto-save
        console.log('Setting up auto-save...'); // Debug log
        this.autoSave.setup();
        
        // Show initial view
        console.log('Showing initial view...'); // Debug log
        this.viewManager.showCasesDashboard();
        this.state.pushView('cases-view-active');
        
        console.log('App initialized successfully');
    }

    // Global app methods that other modules can access
    async saveCurrentCase() {
        return await this.dataManager.saveCurrentCase(this.state.currentCaseId);
    }

    getCurrentCase() {
        return this.dataManager.getCase(this.state.currentCaseId);
    }

    getCurrentLetter() {
        const caseData = this.getCurrentCase();
        return caseData?.requestLetters.find(l => l.id === this.state.currentLetterId);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();

    // Add delegated event listener for Save Changes button in user profile
    document.body.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'save-profile-btn') {
            if (window.app && window.app.viewManager && typeof window.app.viewManager.saveUserProfile === 'function') {
                window.app.viewManager.saveUserProfile();
            }
        }
    });
});

export { App }; 