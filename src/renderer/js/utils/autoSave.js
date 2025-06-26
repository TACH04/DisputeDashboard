// Auto-save functionality
export class AutoSave {
    constructor(app) {
        this.app = app;
        this.delay = 2000; // 2 seconds
        this.timeout = null;
    }

    setup() {
        // Set up auto-save triggers
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Save after objection changes
        document.body.addEventListener('change', async (event) => {
            if (event.target.id === 'focus-objection-textarea') {
                await this.triggerAutoSave();
            }
        });

        // Save after reply changes
        document.body.addEventListener('input', (event) => {
            if (event.target.id === 'focus-reply-editor') {
                this.scheduleAutoSave();
            }
        });

        // Save when navigating away from focus view
        document.body.addEventListener('click', async (event) => {
            if (event.target.matches('[data-action="back-to-list"]')) {
                await this.triggerAutoSave();
            }
        });
    }

    scheduleAutoSave() {
        // Clear any existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        // Set new timeout
        this.timeout = setTimeout(async () => {
            await this.triggerAutoSave();
        }, this.delay);
    }

    async triggerAutoSave() {
        if (this.app.state.currentCaseId) {
            await this.app.saveCurrentCase();
            this.showAutosaveIndicator();
        }
    }

    showAutosaveIndicator() {
        const indicator = document.querySelector('.autosave-indicator');
        if (indicator) {
            indicator.classList.add('visible');
            
            // Hide the indicator after 2 seconds
            setTimeout(() => {
                indicator.classList.remove('visible');
            }, 2000);
        }
    }
} 