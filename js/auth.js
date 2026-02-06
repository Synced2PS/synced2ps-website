// auth.js - Secure Admin Authentication System
const ADMIN_PASSWORD = "s2ps@S2PS@";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.sessionStart = null;
        this.init();
    }

    init() {
        // Check for existing session
        const session = localStorage.getItem('admin_session');
        if (session) {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            
            if (sessionData.expires > now && sessionData.password === ADMIN_PASSWORD) {
                this.isAuthenticated = true;
                this.sessionStart = sessionData.start;
                console.log("Admin session restored");
            } else {
                localStorage.removeItem('admin_session');
            }
        }
    }

    authenticate(password) {
        if (password === ADMIN_PASSWORD) {
            this.isAuthenticated = true;
            this.sessionStart = Date.now();
            
            // Store session
            const sessionData = {
                password: ADMIN_PASSWORD,
                start: this.sessionStart,
                expires: this.sessionStart + SESSION_TIMEOUT
            };
            localStorage.setItem('admin_session', JSON.stringify(sessionData));
            
            return true;
        }
        return false;
    }

    logout() {
        this.isAuthenticated = false;
        this.sessionStart = null;
        localStorage.removeItem('admin_session');
        window.location.href = 'index.html';
    }

    checkSession() {
        if (!this.isAuthenticated) return false;
        
        const session = localStorage.getItem('admin_session');
        if (!session) {
            this.logout();
            return false;
        }
        
        const sessionData = JSON.parse(session);
        if (Date.now() > sessionData.expires) {
            this.logout();
            return false;
        }
        
        return true;
    }

    getSessionStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            sessionStart: this.sessionStart,
            expires: this.sessionStart ? this.sessionStart + SESSION_TIMEOUT : null
        };
    }
}

// Global auth instance
window.authManager = new AuthManager();
