const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// User profile storage
const USER_PROFILE_FILE = path.join(app.getPath('userData'), 'user_profile.json');

class UserProfileService {
    async saveUserProfile(profileData) {
        try {
            await fs.promises.writeFile(USER_PROFILE_FILE, JSON.stringify(profileData, null, 2));
            return { success: true };
        } catch (error) {
            console.error('Error saving user profile:', error);
            return { success: false, error: error.message };
        }
    }

    async loadUserProfile() {
        try {
            if (fs.existsSync(USER_PROFILE_FILE)) {
                const data = await fs.promises.readFile(USER_PROFILE_FILE, 'utf8');
                // IMPORTANT: Do not log the profile data here to avoid exposing the key in logs.
                return JSON.parse(data);
            }
            return {}; // Return empty object instead of null
        } catch (error) {
            console.error('Error loading user profile:', error);
            return {}; // Return empty object on error
        }
    }

    getUserDataPath() {
        return app.getPath('userData');
    }

    getOSInfo() {
        return process.platform + ' ' + process.version;
    }
}

module.exports = UserProfileService; 