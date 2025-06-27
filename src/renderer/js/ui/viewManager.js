// View management and rendering
export class ViewManager {
    constructor() {
        this.currentView = null;
    }

    // View switching methods
    showCasesDashboard() {
        this.switchView('cases-view-active');
        this.renderCasesDashboard();
    }

    showRequestLettersView(caseId) {
        this.switchView('request-letters-active');
        this.renderRequestLettersView(caseId);
    }

    showDisputeListView(letterId) {
        this.switchView('dispute-list-active');
        this.renderDisputeListView(letterId);
    }

    showFocusView(requestIndex) {
        this.switchView('focus-mode-active');
        this.renderFocusView(requestIndex);
    }

    showLetterEditor() {
        this.switchView('letter-editor-active');
        this.updateLetterStats();
        this.updateEditorHeader();
        this.checkForSavedLetters();
        this.initializeZoom();
    }

    showUserProfile() {
        // Push the current view to the history stack before switching
        if (window.app && window.app.state) {
            window.app.state.pushView(document.body.className);
        }
        this.switchView('profile-view-active');
        this.loadUserProfile();
    }

    switchView(viewName) {
        this.currentView = viewName;
        document.body.className = viewName;
    }

    // Rendering methods
    renderCasesDashboard() {
        const grid = document.getElementById('cases-grid');
        if (!grid) return;

        // Clear grid
        grid.innerHTML = '';

        // Get cases from data manager
        const cases = window.app?.dataManager?.cases || [];
        if (cases.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No cases found. Click "Add New Case" to get started.</p>';
            return;
        }

        cases.forEach(caseData => {
            const card = document.createElement('div');
            card.className = 'case-card';
            card.dataset.caseId = caseData.caseId;
            card.innerHTML = `
                <div class="case-card-header">
                    <h3>${caseData.caseName}</h3>
                    <button class="edit-button" data-action="edit-case-details" title="Edit Case Details">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                </div>
                <div class="case-card-details">
                    <p><b>Case Number:</b> ${caseData.caseData?.caseNumber || 'Not set'}</p>
                    <p><b>Court:</b> ${caseData.caseData?.court || 'Not set'}</p>
                    <p><b>Status:</b> ${caseData.caseData?.status || 'Not set'}</p>
                    <p><b>Letters:</b> ${caseData.requestLetters.length}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    renderRequestLettersView(caseId) {
        const header = document.getElementById('request-letters-header');
        const tableBody = document.getElementById('request-letters-table');
        
        if (!header || !tableBody) return;

        // Get the case data
        const caseData = window.app?.dataManager?.getCase(caseId);
        if (!caseData) {
            header.textContent = 'Case Not Found';
            tableBody.innerHTML = '';
            return;
        }
        header.textContent = caseData.caseName;

        // Render request letters
        if (!caseData.requestLetters || caseData.requestLetters.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="color: var(--text-secondary); text-align: center;">No request letters found for this case.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        caseData.requestLetters.forEach(letter => {
            const row = document.createElement('tr');
            row.dataset.letterId = letter.id;
            row.innerHTML = `
                <td>${letter.dateAdded || ''}</td>
                <td>${letter.description || ''}</td>
                <td>${letter.requests ? letter.requests.length : 0}</td>
                <td><span>${getLetterStatus(letter)}</span></td>
            `;
            tableBody.appendChild(row);
        });

        // Helper to get status string
        function getLetterStatus(letter) {
            const unresolvedCount = letter.requests.filter(r => r.objection && !r.reply).length;
            const totalRequests = letter.requests.length;
            const objectionCount = letter.requests.filter(r => r.objection).length;
            if (objectionCount === 0) {
                return 'Awaiting Responses';
            } else if (unresolvedCount === 0) {
                return 'All Replied';
            } else {
                return `${unresolvedCount} Need Reply`;
            }
        }
    }

    renderDisputeListView(letterId) {
        console.log('ViewManager: renderDisputeListView called with letterId:', letterId); // Debug log
        const header = document.getElementById('case-name-header');
        const subtitle = document.getElementById('case-subtitle');
        const tableBody = document.getElementById('table-body');
        
        console.log('ViewManager: Found elements - header:', !!header, 'subtitle:', !!subtitle, 'tableBody:', !!tableBody); // Debug log
        
        if (!header || !subtitle || !tableBody) return;

        // Get the current case and letter data
        const caseData = window.app?.getCurrentCase();
        const letterData = window.app?.getCurrentLetter();
        
        console.log('ViewManager: caseData:', caseData); // Debug log
        console.log('ViewManager: letterData:', letterData); // Debug log
        
        if (!caseData || !letterData) {
            header.textContent = 'Case Not Found';
            subtitle.textContent = '';
            tableBody.innerHTML = '';
            return;
        }

        header.textContent = caseData.caseName;
        subtitle.textContent = `Managing disputes for: ${letterData.description}`;

        // Render requests
        if (!letterData.requests || letterData.requests.length === 0) {
            console.log('ViewManager: No requests found for letter'); // Debug log
            tableBody.innerHTML = '<tr><td colspan="3" style="color: var(--text-secondary); text-align: center;">No requests found for this letter.</td></tr>';
            return;
        }

        console.log('ViewManager: Rendering', letterData.requests.length, 'requests'); // Debug log
        tableBody.innerHTML = '';
        letterData.requests.forEach((request, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            // Get status for this request
            const hasObjection = request.objection && request.objection.trim() !== '';
            const hasReply = request.reply && request.reply.trim() !== '';
            
            let statusIcon = '';
            let statusColor = '';
            
            if (hasObjection) {
                if (hasReply) {
                    statusIcon = '✔';
                    statusColor = 'var(--status-success)';
                } else {
                    statusIcon = '!';
                    statusColor = 'var(--status-warning)';
                }
            } else {
                statusIcon = '—';
                statusColor = 'var(--status-error)';
            }

            row.innerHTML = `
                <td class="col-number">
                    <span style="color: ${statusColor}; font-weight: bold;">${statusIcon}</span>
                </td>
                <td class="col-request">${request.text.substring(0, 100)}${request.text.length > 100 ? '...' : ''}</td>
                <td class="col-objection">${request.objection ? request.objection.substring(0, 150) + (request.objection.length > 150 ? '...' : '') : 'No objection yet'}</td>
            `;
            tableBody.appendChild(row);
        });
        console.log('ViewManager: Finished rendering dispute list'); // Debug log
    }

    renderFocusView(requestIndex) {
        const title = document.getElementById('focus-title');
        const requestText = document.getElementById('focus-request-text');
        const objectionTextarea = document.getElementById('focus-objection-textarea');
        const replyEditor = document.getElementById('focus-reply-editor');
        
        if (!title || !requestText || !objectionTextarea || !replyEditor) return;

        // Get the current case and letter data
        const caseData = window.app?.getCurrentCase();
        const letterData = window.app?.getCurrentLetter();
        
        if (!caseData || !letterData || !letterData.requests[requestIndex]) {
            title.textContent = 'Request Not Found';
            requestText.textContent = '';
            objectionTextarea.value = '';
            replyEditor.innerHTML = '';
            return;
        }

        const request = letterData.requests[requestIndex];
        
        // Update title
        title.textContent = `Request ${requestIndex + 1} of ${letterData.requests.length}`;
        
        // Update request text
        requestText.textContent = request.text;
        
        // Update objection textarea
        objectionTextarea.value = request.objection || '';
        
        // Update reply editor
        replyEditor.innerHTML = request.reply || '';
    }

    updateLetterStats() {
        const totalRequests = document.getElementById('stat-total-requests');
        const withObjections = document.getElementById('stat-with-objections');
        const withResponses = document.getElementById('stat-with-responses');
        const pending = document.getElementById('stat-pending');
        
        if (!totalRequests || !withObjections || !withResponses || !pending) return;

        const caseData = window.app?.getCurrentCase();
        const letterData = window.app?.getCurrentLetter();
        
        if (!caseData || !letterData) return;

        const stats = window.app?.dataManager?.getLetterStats(caseData.caseId, letterData.id);
        if (!stats) return;

        totalRequests.textContent = stats.totalRequests;
        withObjections.textContent = stats.withObjections;
        withResponses.textContent = stats.withResponses;
        pending.textContent = stats.pending;
    }

    updateEditorHeader() {
        const header = document.getElementById('letter-editor-header');
        const subtitle = document.getElementById('letter-editor-subtitle');
        
        if (!header || !subtitle) return;

        const caseData = window.app?.getCurrentCase();
        const letterData = window.app?.getCurrentLetter();
        
        if (!caseData || !letterData) return;

        header.textContent = 'Response Letter Editor';
        subtitle.textContent = `${caseData.caseName} - ${letterData.description}`;
    }

    async loadUserProfile() {
        try {
            const workspacePath = await window.electronAPI.getWorkspacePath();
            const workspacePathEl = document.getElementById('workspace-path');
            const osInfoEl = document.getElementById('os-info');
            
            if (workspacePathEl) workspacePathEl.textContent = workspacePath;
            if (osInfoEl) osInfoEl.textContent = window.electronAPI.getOSInfo();
            
            // Load saved user profile data
            const profile = await window.electronAPI.loadUserProfile();
            if (profile) {
                this.fillProfileForm(profile);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    fillProfileForm(profile) {
        const fields = [
            'profile-name', 'profile-title', 'profile-email', 'profile-phone',
            'profile-org', 'profile-org-address', 'profile-bar-number',
            'profile-signature', 'profile-api-key'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const value = profile[fieldId.replace('profile-', '')] || '';
                element.value = value;
            }
        });
    }

    // Modal logic for Add Case
    showAddCaseModal() {
        const modal = document.getElementById('add-case-modal');
        if (modal) modal.classList.add('visible');
        const input = document.getElementById('case-name-input');
        if (input) input.value = '';
    }
    hideAddCaseModal() {
        const modal = document.getElementById('add-case-modal');
        if (modal) modal.classList.remove('visible');
    }

    async saveUserProfile() {
        try {
            // Collect form data
            const profile = {
                name: document.getElementById('profile-name')?.value || '',
                title: document.getElementById('profile-title')?.value || '',
                email: document.getElementById('profile-email')?.value || '',
                phone: document.getElementById('profile-phone')?.value || '',
                org: document.getElementById('profile-org')?.value || '',
                orgAddress: document.getElementById('profile-org-address')?.value || '',
                barNumber: document.getElementById('profile-bar-number')?.value || '',
                signature: document.getElementById('profile-signature')?.value || '',
                apiKey: document.getElementById('profile-api-key')?.value || ''
            };

            const statusText = document.getElementById('profile-status-text');
            if (statusText) statusText.textContent = 'Saving...';

            const result = await window.electronAPI.saveUserProfile(profile);
            
            if (result && result.success) {
                if (statusText) statusText.textContent = 'Profile saved successfully!';
                setTimeout(() => { 
                    if (statusText) statusText.textContent = ''; 
                }, 2000);
            } else {
                if (statusText) statusText.textContent = 'Error saving profile: ' + (result?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error saving user profile:', error);
            const statusText = document.getElementById('profile-status-text');
            if (statusText) statusText.textContent = 'Error saving profile: ' + error.message;
        }
    }

    async checkForSavedLetters() {
        const caseData = window.app?.getCurrentCase();
        const letterData = window.app?.getCurrentLetter();
        
        if (!caseData || !letterData) return;

        // The View Saved Letters button is now always present in the action bar
        // No need to dynamically add it
    }

    initializeZoom() {
        const previewContent = document.getElementById('letter-preview-content');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (previewContent && zoomLevel) {
            // Ensure zoom is reset to 100% when view is shown
            previewContent.style.transform = 'scale(1)';
            zoomLevel.textContent = '100%';
            console.log('Zoom initialized to 100%');
        }
    }
} 