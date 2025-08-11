// js/auth.js

class AuthManager {
    constructor() {
        this.msalInstance = null;
        this.account = null;
        this.accessToken = null;
    }

    // Initialize MSAL
    async initialize() {
        try {
            this.msalInstance = new msal.PublicClientApplication(APP_CONFIG.msalConfig);
            await this.msalInstance.initialize();
            
            // Check if user is already logged in
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.msalInstance.setActiveAccount(this.account);
                await this.getAccessToken();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error initializing MSAL:', error);
            return false;
        }
    }

    // Login with popup
    async login() {
        try {
            const loginResponse = await this.msalInstance.loginPopup(APP_CONFIG.loginRequest);
            this.account = loginResponse.account;
            this.msalInstance.setActiveAccount(this.account);
            this.accessToken = loginResponse.accessToken;
            
            // Store user info
            localStorage.setItem('userInfo', JSON.stringify({
                name: this.account.name,
                email: this.account.username,
                id: this.account.localAccountId
            }));
            
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            this.showError('Đăng nhập thất bại. Vui lòng thử lại.');
            return false;
        }
    }

    // Get access token silently
    async getAccessToken() {
        try {
            const tokenRequest = {
                ...APP_CONFIG.loginRequest,
                account: this.account
            };
            
            const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
            this.accessToken = response.accessToken;
            return this.accessToken;
        } catch (error) {
            console.error('Failed to get access token silently, trying popup...', error);
            
            // Try to get token with popup
            try {
                const response = await this.msalInstance.acquireTokenPopup(APP_CONFIG.loginRequest);
                this.accessToken = response.accessToken;
                return this.accessToken;
            } catch (popupError) {
                console.error('Failed to get access token with popup:', popupError);
                throw popupError;
            }
        }
    }

    // Logout
    async logout() {
        try {
            await this.msalInstance.logoutPopup({
                postLogoutRedirectUri: window.location.origin
            });
            
            // Clear local storage
            localStorage.removeItem('userInfo');
            sessionStorage.clear();
            
            this.account = null;
            this.accessToken = null;
        } catch (error) {
            console.error('Logout failed:', error);
            // Force clear session even if logout fails
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    }

    // Get current user info
    getUserInfo() {
        if (this.account) {
            return {
                name: this.account.name,
                email: this.account.username,
                id: this.account.localAccountId
            };
        }
        
        // Try to get from localStorage
        const stored = localStorage.getItem('userInfo');
        return stored ? JSON.parse(stored) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.account !== null && this.accessToken !== null;
    }

    // Get headers for API calls
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    // Show error message
    showError(message) {
        const toastElement = document.getElementById('toast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastElement && toastTitle && toastMessage) {
            toastTitle.textContent = 'Lỗi';
            toastMessage.textContent = message;
            
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        } else {
            alert(message);
        }
    }
}

// Create global instance
const authManager = new AuthManager();
