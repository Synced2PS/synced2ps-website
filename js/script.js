// ==================== ADMIN ACCESS SYSTEM ====================
const AdminAccess = (function() {
    "use strict";

    const ADMIN_URL = "admin.html";
    const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

    // SHA-256 of: s2ps@S2PS@
    const ADMIN_PASSWORD_SHA256_HEX = "fa1581bb39a1c19ada61774f8419d3e58ea239dbf20916667f9b777d92a9a019";

    async function sha256Hex(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showAdminPasswordModal() {
        const modal = document.getElementById("adminPasswordModal");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");

        if (modal && input && error) {
            input.value = "";
            error.style.display = "none";
            modal.classList.add("active");
            document.body.style.overflow = "hidden";
            input.focus();
        }
    }

    function closeAdminPasswordModal() {
        const modal = document.getElementById("adminPasswordModal");
        if (modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
        }
    }

    async function submitAdminPassword() {
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");
        
        if (!input || !error) return;
        
        const password = input.value;
        input.value = "";
        
        try {
            const hash = await sha256Hex(password);
            
            if (hash === ADMIN_PASSWORD_SHA256_HEX) {
                // Password is CORRECT
                error.style.display = "none";
                
                // Store auth in sessionStorage
                sessionStorage.setItem('admin_authenticated', 'true');
                sessionStorage.setItem('admin_timestamp', Date.now().toString());
                
                // Close modal
                closeAdminPasswordModal();
                
                // Open admin panel
                setTimeout(() => {
                    window.open(ADMIN_URL, "_blank");
                }, 200);
                
            } else {
                // Password is WRONG
                error.textContent = "Incorrect password";
                error.style.display = "block";
            }
            
        } catch (err) {
            error.textContent = "Error checking password";
            error.style.display = "block";
        }
    }

    // Initialize keyboard shortcut
    function initAdminShortcut() {
        document.addEventListener("keydown", function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === "A") {
                e.preventDefault();
                showAdminPasswordModal();
            }
        });

        // Close modal on outside click
        document.addEventListener("click", function(e) {
            const modal = document.getElementById("adminPasswordModal");
            if (modal && e.target === modal) {
                closeAdminPasswordModal();
            }
        });
    }

    return {
        showAdminPasswordModal,
        submitAdminPassword,
        initAdminShortcut
    };
})();

// ==================== BASIC SETUP ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("Website loaded");
    
    // Initialize admin
    AdminAccess.initAdminShortcut();
    
    // Set current year
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Set min date for booking
    const dateInput = document.getElementById('call-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
});

// Make available globally
window.AdminAccess = AdminAccess;
