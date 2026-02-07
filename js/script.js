// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyBy1SyiwD4QSC2T7_pOSHrhIANfgqoxqju",
    authDomain: "synced2ps.firebaseapp.com",
    projectId: "synced2ps",
    storageBucket: "synced2ps.firebasestorage.app",
    messagingSenderId: "326576247559",
    appId: "1:326576247559:web:7829337e4fef2f7504eba2"
};

// Initialize Firebase
let db;
let firebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            firebaseInitialized = true;
            console.log("✅ Firebase initialized successfully!");
            return true;
        } else {
            console.warn("⚠️ Firebase scripts not loaded properly");
            return false;
        }
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
        return false;
    }
}

// ==================== ADMIN ACCESS SYSTEM ====================
const AdminAccess = (function() {
    "use strict";

    const ADMIN_URL = "admin.html";
    const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

    // SHA-256 of: s2ps@S2PS@ (THIS IS CORRECT)
    const ADMIN_PASSWORD_SHA256_HEX = "fa1581bb39a1c19ada61774f8419d3e58ea239dbf20916667f9b777d92a9a019";

    const K_AUTH = "admin_authenticated";
    const K_TS = "admin_timestamp";

    function now() {
        return Date.now();
    }

    async function sha256Hex(str) {
        try {
            const data = new TextEncoder().encode(str);
            const digest = await crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(digest))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        } catch (error) {
            console.error("SHA-256 error:", error);
            return "";
        }
    }

    function isAuthenticated() {
        if (sessionStorage.getItem(K_AUTH) !== "true") return false;
        const ts = Number(sessionStorage.getItem(K_TS));
        if (!ts || now() - ts > SESSION_TTL_MS) {
            sessionStorage.clear();
            return false;
        }
        return true;
    }

    function showAdminPasswordModal() {
        console.log("🛡️ Opening admin password modal...");
        const modal = document.getElementById("adminPasswordModal");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");

        if (!modal || !input || !error) {
            console.error("❌ Admin modal elements not found!");
            alert("Admin modal not loaded properly. Check console.");
            return;
        }

        input.value = "";
        error.style.display = "none";
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        input.focus();
        console.log("✅ Admin modal opened successfully");
    }

    function closeAdminPasswordModal() {
        const modal = document.getElementById("adminPasswordModal");
        if (!modal) return;
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
    }

    async function submitAdminPassword() {
        console.log("🔐 Checking admin password...");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");
        if (!input || !error) {
            console.error("❌ Password input or error element not found!");
            return;
        }

        const entered = input.value;
        console.log("Entered password (length):", entered.length);
        
        // Clear input immediately
        input.value = "";

        try {
            const hash = await sha256Hex(entered);
            console.log("Generated hash:", hash);
            console.log("Expected hash:", ADMIN_PASSWORD_SHA256_HEX);
            
            if (hash === ADMIN_PASSWORD_SHA256_HEX) {
                console.log("✅ Password correct! Granting access...");
                sessionStorage.setItem(K_AUTH, "true");
                sessionStorage.setItem(K_TS, String(now()));
                closeAdminPasswordModal();
                
                // Small delay to ensure modal closes
                setTimeout(() => {
                    window.open(ADMIN_URL, "_blank");
                    console.log("✅ Admin panel opened in new tab");
                }, 100);
            } else {
                console.log("❌ Password incorrect!");
                error.textContent = "Incorrect password. Try: s2ps@S2PS@";
                error.style.display = "block";
                input.focus();
            }
        } catch (err) {
            console.error("❌ Error during password check:", err);
            error.textContent = "System error. Please try again.";
            error.style.display = "block";
        }
    }

    // Initialize admin keyboard shortcut
    function initAdminShortcut() {
        console.log("⌨️ Setting up Ctrl+Shift+A shortcut...");
        document.addEventListener("keydown", e => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
                console.log("✅ Ctrl+Shift+A detected!");
                e.preventDefault();
                showAdminPasswordModal();
            }
        });

        // Close modal on outside click
        document.addEventListener("click", e => {
            const modal = document.getElementById("adminPasswordModal");
            if (modal && e.target === modal) {
                closeAdminPasswordModal();
                console.log("Modal closed by outside click");
            }
        });
        
        console.log("✅ Admin shortcuts initialized");
    }

    return {
        showAdminPasswordModal,
        submitAdminPassword,
        isAuthenticated,
        initAdminShortcut
    };
})();

// ==================== BASIC SETUP ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Website loaded - initializing...");
    
    // Initialize Firebase
    initializeFirebase();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('call-date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
        console.log("📅 Date input set to:", today);
    }
    
    // Set current year in footer
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
        console.log("📅 Year set to:", new Date().getFullYear());
    }
    
    // Initialize admin access
    AdminAccess.initAdminShortcut();
    
    // Initialize FAQ if exists
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', function() {
                    const isActive = item.classList.contains('active');
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) otherItem.classList.remove('active');
                    });
                    item.classList.toggle('active', !isActive);
                });
            }
        });
        console.log("✅ FAQ system initialized");
    }
    
    // Initialize booking buttons if they exist
    const bookCallButtons = document.querySelectorAll('.book-call-btn');
    if (bookCallButtons.length > 0) {
        bookCallButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const plan = this.getAttribute('data-plan');
                const price = this.getAttribute('data-price');
                console.log("📞 Booking modal requested for plan:", plan);
                // You'll need to add your openBookingModal function here
                alert("Booking system needs to be re-added. Plan: " + plan);
            });
        });
        console.log("✅ Booking buttons initialized");
    }
    
    console.log("✅ All systems initialized successfully!");
});

// Make AdminAccess available globally
window.AdminAccess = AdminAccess;
