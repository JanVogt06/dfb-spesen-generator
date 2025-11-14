// ===== API Configuration =====
const API_URL = 'http://localhost:8000';

// ===== App Configuration =====
const CONFIG = {
    api: {
        baseUrl: API_URL,
        timeout: 120000, // 2 minutes
        retryAttempts: 3,
        retryDelay: 2000 // 2 seconds
    },

    generation: {
        maxWaitTime: 120000, // 2 minutes
        statusCheckInterval: 2000 // 2 seconds
    },

    ui: {
        statusAutoHideDuration: 5000, // 5 seconds
        animationDuration: 300 // 300ms
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_URL, CONFIG };
}