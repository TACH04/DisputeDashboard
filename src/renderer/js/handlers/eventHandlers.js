// Event handlers for user interactions
export class EventHandlers {
    constructor(app) {
        this.app = app;
    }

    setupEventListeners() {
        this.setupClickHandlers();
        this.setupKeyboardHandlers();
        this.setupUploadHandlers();
        this.setupMenuHandlers();
    }

    setupClickHandlers() {
        document.body.addEventListener('click', (event) => {
            const target = event.target;
            const caseCard = target.closest('.case-card');
            const letterRow = target.closest('#request-letters-table tr');
            const disputeRow = target.closest('#table-body tr');
            const action = target.dataset.action;

            // Check for edit button click first
            if (target.closest('.edit-button') || target.closest('[data-action="edit-case-details"]')) {
                event.stopPropagation();
                this.handleEditCaseDetails(event);
                return;
            }

            // Add New Case button (remove inline handler in HTML later)
            if (target.matches('.btn.btn-primary') && target.textContent.includes('Add New Case')) {
                this.app.viewManager.showAddCaseModal();
                return;
            }
            // Modal close/cancel
            if (target.closest('#add-case-modal .modal-close') || (target.closest('#add-case-modal .btn-secondary') && target.textContent.includes('Cancel'))) {
                this.app.viewManager.hideAddCaseModal();
                return;
            }
            // Modal create case
            if (target.closest('#add-case-modal .btn-primary') && target.textContent.includes('Create Case')) {
                this.handleCreateNewCase();
                return;
            }

            if (caseCard) {
                this.handleCaseCardClick(caseCard.dataset.caseId);
            } else if (letterRow) {
                this.handleLetterRowClick(letterRow.dataset.letterId);
            } else if (disputeRow) {
                this.handleDisputeRowClick(parseInt(disputeRow.dataset.index));
            } else if (action) {
                this.handleActionClick(action, event);
            }
        });
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (event) => {
            if (!document.body.classList.contains('focus-mode-active')) return;

            const activeEl = document.activeElement;
            const isEditingText = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
            
            if (!isEditingText) {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    this.navigateFocus(1);
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    this.navigateFocus(-1);
                }
            }
        });

        // Add zoom keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
                event.preventDefault();
                this.handleZoomIn();
            } else if (event.ctrlKey && event.key === '-') {
                event.preventDefault();
                this.handleZoomOut();
            } else if (event.ctrlKey && event.key === '0') {
                event.preventDefault();
                this.handleZoomReset();
            }
        });

        // Add mouse wheel zoom support
        document.addEventListener('wheel', (event) => {
            if (event.ctrlKey && document.body.classList.contains('letter-editor-active')) {
                event.preventDefault();
                const delta = event.deltaY > 0 ? -1 : 1;
                if (delta > 0) {
                    this.handleZoomIn();
                } else {
                    this.handleZoomOut();
                }
            }
        }, { passive: false });
    }

    setupUploadHandlers() {
        // Upload progress handlers
        window.electronAPI.onUploadProgress((result) => {
            this.handleUploadProgress(result);
        });

        window.electronAPI.onRequestProgress((result) => {
            this.handleRequestProgress(result);
        });

        window.electronAPI.onLetterProgress((progress) => {
            this.handleLetterProgress(progress);
        });
    }

    setupMenuHandlers() {
        window.electronAPI.onMenuAction((action) => {
            switch(action) {
                case 'go-back': this.goBack(); break;
                case 'nav-next': this.navigateFocus(1); break;
                case 'nav-prev': this.navigateFocus(-1); break;
            }
        });
    }

    // Click handlers
    handleCaseCardClick(caseId) {
        this.app.state.setCurrentCase(caseId);
        this.app.viewManager.showRequestLettersView(caseId);
    }

    handleLetterRowClick(letterId) {
        this.app.state.setCurrentLetter(letterId);
        this.app.viewManager.showDisputeListView(letterId);
    }

    handleDisputeRowClick(index) {
        this.app.state.setCurrentFocus(index);
        this.app.viewManager.showFocusView(index);
    }

    handleActionClick(action, event) {
        console.log('Action clicked:', action); // Debug log
        switch(action) {
            case 'go-back': this.goBack(); break;
            case 'back-to-previous': this.goBack(); break;
            case 'back-to-cases': this.app.viewManager.showCasesDashboard(); break;
            case 'back-to-letters': this.app.viewManager.showRequestLettersView(this.app.state.currentCaseId); break;
            case 'back-to-list': this.app.viewManager.showDisputeListView(this.app.state.currentLetterId); break;
            case 'focus-next': this.navigateFocus(1); break;
            case 'focus-prev': this.navigateFocus(-1); break;
            case 'focus-generate': this.handleGenerateReplies(); break;
            case 'generate-all': 
                console.log('Generate all clicked'); // Debug log
                this.handleGenerateAllReplies(); 
                break;
            case 'upload-request': window.electronAPI.uploadRequestLetter(); break;
            case 'upload': 
                console.log('Upload clicked'); // Debug log
                this.handleUpload(); 
                break;
            case 'build-letter': this.app.viewManager.showLetterEditor(); break;
            case 'back-to-disputes': this.app.viewManager.showDisputeListView(this.app.state.currentLetterId); break;
            case 'generate-letter': this.handleGenerateLetter(); break;
            case 'view-saved-letters': this.handleViewSavedLetters(); break;
            case 'save-current-letter': this.saveCurrentLetter(); break;
            case 'save-profile': this.app.viewManager.saveUserProfile(); break;
            case 'export-pdf': this.exportLetter('pdf'); break;
            case 'export-docx': this.exportLetter('docx'); break;
            case 'zoom-reset': this.handleZoomReset(); break;
            case 'edit-case-details': this.handleEditCaseDetails(event); break;
            default:
                console.log('Unknown action:', action); // Debug log
        }
    }

    // Navigation handlers
    goBack() {
        if (this.app.state.canGoBack()) {
            const previousView = this.app.state.popView();
            console.log('Going back to:', previousView);
            document.body.className = previousView;

            // Re-render the view based on the view type
            switch (previousView) {
                case 'cases-view-active':
                    this.app.viewManager.renderCasesDashboard();
                    break;
                case 'request-letters-active':
                    this.app.viewManager.renderRequestLettersView(this.app.state.currentCaseId);
                    break;
                case 'dispute-list-active':
                    this.app.viewManager.renderDisputeListView(this.app.state.currentLetterId);
                    break;
                case 'focus-mode-active':
                    this.app.viewManager.renderFocusView(this.app.state.currentFocusIndex);
                    break;
                case 'profile-view-active':
                    this.app.viewManager.loadUserProfile();
                    break;
                default:
                    // Fallback: show dashboard
                    this.app.viewManager.showCasesDashboard();
                    break;
            }
        } else {
            // Fallback: show dashboard
            this.app.viewManager.showCasesDashboard();
        }
    }

    async navigateFocus(direction) {
        if (!document.body.classList.contains('focus-mode-active')) return;
        
        const caseData = this.app.getCurrentCase();
        if (!caseData) return;

        const letterData = this.app.getCurrentLetter();
        if (!letterData) return;

        // Save current state before navigation
        const currentRequest = letterData.requests[this.app.state.currentFocusIndex];
        if (currentRequest) {
            const objectionTextarea = document.getElementById('focus-objection-textarea');
            const replyEditor = document.getElementById('focus-reply-editor');
            
            if (objectionTextarea && objectionTextarea.value !== currentRequest.objection) {
                currentRequest.objection = objectionTextarea.value;
            }
            if (replyEditor && replyEditor.innerHTML !== currentRequest.reply) {
                currentRequest.reply = replyEditor.innerHTML;
            }
        }
        
        const newIndex = this.app.state.currentFocusIndex + direction;
        if (newIndex >= 0 && newIndex < letterData.requests.length) {
            this.app.state.setCurrentFocus(newIndex);
            this.app.viewManager.renderFocusView(newIndex);
        }
        await this.app.autoSave.triggerAutoSave();
    }

    // Upload handlers
    handleUpload() {
        console.log('handleUpload called'); // Debug log
        const currentCase = this.app.getCurrentCase();
        const currentLetter = this.app.getCurrentLetter();
        console.log('Current case:', currentCase); // Debug log
        console.log('Current letter:', currentLetter); // Debug log
        if (currentLetter) {
            console.log('Calling uploadAndProcess with requests:', currentLetter.requests); // Debug log
            window.electronAPI.uploadAndProcess(currentLetter.requests);
        } else {
            console.log('No current letter found'); // Debug log
        }
    }

    handleUploadProgress(result) {
        const progressSection = document.getElementById('dispute-progress-section');
        const statusBar = document.getElementById('dispute-status-bar');
        const progressBar = document.getElementById('dispute-progress-bar');
        const button = document.querySelector('[data-action="upload"]');

        const uploadCaseId = this.app.state.currentCaseId;
        const uploadLetterId = this.app.state.currentLetterId;

        const updateProgress = (message, progress) => {
            if (progressSection) {
                statusBar.textContent = message;
                statusBar.className = 'status-bar status-processing';
                progressBar.style.width = `${progress}%`;
            }
        };

        switch (result.type) {
            case 'progress':
                if (progressSection) {
                    progressSection.classList.add('visible');
                    button.disabled = true;
                    button.innerHTML = '<div class="loading-spinner"></div> Processing...';
                    updateProgress(result.message, result.progress);
                }
                break;

            case 'complete':
                if (result.data && Array.isArray(result.data)) {
                    this.updateUIAfterObjectionProcessing(uploadCaseId, uploadLetterId, result.data);
                }
                
                if (progressSection) {
                    statusBar.className = 'status-bar status-success';
                    updateProgress('Processing complete! All objections extracted.', 100);
                    button.disabled = false;
                    button.innerHTML = "Upload Opponent's Response";
                    setTimeout(() => {
                        progressSection.classList.remove('visible');
                    }, 3000);
                }
                break;

            case 'error':
                if (progressSection) {
                    progressSection.classList.add('visible');
                    statusBar.className = 'status-bar status-error';
                    updateProgress(`Error: ${result.message}`, 100);
                    button.disabled = false;
                    button.innerHTML = "Upload Opponent's Response";
                    setTimeout(() => {
                        progressSection.classList.remove('visible');
                    }, 5000);
                }
                break;

            case 'cancel':
                if (progressSection && button) {
                    button.disabled = false;
                    button.innerHTML = "Upload Opponent's Response";
                    progressSection.classList.remove('visible');
                }
                break;
        }
    }

    handleRequestProgress(result) {
        const progressSection = document.getElementById('request-progress-section');
        const statusBar = document.getElementById('request-status-bar');
        const progressBar = document.getElementById('request-progress-bar');
        const button = document.querySelector('[data-action="upload-request"]');

        const uploadCaseId = this.app.state.currentCaseId;

        const updateProgress = (message, progress) => {
            if (progressSection) {
                statusBar.textContent = message;
                progressBar.style.width = `${progress}%`;
            }
        };

        switch (result.type) {
            case 'progress':
                if (progressSection) {
                    progressSection.classList.add('visible');
                    button.disabled = true;
                    button.innerHTML = '<div class="loading-spinner"></div> Processing...';
                    updateProgress(result.message, result.progress);
                }
                break;

            case 'complete':
                if (result.data && Array.isArray(result.data)) {
                    this.handleNewRequestLetter(uploadCaseId, result.data);
                }

                if (progressSection) {
                    statusBar.className = 'status-bar status-success';
                    updateProgress('Processing complete! New request letter added.', 100);
                    button.disabled = false;
                    button.innerHTML = 'Upload Request Letter';
                    setTimeout(() => {
                        progressSection.classList.remove('visible');
                    }, 3000);
                }
                break;

            case 'error':
                if (progressSection) {
                    progressSection.classList.add('visible');
                    statusBar.className = 'status-bar status-error';
                    updateProgress(`Error: ${result.message}`, 100);
                    button.disabled = false;
                    button.innerHTML = 'Upload Request Letter';
                    setTimeout(() => {
                        progressSection.classList.remove('visible');
                    }, 5000);
                }
                break;

            case 'cancel':
                if (progressSection && button) {
                    button.disabled = false;
                    button.innerHTML = 'Upload Request Letter';
                    progressSection.classList.remove('visible');
                }
                break;
        }
    }

    handleLetterProgress(progress) {
        // Optionally, update UI here if you want to show backend progress events
        // For now, we update in handleGenerateLetter directly
        // Example: console.log('Letter progress:', progress);
    }

    // Helper methods
    updateUIAfterObjectionProcessing(caseId, letterId, updatedRequests) {
        const caseData = this.app.dataManager.getCase(caseId);
        if (!caseData) return;

        const letterData = this.app.dataManager.getLetter(caseId, letterId);
        if (!letterData) return;

        // Update the requests with new objections
        updatedRequests.forEach(obj => {
            const requestToUpdate = letterData.requests.find(r => r.id === obj.id);
            if (requestToUpdate) {
                requestToUpdate.objection = obj.objection;
            }
        });

        // Update UI based on current view
        const currentView = document.body.className;
        switch (currentView) {
            case 'cases-view-active':
                this.app.viewManager.renderCasesDashboard();
                break;
            case 'request-letters-active':
                this.app.viewManager.renderRequestLettersView(caseId);
                break;
            case 'dispute-list-active':
                this.app.viewManager.renderDisputeListView(letterId);
                break;
            case 'focus-mode-active':
                if (caseId === this.app.state.currentCaseId && letterId === this.app.state.currentLetterId) {
                    this.app.viewManager.renderFocusView(this.app.state.currentFocusIndex);
                }
                break;
        }
    }

    handleNewRequestLetter(caseId, requests) {
        const caseData = this.app.dataManager.getCase(caseId);
        if (caseData) {
            const newLetter = {
                id: `rog-set${caseData.requestLetters.length + 1}`,
                dateAdded: new Date().toISOString().split('T')[0],
                description: `Set ${caseData.requestLetters.length + 1} of Interrogatories`,
                requests: requests.map(req => ({
                    ...req,
                    objection: null,
                    reply: null
                }))
            };
            this.app.dataManager.addLetter(caseId, newLetter);

            // Update UI based on current view
            const currentView = document.body.className;
            switch (currentView) {
                case 'cases-view-active':
                    this.app.viewManager.renderCasesDashboard();
                    break;
                case 'request-letters-active':
                    if (this.app.state.currentCaseId === caseId) {
                        this.app.viewManager.renderRequestLettersView(caseId);
                    }
                    break;
            }
        }
    }

    async handleGenerateReplies() {
        const button = document.querySelector('[data-action="focus-generate"]');
        const replyEditor = document.getElementById('focus-reply-editor');
        const caseData = this.app.getCurrentCase();
        const letterData = this.app.getCurrentLetter();
        const request = letterData.requests[this.app.state.currentFocusIndex];
        const objectionText = document.getElementById('focus-objection-textarea').value.trim();

        if (!objectionText) { 
            alert("Please enter an objection first."); 
            return; 
        }
        
        request.objection = objectionText;
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div>';
        replyEditor.innerHTML = '';

        try {
            const payload = { requestText: request.text, objectionText: objectionText };
            const result = await window.electronAPI.askGemini(payload);
            if (result.success) {
                request.reply = result.html;
                replyEditor.innerHTML = result.html;
                await this.app.autoSave.triggerAutoSave();
            } else {
                replyEditor.innerHTML = `<div style="color:red;">Error: ${result.error}</div>`;
            }
        } catch (error) {
            replyEditor.innerHTML = `<div style="color:red;">A critical error occurred: ${error.message}</div>`;
        } finally {
            button.disabled = false;
            button.textContent = 'Generate';
        }
    }

    async handleGenerateAllReplies() {
        const button = document.querySelector('[data-action="generate-all"]');
        const progressSection = document.getElementById('dispute-progress-section');
        const statusBar = document.getElementById('dispute-status-bar');
        const progressBar = document.getElementById('dispute-progress-bar');
        
        const caseData = this.app.getCurrentCase();
        if (!caseData) return;

        const letterData = this.app.getCurrentLetter();
        if (!letterData) return;

        const requestsToProcess = letterData.requests.filter(r => r.objection && !r.reply);

        if (requestsToProcess.length === 0) {
            alert("No pending replies to generate.");
            return;
        }

        const totalToProcess = requestsToProcess.length;
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div> Generating...';
        
        // Show progress section
        progressSection.classList.add('visible');
        statusBar.textContent = `Preparing to generate ${totalToProcess} replies...`;
        statusBar.className = 'status-bar status-processing';
        progressBar.style.width = '0%';

        try {
            let completedCount = 0;
            for (const request of requestsToProcess) {
                // Update progress for current request
                const progress = (completedCount / totalToProcess) * 100;
                statusBar.textContent = `Generating reply ${completedCount + 1} of ${totalToProcess} (Request #${request.id})...`;
                progressBar.style.width = `${progress}%`;
                
                const payload = { requestText: request.text, objectionText: request.objection };
                const result = await window.electronAPI.askGemini(payload);

                if (result.success) {
                    request.reply = result.html;
                    
                    // Update status in dispute list view if visible
                    if (!document.body.classList.contains('focus-mode-active')) {
                        const disputeRow = document.querySelector(`#table-body tr[data-index="${letterData.requests.indexOf(request)}"]`);
                        if (disputeRow) {
                            this.updateRequestStatus(request, disputeRow);
                        }
                    }

                    // Update status in request letters view
                    const letterRow = document.querySelector(`#request-letters-table tr[data-letter-id="${letterData.id}"]`);
                    if (letterRow) {
                        this.updateLetterStatus(letterData, letterRow);
                    }
                    
                    // Update focus view if we're viewing this request
                    if (document.body.classList.contains('focus-mode-active')) {
                        const currentRequest = letterData.requests[this.app.state.currentFocusIndex];
                        if (currentRequest && currentRequest.id === request.id) {
                            const replyEditor = document.getElementById('focus-reply-editor');
                            if (replyEditor) {
                                replyEditor.innerHTML = result.html;
                            }
                        }
                    }
                } else {
                    request.reply = `<div style="color:red;">Error generating reply: ${result.error}</div>`;
                    console.error(`Failed to generate reply for request #${request.id}`, result.error);
                }
                
                completedCount++;
            }

            // Update final progress
            statusBar.textContent = 'All pending replies have been generated!';
            statusBar.className = 'status-bar status-success';
            progressBar.style.width = '100%';

            setTimeout(() => {
                progressSection.classList.remove('visible');
            }, 3000);

        } catch (error) {
            statusBar.textContent = `A critical error occurred: ${error.message}`;
            statusBar.className = 'status-bar status-error';
            setTimeout(() => {
                progressSection.classList.remove('visible');
            }, 5000);
        } finally {
            button.disabled = false;
            button.textContent = "Generate All Pending Replies";
        }
    }

    async handleGenerateLetter() {
        const button = document.querySelector('[data-action="generate-letter"]');
        const previewContent = document.getElementById('letter-preview-content');
        const progressPanel = document.querySelector('.generation-progress');
        const progressBar = progressPanel.querySelector('.progress-bar');
        const progressStatus = progressPanel.querySelector('.progress-status');
        const stages = ['setup', 'header', 'body', 'conclusion', 'formatting'];
        const stagePercents = { setup: 0, header: 10, body: 20, conclusion: 90, formatting: 100 };
        const caseData = this.app.getCurrentCase();
        const letterData = this.app.getCurrentLetter();
        if (!caseData || !letterData) {
            alert('No case or letter selected.');
            return;
        }
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div> Building...';
        previewContent.innerHTML = '';
        progressPanel.style.display = '';
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Starting letter generation...';
        stages.forEach(stage => {
            const el = progressPanel.querySelector(`.progress-stage[data-stage="${stage}"]`);
            if (el) el.classList.remove('active', 'completed');
        });
        // Helper to update progress UI
        const setStage = (stage, percent, message) => {
            stages.forEach(s => {
                const el = progressPanel.querySelector(`.progress-stage[data-stage="${s}"]`);
                if (el) el.classList.toggle('active', s === stage);
                if (el && stages.indexOf(s) < stages.indexOf(stage)) el.classList.add('completed');
            });
            progressBar.style.width = percent + '%';
            progressStatus.textContent = message;
        };
        try {
            // 1. Header
            setStage('header', 10, 'Generating header...');
            const headerResult = await window.electronAPI.generateLetterSection({ type: 'header', caseName: caseData.caseName, letterDescription: letterData.description });
            if (!headerResult.success) throw new Error(headerResult.error);
            previewContent.innerHTML = headerResult.html;
            // 2. Each request
            setStage('body', 20, 'Processing requests...');
            for (let i = 0; i < letterData.requests.length; i++) {
                setStage('body', 20 + Math.floor(60 * (i / letterData.requests.length)), `Processing request ${i + 1} of ${letterData.requests.length}...`);
                const req = letterData.requests[i];
                const reqResult = await window.electronAPI.generateLetterSection({ type: 'request', request: req, requestTopic: '', caseName: caseData.caseName, letterDescription: letterData.description });
                if (!reqResult.success) throw new Error(reqResult.error);
                previewContent.innerHTML += reqResult.html;
            }
            // 3. Conclusion
            setStage('conclusion', 90, 'Adding conclusion...');
            const conclusionResult = await window.electronAPI.generateLetterSection({ type: 'conclusion', caseName: caseData.caseName, letterDescription: letterData.description });
            if (!conclusionResult.success) throw new Error(conclusionResult.error);
            previewContent.innerHTML += conclusionResult.html;
            // 4. Formatting
            setStage('formatting', 100, 'Final formatting...');
            
            // 5. Save the generated letter
            setStage('formatting', 100, 'Saving letter...');
            const stats = this.app.dataManager.getLetterStats(caseData.caseId, letterData.id);
            if (stats) {
                const saveResult = await window.electronAPI.saveResponseLetterVersion({
                    caseId: caseData.caseId,
                    letterId: letterData.id,
                    content: previewContent.innerHTML,
                    stats: stats
                });
                
                if (saveResult.success) {
                    progressStatus.textContent = `Letter saved as Version ${saveResult.version.id}`;
                } else {
                    progressStatus.textContent = 'Letter generated but failed to save: ' + (saveResult.error || 'Unknown error');
                }
            } else {
                progressStatus.textContent = 'Letter generated but failed to save: Could not get letter statistics';
            }
            
            setTimeout(() => { progressPanel.style.display = 'none'; }, 1500);
        } catch (error) {
            progressStatus.textContent = 'Error: ' + error.message;
            progressBar.style.width = '100%';
            setTimeout(() => { progressPanel.style.display = 'none'; }, 3000);
        } finally {
            button.disabled = false;
            button.textContent = 'Build Response Letter';
        }
    }

    async handleViewSavedLetters() {
        const caseData = this.app.getCurrentCase();
        const letterData = this.app.getCurrentLetter();
        
        if (!caseData || !letterData) {
            alert('No case or letter selected.');
            return;
        }

        try {
            const versions = await window.electronAPI.getResponseLetterVersions({
                caseId: caseData.caseId,
                letterId: letterData.id
            });

            if (versions.length === 0) {
                alert('No saved letters found for this request letter.\n\nGenerate a response letter first, then you can view and manage saved versions here.');
                return;
            }

            this.showVersionHistoryModal(versions);
        } catch (error) {
            console.error('Error loading saved letters:', error);
            alert('Error loading saved letters: ' + error.message);
        }
    }

    showVersionHistoryModal(versions) {
        const modal = document.getElementById('version-history-modal');
        const versionList = document.getElementById('version-list');
        
        if (!modal || !versionList) return;

        versionList.innerHTML = '';
        
        if (versions.length === 0) {
            versionList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>No saved versions found for this request letter.</p>
                    <p>Generate a response letter first to create saved versions.</p>
                </div>
            `;
        } else {
            versions.forEach(version => {
                const versionItem = document.createElement('div');
                versionItem.className = 'version-item';
                
                const date = new Date(version.generatedAt).toLocaleString();
                const stats = version.stats;
                
                versionItem.innerHTML = `
                    <div class="version-info">
                        <div class="version-date">${date}</div>
                        <div>${version.description}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${stats.totalRequests} requests, ${stats.withObjections} objections, ${stats.withResponses} responses
                        </div>
                    </div>
                    <div class="version-actions">
                        <button class="btn btn-secondary" onclick="window.app.eventHandlers.previewVersion(${version.id})">Preview</button>
                        <button class="btn btn-primary" onclick="window.app.eventHandlers.loadVersion(${version.id})">Load</button>
                    </div>
                `;
                
                versionList.appendChild(versionItem);
            });
        }

        modal.classList.add('visible');
    }

    async previewVersion(versionId) {
        const caseData = this.app.getCurrentCase();
        if (!caseData) return;

        try {
            const version = await window.electronAPI.getResponseLetterVersion({
                caseId: caseData.caseId,
                versionId: versionId
            });

            if (!version) {
                alert('Version not found.');
                return;
            }

            const modal = document.getElementById('preview-modal');
            const title = document.getElementById('preview-modal-title');
            const content = document.getElementById('preview-content');
            
            if (!modal || !title || !content) return;

            title.textContent = `Preview - ${version.description}`;
            content.innerHTML = version.content;
            modal.classList.add('visible');
        } catch (error) {
            console.error('Error previewing version:', error);
            alert('Error previewing version: ' + error.message);
        }
    }

    async loadVersion(versionId) {
        const caseData = this.app.getCurrentCase();
        if (!caseData) return;

        try {
            const version = await window.electronAPI.getResponseLetterVersion({
                caseId: caseData.caseId,
                versionId: versionId
            });

            if (!version) {
                alert('Version not found.');
                return;
            }

            const previewContent = document.getElementById('letter-preview-content');
            if (previewContent) {
                previewContent.innerHTML = version.content;
            }

            // Hide the version history modal
            const modal = document.getElementById('version-history-modal');
            if (modal) {
                modal.classList.remove('visible');
            }

            // Show success message
            const progressPanel = document.querySelector('.generation-progress');
            if (progressPanel) {
                progressPanel.style.display = '';
                const progressStatus = progressPanel.querySelector('.progress-status');
                if (progressStatus) {
                    progressStatus.textContent = `Loaded ${version.description}`;
                    setTimeout(() => {
                        progressPanel.style.display = 'none';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error loading version:', error);
            alert('Error loading version: ' + error.message);
        }
    }

    async saveCurrentLetter() {
        const caseData = this.app.getCurrentCase();
        const letterData = this.app.getCurrentLetter();
        const previewContent = document.getElementById('letter-preview-content');
        
        if (!caseData || !letterData || !previewContent) {
            alert('No case, letter, or content to save.');
            return;
        }

        const content = previewContent.innerHTML.trim();
        if (!content) {
            alert('No content to save.');
            return;
        }

        try {
            const stats = this.app.dataManager.getLetterStats(caseData.caseId, letterData.id);
            if (!stats) {
                alert('Could not get letter statistics.');
                return;
            }

            const saveResult = await window.electronAPI.saveResponseLetterVersion({
                caseId: caseData.caseId,
                letterId: letterData.id,
                content: content,
                stats: stats
            });

            if (saveResult.success) {
                alert(`Letter saved as Version ${saveResult.version.id}`);
            } else {
                alert('Failed to save letter: ' + (saveResult.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving current letter:', error);
            alert('Error saving letter: ' + error.message);
        }
    }

    async exportLetter(format) {
        const caseData = this.app.getCurrentCase();
        const letterData = this.app.getCurrentLetter();
        const previewContent = document.getElementById('letter-preview-content');
        
        if (!caseData || !letterData || !previewContent) {
            alert('No case, letter, or content to export.');
            return;
        }

        const content = previewContent.innerHTML.trim();
        if (!content) {
            alert('No content to export. Please generate or load a letter first.');
            return;
        }

        // Generate a default filename
        const timestamp = new Date().toISOString().split('T')[0];
        const defaultFileName = `${caseData.caseName.replace(/[^a-zA-Z0-9]/g, '_')}_Response_Letter_${timestamp}`;

        try {
            let result;
            if (format === 'pdf') {
                result = await window.electronAPI.exportLetterToPDF(content, defaultFileName);
            } else if (format === 'docx') {
                result = await window.electronAPI.exportLetterToDOCX(content, defaultFileName);
            } else {
                alert('Unsupported export format.');
                return;
            }

            if (result.success) {
                alert(`${format.toUpperCase()} export completed successfully!`);
            } else {
                alert(`Export failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error exporting letter:', error);
            alert('Error exporting letter: ' + error.message);
        }
    }

    // Status update helpers
    updateRequestStatus(request, tableRow) {
        const hasObjection = request.objection && request.objection.trim() !== '';
        const hasReply = request.reply && request.reply.trim() !== '';
        
        let statusIcon = '';
        let statusColor = '';
        
        if (hasObjection) {
            if (hasReply) {
                statusIcon = '✔';
                statusColor = 'var(--action-green)';
            } else {
                statusIcon = '!';
                statusColor = '#ffc107';
            }
        } else {
            statusIcon = '—';
            statusColor = '#dc3545';
        }

        const statusSpan = tableRow.querySelector('.col-number span');
        if (statusSpan) {
            statusSpan.style.color = statusColor;
            statusSpan.textContent = statusIcon;
        }
    }

    updateLetterStatus(letterData, letterRow) {
        const unresolvedCount = letterData.requests.filter(r => r.objection && !r.reply).length;
        const totalRequests = letterData.requests.length;
        const objectionCount = letterData.requests.filter(r => r.objection).length;
        
        let status = '';
        let statusColor = '';
        
        if (objectionCount === 0) {
            status = 'Awaiting Responses';
            statusColor = 'var(--secondary-gray)';
        } else if (unresolvedCount === 0) {
            status = 'All Replied';
            statusColor = 'var(--action-green)';
        } else {
            status = `${unresolvedCount} Need Reply`;
            statusColor = '#ffc107';
        }

        const statusCell = letterRow.querySelector('td:last-child span');
        if (statusCell) {
            statusCell.style.color = statusColor;
            statusCell.textContent = status;
        }
    }

    handleCreateNewCase() {
        const caseName = document.getElementById('case-name-input')?.value?.trim();
        if (!caseName) {
            alert('Please enter a case name');
            return;
        }

        // Collect all case details
        const caseData = {
            caseNumber: document.getElementById('case-number-input')?.value?.trim() || '',
            court: document.getElementById('court-input')?.value?.trim() || '',
            judge: document.getElementById('judge-input')?.value?.trim() || '',
            filingDate: document.getElementById('filing-date-input')?.value || '',
            plaintiff: document.getElementById('plaintiff-input')?.value?.trim() || '',
            defendants: document.getElementById('defendants-input')?.value?.split(',').map(d => d.trim()).filter(d => d) || [],
            caseType: document.getElementById('case-type-input')?.value?.trim() || '',
            jurisdiction: document.getElementById('jurisdiction-input')?.value || '',
            venue: document.getElementById('venue-input')?.value?.trim() || '',
            status: document.getElementById('status-input')?.value || 'Active',
            discoveryDeadline: document.getElementById('discovery-deadline-input')?.value || '',
            trialDate: document.getElementById('trial-date-input')?.value || ''
        };

        const newCase = {
            caseId: this.generateCaseId(caseName),
            caseName: caseName,
            version: "1.1",
            caseData: caseData,
            requestLetters: []
        };

        try {
            this.app.dataManager.validateCaseData(newCase);
            this.app.dataManager.addCase(newCase);
            this.app.dataManager.saveCase(newCase);
            
            // Clear form
            this.clearNewCaseForm();
            
            // Hide modal
            this.app.viewManager.hideAddCaseModal();
            
            // Re-render dashboard
            this.app.viewManager.renderCasesDashboard();
            
            alert('Case created successfully!');
        } catch (error) {
            console.error('Error creating case:', error);
            alert('Error creating case: ' + error.message);
        }
    }

    clearNewCaseForm() {
        const fields = [
            'case-name-input',
            'case-number-input',
            'court-input',
            'judge-input',
            'filing-date-input',
            'plaintiff-input',
            'defendants-input',
            'case-type-input',
            'jurisdiction-input',
            'venue-input',
            'status-input',
            'discovery-deadline-input',
            'trial-date-input'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
    }

    handleZoomIn() {
        const previewContent = document.getElementById('letter-preview-content');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (!previewContent || !zoomLevel) {
            console.warn('Zoom elements not found:', { previewContent: !!previewContent, zoomLevel: !!zoomLevel });
            return;
        }
        
        // Get current zoom level more reliably
        const currentZoom = this.getCurrentZoomLevel(previewContent);
        const newZoom = Math.min(currentZoom + 0.1, 3.0); // Max zoom 300%
        
        console.log('Zoom in:', { currentZoom, newZoom });
        
        previewContent.style.transform = `scale(${newZoom})`;
        zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
    }

    handleZoomOut() {
        const previewContent = document.getElementById('letter-preview-content');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (!previewContent || !zoomLevel) {
            console.warn('Zoom elements not found:', { previewContent: !!previewContent, zoomLevel: !!zoomLevel });
            return;
        }
        
        // Get current zoom level more reliably
        const currentZoom = this.getCurrentZoomLevel(previewContent);
        const newZoom = Math.max(currentZoom - 0.1, 0.3); // Min zoom 30%
        
        console.log('Zoom out:', { currentZoom, newZoom });
        
        previewContent.style.transform = `scale(${newZoom})`;
        zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
    }

    handleZoomReset() {
        const previewContent = document.getElementById('letter-preview-content');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (!previewContent || !zoomLevel) {
            console.warn('Zoom elements not found:', { previewContent: !!previewContent, zoomLevel: !!zoomLevel });
            return;
        }
        
        console.log('Zoom reset');
        
        previewContent.style.transform = 'scale(1)';
        zoomLevel.textContent = '100%';
    }

    getCurrentZoomLevel(element) {
        const transform = element.style.transform;
        if (!transform || transform === 'none') {
            return 1.0;
        }
        
        // Parse scale value from transform string
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            const scaleValue = parseFloat(scaleMatch[1]);
            return isNaN(scaleValue) ? 1.0 : scaleValue;
        }
        
        return 1.0;
    }

    // Test function for debugging zoom functionality
    testZoom() {
        console.log('Testing zoom functionality...');
        
        const previewContent = document.getElementById('letter-preview-content');
        const zoomLevel = document.getElementById('zoom-level');
        
        console.log('Elements found:', { 
            previewContent: !!previewContent, 
            zoomLevel: !!zoomLevel 
        });
        
        if (previewContent) {
            console.log('Current transform:', previewContent.style.transform);
            console.log('Current zoom level:', this.getCurrentZoomLevel(previewContent));
        }
        
        if (zoomLevel) {
            console.log('Zoom level text:', zoomLevel.textContent);
        }
        
        // Test zoom in
        console.log('Testing zoom in...');
        this.handleZoomIn();
        
        // Test zoom out
        console.log('Testing zoom out...');
        this.handleZoomOut();
        
        // Test reset
        console.log('Testing zoom reset...');
        this.handleZoomReset();
    }

    handleEditCaseDetails(event) {
        const caseCard = event.target.closest('.case-card');
        const caseId = caseCard?.dataset.caseId;
        
        if (!caseId) return;
        
        const caseData = this.app.dataManager.getCase(caseId);
        if (!caseData) return;
        
        this.showCaseDetailsModal(caseData);
    }

    showCaseDetailsModal(caseData) {
        const modal = document.getElementById('case-details-modal');
        if (!modal) return;
        
        // Fill the form with existing data
        this.fillCaseDetailsForm(caseData);
        
        // Store the case ID for saving
        modal.dataset.caseId = caseData.caseId;
        
        modal.classList.add('visible');
    }

    fillCaseDetailsForm(caseData) {
        const fields = [
            'edit-case-name-input',
            'edit-case-number-input',
            'edit-court-input',
            'edit-judge-input',
            'edit-filing-date-input',
            'edit-plaintiff-input',
            'edit-defendants-input',
            'edit-case-type-input',
            'edit-jurisdiction-input',
            'edit-venue-input',
            'edit-status-input',
            'edit-discovery-deadline-input',
            'edit-trial-date-input'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (!element) return;
            
            const fieldName = fieldId.replace('edit-', '').replace('-input', '');
            let value = '';
            
            if (fieldName === 'case-name') {
                value = caseData.caseName || '';
            } else if (caseData.caseData) {
                if (fieldName === 'defendants') {
                    value = Array.isArray(caseData.caseData.defendants) 
                        ? caseData.caseData.defendants.join(', ') 
                        : caseData.caseData.defendants || '';
                } else {
                    value = caseData.caseData[fieldName] || '';
                }
            }
            
            if (element.type === 'date' && value) {
                // Convert date string to YYYY-MM-DD format for date inputs
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    value = date.toISOString().split('T')[0];
                }
            }
            
            element.value = value;
        });
    }

    async saveCaseDetails() {
        const modal = document.getElementById('case-details-modal');
        const caseId = modal?.dataset.caseId;
        
        if (!caseId) return;
        
        const caseData = this.app.dataManager.getCase(caseId);
        if (!caseData) return;
        
        // Collect form data
        const updatedCaseData = {
            ...caseData,
            caseName: document.getElementById('edit-case-name-input')?.value || '',
            caseData: {
                caseNumber: document.getElementById('edit-case-number-input')?.value || '',
                court: document.getElementById('edit-court-input')?.value || '',
                judge: document.getElementById('edit-judge-input')?.value || '',
                filingDate: document.getElementById('edit-filing-date-input')?.value || '',
                plaintiff: document.getElementById('edit-plaintiff-input')?.value || '',
                defendants: document.getElementById('edit-defendants-input')?.value?.split(',').map(d => d.trim()).filter(d => d) || [],
                caseType: document.getElementById('edit-case-type-input')?.value || '',
                jurisdiction: document.getElementById('edit-jurisdiction-input')?.value || '',
                venue: document.getElementById('edit-venue-input')?.value || '',
                status: document.getElementById('edit-status-input')?.value || '',
                discoveryDeadline: document.getElementById('edit-discovery-deadline-input')?.value || '',
                trialDate: document.getElementById('edit-trial-date-input')?.value || ''
            }
        };
        
        try {
            // Validate and save
            this.app.dataManager.validateCaseData(updatedCaseData);
            await this.app.dataManager.saveCase(updatedCaseData);
            
            // Update the case in memory
            const caseIndex = this.app.dataManager.cases.findIndex(c => c.caseId === caseId);
            if (caseIndex !== -1) {
                this.app.dataManager.cases[caseIndex] = updatedCaseData;
            }
            
            // Re-render the dashboard
            this.app.viewManager.renderCasesDashboard();
            
            // Hide modal
            this.hideCaseDetailsModal();
            
            // Show subtle success indicator
            this.showSaveSuccessIndicator();
        } catch (error) {
            console.error('Error saving case details:', error);
            // Show error in a subtle way
            this.showSaveErrorIndicator(error.message);
        }
    }

    showSaveSuccessIndicator() {
        // Create a subtle success indicator
        const indicator = document.createElement('div');
        indicator.className = 'save-success-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
            <span>Case details saved</span>
        `;
        
        document.body.appendChild(indicator);
        
        // Remove after 2 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    showSaveErrorIndicator(errorMessage) {
        // Create a subtle error indicator
        const indicator = document.createElement('div');
        indicator.className = 'save-error-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>
            <span>Save failed: ${errorMessage}</span>
        `;
        
        document.body.appendChild(indicator);
        
        // Remove after 4 seconds (longer for errors)
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 4000);
    }

    hideCaseDetailsModal() {
        const modal = document.getElementById('case-details-modal');
        if (modal) {
            modal.classList.remove('visible');
            modal.removeAttribute('data-case-id');
        }
    }
} 