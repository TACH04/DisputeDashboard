// Main application entry point
import { AppState } from './state/appState.js';
import { ViewManager } from './ui/viewManager.js';
import { DataManager } from './data/dataManager.js';
import { EventHandlers } from './handlers/eventHandlers.js';
import { AutoSave } from './utils/autoSave.js';

/**
 * Main application class that orchestrates all components
 * 
 * This class serves as the central coordinator for the application,
 * managing the relationship between state, views, data, and user interactions.
 * 
 * @class App
 * @description The main application instance that initializes and manages all subsystems
 */
class App {
    /**
     * Creates a new App instance and initializes all components
     * 
     * @constructor
     * @description Sets up the application architecture with all necessary managers and handlers
     */
    constructor() {
        /** @type {AppState} Application state management */
        this.state = new AppState();
        
        /** @type {ViewManager} UI view management and rendering */
        this.viewManager = new ViewManager();
        
        /** @type {DataManager} Data persistence and management */
        this.dataManager = new DataManager();
        
        /** @type {EventHandlers} User interaction event handling */
        this.eventHandlers = new EventHandlers(this);
        
        /** @type {AutoSave} Automatic data saving functionality */
        this.autoSave = new AutoSave(this);
        
        this.init();
    }

    /**
     * Initializes the application by loading data and setting up event listeners
     * 
     * @async
     * @description Performs the complete application startup sequence
     * @returns {Promise<void>}
     */
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

    /**
     * Saves the currently active case to persistent storage
     * 
     * @async
     * @description Persists the current case data to the file system
     * @returns {Promise<boolean>} True if save was successful, false otherwise
     */
    async saveCurrentCase() {
        return await this.dataManager.saveCurrentCase(this.state.currentCaseId);
    }

    /**
     * Retrieves the currently active case data
     * 
     * @description Gets the case object for the currently selected case
     * @returns {Object|null} The current case object or null if no case is selected
     */
    getCurrentCase() {
        return this.dataManager.getCase(this.state.currentCaseId);
    }

    /**
     * Retrieves the currently active request letter data
     * 
     * @description Gets the letter object for the currently selected letter within the current case
     * @returns {Object|null} The current letter object or null if no letter is selected
     */
    getCurrentLetter() {
        const caseData = this.getCurrentCase();
        return caseData?.requestLetters.find(l => l.id === this.state.currentLetterId);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    /** @type {App} Global application instance accessible to all modules */
    window.app = new App();
});

export { App }; 