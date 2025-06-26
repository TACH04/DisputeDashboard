// Application state management
export class AppState {
    constructor() {
        this.currentCaseId = null;
        this.currentLetterId = null;
        this.currentFocusIndex = -1;
        this.currentEditingCaseId = null;
        this.currentEditingLetterId = null;
        this.viewHistory = [];
    }

    // View management
    pushView(viewName) {
        if (this.viewHistory[this.viewHistory.length - 1] !== viewName) {
            this.viewHistory.push(viewName);
        }
    }

    popView() {
        if (this.viewHistory.length > 1) {
            this.viewHistory.pop();
            return this.viewHistory[this.viewHistory.length - 1];
        }
        return null;
    }

    getCurrentView() {
        return this.viewHistory[this.viewHistory.length - 1];
    }

    // Case management
    setCurrentCase(caseId) {
        this.currentCaseId = caseId;
        this.currentLetterId = null;
        this.currentFocusIndex = -1;
    }

    setCurrentLetter(letterId) {
        this.currentLetterId = letterId;
        this.currentFocusIndex = -1;
    }

    setCurrentFocus(index) {
        this.currentFocusIndex = index;
    }

    // Editing state
    setEditingCase(caseId) {
        this.currentEditingCaseId = caseId;
    }

    setEditingLetter(letterId) {
        this.currentEditingLetterId = letterId;
    }

    clearEditing() {
        this.currentEditingCaseId = null;
        this.currentEditingLetterId = null;
    }

    // Navigation helpers
    canGoBack() {
        return this.viewHistory.length > 1;
    }

    getPreviousView() {
        if (this.canGoBack()) {
            const currentView = this.viewHistory.pop();
            const previousView = this.viewHistory[this.viewHistory.length - 1];
            this.viewHistory.push(currentView); // Restore current view
            return previousView;
        }
        return null;
    }
} 