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

    // FIXED: The CORRECT hash for "s2ps@S2PS@" 
    const ADMIN_PASSWORD_SHA256_HEX = "fa1581bb39a1c19ada61774f8419d3e58ea239dbf20916667f9b777d92a9a019";

    const K_AUTH = "admin_authenticated";
    const K_TS = "admin_timestamp";

    function now() {
        return Date.now();
    }

    async function sha256Hex(str) {
        try {
            // Test what hash we get
            console.log("Hashing string:", JSON.stringify(str));
            console.log("Length:", str.length);
            
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
            
            console.log("Generated hash:", hash);
            return hash;
        } catch (error) {
            console.error("SHA-256 error:", error);
            return "";
        }
    }

    function showAdminPasswordModal() {
        console.log("🛡️ Opening admin password modal...");
        const modal = document.getElementById("adminPasswordModal");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");

        if (!modal) {
            console.error("❌ Admin modal element not found!");
            return;
        }
        
        if (!input) {
            console.error("❌ Password input element not found!");
            return;
        }
        
        if (!error) {
            console.error("❌ Error message element not found!");
            return;
        }

        // Clear everything
        input.value = "";
        error.textContent = "";
        error.style.display = "none";
        
        // Show modal
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        
        // Focus on input
        setTimeout(() => input.focus(), 100);
        
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

        const entered = input.value.trim(); // ADDED .trim() to remove whitespace
        console.log("Entered password (trimmed):", JSON.stringify(entered));
        console.log("Length after trim:", entered.length);
        
        if (entered.length === 0) {
            error.textContent = "Please enter a password";
            error.style.display = "block";
            input.focus();
            return;
        }

        try {
            const hash = await sha256Hex(entered);
            console.log("Expected hash:", ADMIN_PASSWORD_SHA256_HEX);
            console.log("Hash match?", hash === ADMIN_PASSWORD_SHA256_HEX);
            
            if (hash === ADMIN_PASSWORD_SHA256_HEX) {
                console.log("✅✅✅ PASSWORD CORRECT! ✅✅✅");
                
                // Clear input
                input.value = "";
                
                // Store authentication
                sessionStorage.setItem(K_AUTH, "true");
                sessionStorage.setItem(K_TS, String(Date.now()));
                
                // Hide error
                error.style.display = "none";
                
                // Close modal
                closeAdminPasswordModal();
                
                // Open admin panel
                setTimeout(() => {
                    window.open(ADMIN_URL, "_blank");
                }, 300);
                
            } else {
                console.log("❌ Password incorrect");
                console.log("Your hash:", hash);
                console.log("Expected:  ", ADMIN_PASSWORD_SHA256_HEX);
                
                // Show what to type
                error.textContent = "Password incorrect";
                error.style.display = "block";
                input.value = "";
                input.focus();
            }
        } catch (err) {
            console.error("❌ Error during password check:", err);
            error.textContent = "System error. Please refresh and try again.";
            error.style.display = "block";
            input.value = "";
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
            }
        });
        
        console.log("✅ Admin shortcuts initialized");
    }

    return {
        showAdminPasswordModal,
        submitAdminPassword,
        isAuthenticated: function() {
            if (sessionStorage.getItem(K_AUTH) !== "true") return false;
            const ts = Number(sessionStorage.getItem(K_TS));
            if (!ts || now() - ts > SESSION_TTL_MS) {
                sessionStorage.clear();
                return false;
            }
            return true;
        },
        initAdminShortcut
    };
})();

// ==================== BOOKING SYSTEM FUNCTIONS ====================
// These need to be added from your original code
let selectedPlan = '';
let selectedPlanPrice = 0;

function openBookingModal(plan, price) {
    selectedPlan = plan;
    selectedPlanPrice = price;
    
    document.getElementById('plan-name-display').textContent = plan + ' Plan';
    document.getElementById('plan-price-display').textContent = price > 0 ? '£' + price + '/month' : 'Custom Pricing';
    
    document.getElementById('bookingModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeAppointmentConfirmation() {
    document.getElementById('appointmentConfirmationModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Basic booking form functions
function selectContactMethod(method) {
    document.querySelectorAll('.contact-method-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.contact-method-btn').classList.add('active');
    
    document.getElementById('phone-fields').style.display = method === 'phone' ? 'block' : 'none';
    document.getElementById('snapchat-fields').style.display = method === 'snapchat' ? 'block' : 'none';
}

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
    }
    
    // Initialize admin access
    AdminAccess.initAdminShortcut();
    
    // Initialize FAQ
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
    }
    
    // Initialize booking buttons
    document.querySelectorAll('.book-call-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const plan = this.getAttribute('data-plan');
            const price = this.getAttribute('data-price');
            openBookingModal(plan, parseInt(price));
        });
    });
    
    // Setup modal close listeners
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this.id === 'bookingModal') closeBookingModal();
                if (this.id === 'appointmentConfirmationModal') closeAppointmentConfirmation();
            }
        });
    });
    
    console.log("✅ All systems initialized successfully!");
});

// Make functions globally available
window.selectContactMethod = selectContactMethod;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.closeAppointmentConfirmation = closeAppointmentConfirmation;
window.AdminAccess = AdminAccess;
