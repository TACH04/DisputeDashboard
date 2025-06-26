const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Data storage configuration
const DATA_DIR = path.join(app.getPath('userData'), 'case_data');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const CURRENT_DATA_VERSION = '1.1';

class DataService {
    constructor() {
        this.initializeDataDirectories();
    }

    async initializeDataDirectories() {
        try {
            await fs.promises.mkdir(DATA_DIR, { recursive: true });
            await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
            console.log('Data directories initialized');
        } catch (error) {
            console.error('Error initializing data directories:', error);
        }
    }

    async createBackup(caseId) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `${caseId}_${timestamp}.json`);
            const caseData = await this.loadCaseData(caseId);
            await fs.promises.writeFile(backupPath, JSON.stringify(caseData, null, 2));
            
            // Keep only last 5 backups per case
            const backups = await fs.promises.readdir(BACKUP_DIR);
            const caseBackups = backups.filter(f => f.startsWith(caseId));
            if (caseBackups.length > 5) {
                const oldestBackup = caseBackups.sort()[0];
                await fs.promises.unlink(path.join(BACKUP_DIR, oldestBackup));
            }
        } catch (error) {
            console.error(`Error creating backup for case ${caseId}:`, error);
        }
    }

    async saveCaseData(caseData) {
        try {
            const caseDir = path.join(DATA_DIR, caseData.caseId);
            if (!fs.existsSync(caseDir)) {
                fs.mkdirSync(caseDir, { recursive: true });
            }

            // Save main case data with version stamp
            const caseFile = path.join(caseDir, 'case.json');
            caseData.version = CURRENT_DATA_VERSION;
            await fs.promises.writeFile(caseFile, JSON.stringify(caseData, null, 2));

            // Save version history if it exists
            if (caseData.letterVersions && caseData.letterVersions.length > 0) {
                const versionsDir = path.join(caseDir, 'versions');
                if (!fs.existsSync(versionsDir)) {
                    fs.mkdirSync(versionsDir, { recursive: true });
                }

                // Save each version in a separate file
                for (const version of caseData.letterVersions) {
                    const versionFile = path.join(versionsDir, `${version.id}.json`);
                    await fs.promises.writeFile(versionFile, JSON.stringify(version, null, 2));
                }
            }

            await this.createBackup(caseData.caseId);
            return true;
        } catch (error) {
            console.error('Error saving case data:', error);
            return false;
        }
    }

    async loadCaseData(caseId) {
        try {
            const caseDir = path.join(DATA_DIR, caseId);
            const caseFile = path.join(caseDir, 'case.json');
            
            if (!fs.existsSync(caseFile)) {
                return null;
            }

            // Load main case data
            let caseData = JSON.parse(await fs.promises.readFile(caseFile, 'utf8'));

            // Only load cases that are already in version 1.1 format
            if (!caseData.version || caseData.version !== CURRENT_DATA_VERSION) {
                console.log(`Deleting old format case: ${caseId} (version: ${caseData.version || 'none'})`);
                await this.deleteCase(caseId);
                return null;
            }

            // Load version history if it exists
            const versionsDir = path.join(caseDir, 'versions');
            if (fs.existsSync(versionsDir)) {
                const versionFiles = await fs.promises.readdir(versionsDir);
                caseData.letterVersions = [];
                
                for (const file of versionFiles) {
                    if (file.endsWith('.json')) {
                        const versionFile = path.join(versionsDir, file);
                        const version = JSON.parse(await fs.promises.readFile(versionFile, 'utf8'));
                        caseData.letterVersions.push(version);
                    }
                }

                // Sort versions by timestamp
                caseData.letterVersions.sort((a, b) => b.id - a.id);
            }

            return caseData;
        } catch (error) {
            console.error('Error loading case data:', error);
            return null;
        }
    }

    async deleteCase(caseId) {
        try {
            const caseDir = path.join(DATA_DIR, caseId);
            if (fs.existsSync(caseDir)) {
                await fs.promises.rm(caseDir, { recursive: true, force: true });
                console.log(`Deleted case directory: ${caseId}`);
            }
        } catch (error) {
            console.error(`Error deleting case ${caseId}:`, error);
        }
    }

    async loadAllCases() {
        try {
            const files = await fs.promises.readdir(DATA_DIR);
            // Look for directories (case folders) instead of .json files
            const caseDirs = files.filter(f => {
                const fullPath = path.join(DATA_DIR, f);
                return fs.statSync(fullPath).isDirectory();
            });
            
            const cases = await Promise.all(
                caseDirs.map(async caseId => {
                    return await this.loadCaseData(caseId);
                })
            );
            return cases.filter(Boolean); // Remove any null results
        } catch (error) {
            console.error('Error loading all cases:', error);
            return [];
        }
    }

    async saveAllCases(cases) {
        try {
            await Promise.all(cases.map(caseData => this.saveCaseData(caseData)));
            return true;
        } catch (error) {
            console.error('Error saving all cases:', error);
            return false;
        }
    }

    async cleanupOldFormatCases() {
        try {
            console.log('Starting cleanup of old format cases...');
            const files = await fs.promises.readdir(DATA_DIR);
            const caseDirs = files.filter(f => {
                const fullPath = path.join(DATA_DIR, f);
                return fs.statSync(fullPath).isDirectory();
            });
            
            let deletedCount = 0;
            for (const caseId of caseDirs) {
                const caseFile = path.join(DATA_DIR, caseId, 'case.json');
                if (fs.existsSync(caseFile)) {
                    try {
                        const caseData = JSON.parse(await fs.promises.readFile(caseFile, 'utf8'));
                        if (!caseData.version || caseData.version !== CURRENT_DATA_VERSION) {
                            await this.deleteCase(caseId);
                            deletedCount++;
                        }
                    } catch (error) {
                        console.error(`Error reading case file ${caseFile}:`, error);
                        // If we can't read the file, it's probably corrupted, so delete it
                        await this.deleteCase(caseId);
                        deletedCount++;
                    }
                }
            }
            console.log(`Cleanup complete: deleted ${deletedCount} old format cases`);
            return deletedCount;
        } catch (error) {
            console.error('Error during cleanup:', error);
            return 0;
        }
    }
}

module.exports = DataService; 