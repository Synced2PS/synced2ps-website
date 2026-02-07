// ==================== ADMIN ACCESS SYSTEM ====================
const AdminAccess = (function() {
    "use strict";

    const ADMIN_URL = "admin.html";
    
    // The EXACT correct hash
    const CORRECT_HASH = "fa1581bb39a1c19ada61774f8419d3e58ea239dbf20916667f9b777d92a9a019";
    
    // Let's find out what the actual correct password is
    const TEST_PASSWORDS = [
        "s2ps@S2PS@",      // Original guess
        "s2ps@S2PS@",      // Exactly as typed
        "s2ps@S2PS",       // Without last @
        "S2PS@S2PS@",      // Capital first S
        "s2ps@s2ps@",      // All lowercase
        "s2psS2PS@",       // No middle @
        "s2ps@S2PS@",      // Check again
    ];

    async function sha256Hex(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // TEST ALL POSSIBLE PASSWORDS
    async function testAllPasswords() {
        console.log("🔍 TESTING ALL POSSIBLE PASSWORDS:");
        for (let i = 0; i < TEST_PASSWORDS.length; i++) {
            const pwd = TEST_PASSWORDS[i];
            const hash = await sha256Hex(pwd);
            const matches = hash === CORRECT_HASH;
            console.log(`${i+1}. "${pwd}" → ${hash.substring(0, 20)}... ${matches ? "✅ MATCHES!" : "❌"}`);
        }
    }

    function showAdminPasswordModal() {
        console.log("=== DEBUG MODE ===");
        
        // Run tests when modal opens
        testAllPasswords();
        
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
        console.log("=== PASSWORD CHECK ===");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");
        
        if (!input || !error) return;
        
        const enteredPassword = input.value;
        console.log("You typed:", JSON.stringify(enteredPassword));
        console.log("Length:", enteredPassword.length);
        console.log("Char codes:", Array.from(enteredPassword).map(c => c.charCodeAt(0)));
        
        // Show what you actually typed
        console.log("Actual characters:");
        for (let i = 0; i < enteredPassword.length; i++) {
            const char = enteredPassword[i];
            console.log(`  Position ${i}: '${char}' (code: ${char.charCodeAt(0)})`);
        }
        
        input.value = "";
        
        try {
            const hash = await sha256Hex(enteredPassword);
            console.log("Your hash:", hash);
            console.log("Correct hash:", CORRECT_HASH);
            console.log("Match?", hash === CORRECT_HASH);
            
            if (hash === CORRECT_HASH) {
                console.log("✅✅✅ SUCCESS! Password is correct!");
                error.style.display = "none";
                
                // Store auth
                sessionStorage.setItem('admin_authenticated', 'true');
                sessionStorage.setItem('admin_timestamp', Date.now().toString());
                
                // Close and open admin
                closeAdminPasswordModal();
                setTimeout(() => {
                    window.open(ADMIN_URL, "_blank");
                }, 200);
                
            } else {
                console.log("❌ Hash doesn't match!");
                error.textContent = "Incorrect password";
                error.style.display = "block";
                
                // Show what you should type
                console.log("\n🔍 HINT: The correct password should produce this hash:");
                console.log(CORRECT_HASH);
                console.log("\nTry these passwords (copy and paste exactly):");
                console.log('1. s2ps@S2PS@');
                console.log('2. S2PS@S2PS@');
                console.log('3. s2ps@s2ps@');
            }
            
        } catch (err) {
            console.error("Error:", err);
            error.textContent = "Error checking password";
            error.style.display = "block";
        }
    }

    // Keyboard shortcut
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
        
        console.log("Admin shortcut ready: Ctrl+Shift+A");
    }

    return {
        showAdminPasswordModal,
        submitAdminPassword,
        initAdminShortcut
    };
})();

// ==================== BASIC SETUP ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("Website loaded - Admin system ready");
    
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
