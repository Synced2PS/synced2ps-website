// ==================== FIREBASE CHECK ====================
console.log("Firebase available:", typeof firebaseDB !== 'undefined');

// If firebaseDB is undefined, try to initialize it
if (typeof firebaseDB === 'undefined' && typeof firebase !== 'undefined') {
    console.log("Initializing Firebase from script.js...");
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig || {
            // Fallback config
            apiKey: "your-api-key",
            authDomain: "your-auth-domain",
            projectId: "your-project-id",
            storageBucket: "your-storage-bucket",
            messagingSenderId: "your-sender-id",
            appId: "your-app-id"
        });
    }
    window.firebaseDB = firebase.firestore();
}
// ==================== HIDDEN ADMIN ACCESS (HARDENED FRONT-END ONLY) ====================
// NOTE: Front-end only auth can be bypassed by determined users; for real security, protect admin on a backend.
// This implementation removes plaintext password, adds lockout, and enforces session expiry.

(function() {
    'use strict';

    // ---- Config ----
    const ADMIN_URL = 'admin.html';
    const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
    const ADMIN_PASSWORD_SHA256_HEX = 'fa1581bb39a1c19ada61774f8419d3e58ea239bdf20916667f9b777d92a9a019'; // SHA-256 of your admin password

    // Rate limiting / lockout
    const MAX_FAILURES = 5;
    const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

    // Storage keys
    const K_AUTH = 'admin_authenticated';
    const K_TS = 'admin_timestamp';
    const K_FAILS = 'admin_failures';
    const K_LOCKUNTIL = 'admin_lock_until';

    function now() { return Date.now(); }
    function $(id) { return document.getElementById(id); }

    function constantTimeEqual(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        if (a.length !== b.length) return false;
        let out = 0;
        for (let i = 0; i < a.length; i++) out |= (a.charCodeAt(i) ^ b.charCodeAt(i));
        return out === 0;
    }

    async function sha256Hex(str) {
        const data = new TextEncoder().encode(str);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function isLockedOut() {
        const until = Number(sessionStorage.getItem(K_LOCKUNTIL) || '0');
        return until && now() < until;
    }

    function lockoutRemainingSeconds() {
        const until = Number(sessionStorage.getItem(K_LOCKUNTIL) || '0');
        return Math.max(0, Math.ceil((until - now()) / 1000));
    }

    function recordFailure() {
        const fails = Number(sessionStorage.getItem(K_FAILS) || '0') + 1;
        sessionStorage.setItem(K_FAILS, String(fails));
        if (fails >= MAX_FAILURES) {
            sessionStorage.setItem(K_LOCKUNTIL, String(now() + LOCKOUT_MS));
            sessionStorage.setItem(K_FAILS, '0');
        }
    }

    function clearFailures() {
        sessionStorage.removeItem(K_FAILS);
        sessionStorage.removeItem(K_LOCKUNTIL);
    }

    function setAuthenticated() {
        sessionStorage.setItem(K_AUTH, 'true');
        sessionStorage.setItem(K_TS, String(now()));
    }

    function clearAuth() {
        sessionStorage.removeItem(K_AUTH);
        sessionStorage.removeItem(K_TS);
    }

    function isAuthenticated() {
        if (sessionStorage.getItem(K_AUTH) !== 'true') return false;
        const ts = Number(sessionStorage.getItem(K_TS) || '0');
        if (!ts) return false;
        if (now() - ts > SESSION_TTL_MS) {
            clearAuth();
            return false;
        }
        return true;
    }

    function openModal() {
        const modal = $('adminPasswordModal');
        const input = $('adminPasswordInput');
        const error = $('passwordError');
        if (!modal || !input || !error) {
            // If modal isn't present, fallback to a simple prompt
            const pw = prompt('🔒 Enter admin password:');
            if (pw === null) return;
            submitPasswordFallback(pw);
            return;
        }
        input.value = '';
        error.style.display = 'none';
        error.textContent = 'Incorrect password';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => input.focus(), 0);
    }

    function closeModal() {
        const modal = $('adminPasswordModal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    async function submitPasswordFallback(pw) {
        try {
            const enteredHash = await sha256Hex(pw);
            if (constantTimeEqual(enteredHash, ADMIN_PASSWORD_SHA256_HEX)) {
                clearFailures();
                setAuthenticated();
                window.open(ADMIN_URL, '_blank', 'noopener,noreferrer');
            } else {
                alert('❌ Incorrect password');
            }
        } catch (e) {
            alert('Password check failed in this browser.');
        }
    }

    async function submitFromModal() {
        const input = $('adminPasswordInput');
        const error = $('passwordError');
        if (!input || !error) return;

        if (isLockedOut()) {
            error.textContent = `Too many attempts. Try again in ${lockoutRemainingSeconds()}s.`;
            error.style.display = 'block';
            return;
        }

        const entered = input.value || '';
        input.value = '';

        try {
            const enteredHash = await sha256Hex(entered);
            if (constantTimeEqual(enteredHash, ADMIN_PASSWORD_SHA256_HEX)) {
                clearFailures();
                setAuthenticated();
                closeModal();
                window.open(ADMIN_URL, '_blank', 'noopener,noreferrer');
            } else {
                recordFailure();
                error.textContent = 'Incorrect password';
                error.style.display = 'block';
                input.focus();
            }
        } catch (e) {
            error.textContent = 'Unable to verify password in this browser.';
            error.style.display = 'block';
        }
    }

    // Expose functions for your HTML button onclick handlers
    window.showAdminPasswordModal = openModal;
    window.submitAdminPassword = submitFromModal;
    window.__isAdminAuthenticated = isAuthenticated; // optional (debug)

    function setupHiddenAdminAccess() {
        // enforce expiry
        isAuthenticated();

        // Keyboard shortcut: Ctrl+Shift+A
        document.addEventListener('keydown', function(e) {
            const key = String(e.key || '').toLowerCase();
            if (e.ctrlKey && e.shiftKey && key === 'a') {
                e.preventDefault();
                openModal();
            }
        });

        // Close modal on outside click
        const modal = $('adminPasswordModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
        }

        // Submit on Enter in input
        const input = $('adminPasswordInput');
        if (input) {
            input.addEventListener('keydown', function(e) {
                const key = String(e.key || '').toLowerCase();
                if (key === 'enter') {
                    e.preventDefault();
                    submitFromModal();
                }
                if (key === 'escape') {
                    e.preventDefault();
                    closeModal();
                }
            });
        }
    }

    // run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupHiddenAdminAccess);
    } else {
        setupHiddenAdminAccess();
    }
})();
// ==================== END HIDDEN ADMIN ACCESS ====================


// ==================== MAIN VARIABLES ====================
let selectedPlan = '';
let selectedPlanPrice = 0;
let currentStep = 1;
let contactMethod = 'phone';
let timeDropdownOpen = false;
let realTimeBookedSlots = {};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Website loaded - initializing...");
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('call-date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Initialize all components
    initializeAll();

    // Load booked slots
    loadBookedSlots();
});

// ==================== LOAD BOOKED SLOTS ====================
async function loadBookedSlots() {
    console.log("📡 Loading booked slots...");
    
    // Start with local storage as fallback
    const localSlots = JSON.parse(localStorage.getItem('synced2ps_booked_slots') || '{}');
    realTimeBookedSlots = localSlots;
    
    // Try Firebase if available
    if (typeof firebaseDB !== 'undefined') {
        try {
            console.log("🔥 Loading from Firebase...");
            const snapshot = await firebaseDB.collection('bookedSlots').get();
            
            // Merge with local slots
            snapshot.forEach(doc => {
                const data = doc.data();
                realTimeBookedSlots[data.timeKey] = true;
            });
            
            console.log(`✅ Loaded ${Object.keys(realTimeBookedSlots).length} booked slots`);
            
        } catch (error) {
            console.error("❌ Error loading from Firebase, using local storage:", error);
        }
    } else {
        console.log("⚠️ Using local storage only");
    }
    
    // Generate time slots
    generateTimeSlots();
}

// ==================== TIME SLOT GENERATION ====================
function generateTimeSlots() {
    const dateInput = document.getElementById('call-date');
    if (!dateInput) return;
    
    const selectedDate = dateInput.value;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    const timeDropdown = document.getElementById('timeSelectDropdown');
    const times = [];
    
    const isToday = selectedDate === today;
    
    // Generate time slots from 9 AM to 8:30 PM GMT
    for (let hour = 9; hour <= 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 20 && minute === 30) break;
            
            // Skip past times for today
            if (isToday) {
                const slotHour = hour;
                const slotMinute = minute;
                const nowInMinutes = currentHour * 60 + currentMinute;
                const slotInMinutes = slotHour * 60 + slotMinute;
                
                // Allow booking at least 2 hours in advance
                if (slotInMinutes < nowInMinutes + 120) {
                    continue;
                }
            }
            
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const displayMinute = minute === 0 ? '00' : '30';
            
            const timeString = `${displayHour}:${displayMinute} ${ampm}`;
            const timeKey = `${selectedDate}_${hour}:${minute === 0 ? '00' : '30'}`;
            
            // Check if slot is booked
            const isBooked = realTimeBookedSlots[timeKey] === true;
            
            times.push({
                display: timeString,
                key: timeKey,
                booked: isBooked
            });
        }
    }
    
    // Generate HTML
    if (timeDropdown) {
        timeDropdown.innerHTML = times.map(time => 
            `<div class="time-option ${time.booked ? 'booked' : ''}" 
                  ${!time.booked ? `onclick="selectTime('${time.display}', '${time.key}')"` : ''}
                  ${time.booked ? 'style="cursor: not-allowed;"' : ''}>
                ${time.display} ${time.booked ? '(Booked)' : ''}
            </div>`
        ).join('');
    }
}

// ==================== SAVE BOOKING ====================
async function saveBookingToFirebase(registration, timeKey) {
    if (typeof firebaseDB === 'undefined') {
        console.warn("⚠️ Firebase not available, saving to local storage only");
        // Save to local storage
        const localBookings = JSON.parse(localStorage.getItem('synced2ps_bookings') || '[]');
        localBookings.push(registration);
        localStorage.setItem('synced2ps_bookings', JSON.stringify(localBookings));
        
        // Mark slot as booked
        realTimeBookedSlots[timeKey] = true;
        localStorage.setItem('synced2ps_booked_slots', JSON.stringify(realTimeBookedSlots));
        
        return { success: true, id: 'local_' + Date.now() };
    }
    
    try {
        // Save to Firebase
        const bookingRef = await firebaseDB.collection('bookings').add(registration);
        
        // Mark slot as booked in Firebase
        await firebaseDB.collection('bookedSlots').doc(timeKey).set({
            timeKey: timeKey,
            date: registration.date,
            time: registration.time,
            bookedAt: new Date().toISOString(),
            bookingId: bookingRef.id,
            bookedBy: registration.email
        });
        
        // Update local storage
        realTimeBookedSlots[timeKey] = true;
        localStorage.setItem('synced2ps_booked_slots', JSON.stringify(realTimeBookedSlots));
        
        console.log('✅ Booking saved to Firebase:', bookingRef.id);
        return { success: true, id: bookingRef.id };
        
    } catch (error) {
        console.error('❌ Firebase save failed:', error);
        throw error;
    }
}

// ==================== SUBMIT BOOKING ====================
async function submitBooking() {
    console.log("📤 Submitting booking...");
    
    // Disable submit button
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }
    
    try {
        let name, email, contactInfo;
        
        if (contactMethod === 'phone') {
            name = document.getElementById('full-name').value.trim();
            email = document.getElementById('email').value.trim();
            contactInfo = document.getElementById('phone').value.trim();
        } else {
            name = document.getElementById('snapchat-name').value.trim();
            email = document.getElementById('snapchat-email').value.trim();
            contactInfo = document.getElementById('snapchat-username').value.trim();
            const phone = document.getElementById('snapchat-phone').value.trim();
            if (phone) contactInfo += ` (Phone: ${phone})`;
        }
        
        const timeKey = document.getElementById('selected-time').dataset.key;
        const date = document.getElementById('call-date').value;
        const timeDisplay = document.getElementById('selected-time').value;
        
        // Double-check slot is available
        if (realTimeBookedSlots[timeKey]) {
            alert('⚠️ This time slot was just booked. Please select another time.');
            generateTimeSlots();
            return;
        }
        
       const registration = {
    // Basic Info
    plan: selectedPlan,
    planPrice: selectedPlanPrice,
    contactMethod: contactMethod,
    fullName: name,
    email: email,
    
    // Contact Info based on selected method
    ...(contactMethod === 'phone' ? {
        phoneNumber: contactInfo,
        snapchatUsername: 'Not provided'
    } : {
        snapchatUsername: contactInfo,
        phoneNumber: document.getElementById('snapchat-phone').value.trim() || 'Not provided'
    }),
    
    // Booking Details
    bookingDate: date,
    bookingTime: timeDisplay,
    bookingTimeKey: timeKey,
    timezone: document.getElementById('timezone').value || 'GMT',
    country: document.getElementById('country').value,
    
    // Experience Level (from step 3)
    experienceLevel: document.getElementById('experience').value || 'Not specified',
    
    // Optional Information (from step 3)
    goals: document.getElementById('goals').value.trim() || 'Not specified',
    questions: document.getElementById('questions').value.trim() || 'No questions',
    
    // Metadata
    bookingTimestamp: new Date().toISOString(),
    status: 'pending',
    
    // Additional useful info
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    pageURL: window.location.href
};
        };
        
        // Save booking
        const result = await saveBookingToFirebase(registration, timeKey);
        
        if (result.success) {
            // Update UI
            document.getElementById('appointment-date-display').textContent = formatDate(date);
            document.getElementById('appointment-time-display').textContent = timeDisplay + ' GMT';
            
            // Show confirmation
            closeBookingModal();
            setTimeout(() => {
                document.getElementById('appointmentConfirmationModal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }, 100);
            
            // Refresh time slots
            generateTimeSlots();
            
            // Reset form
            resetForm();
        }
        
    } catch (error) {
        console.error('❌ Booking failed:', error);
        alert('Sorry, there was an error. Please try again.');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Booking';
        }
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ==================== UI FUNCTIONS ====================
function initializeAll() {
    initializeFAQ();
    initializeBookingButtons();
    setupModalCloseListeners();
    console.log("✅ All components initialized!");
}

function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // Close all others
            faqItems.forEach(otherItem => {
                if (otherItem !== item) otherItem.classList.remove('active');
            });
            
            // Toggle current
            item.classList.toggle('active', !isActive);
        });
    });
}

function initializeBookingButtons() {
    document.querySelectorAll('.book-call-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const plan = this.getAttribute('data-plan');
            const price = this.getAttribute('data-price');
            openBookingModal(plan, parseInt(price));
        });
    });
}

function setupModalCloseListeners() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this.id === 'bookingModal') closeBookingModal();
                if (this.id === 'appointmentConfirmationModal') closeAppointmentConfirmation();
            }
        });
    });
}

function openBookingModal(plan, price) {
    selectedPlan = plan;
    selectedPlanPrice = price;
    
    document.getElementById('plan-name-display').textContent = plan + ' Plan';
    document.getElementById('plan-price-display').textContent = price > 0 ? '£' + price + '/month' : 'Custom Pricing';
    
    resetForm();
    
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

function resetForm() {
    currentStep = 1;
    contactMethod = 'phone';
    
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    
    // Reset contact method
    document.querySelectorAll('.contact-method-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.contact-method-btn').classList.add('active');
    document.getElementById('phone-fields').style.display = 'block';
    document.getElementById('snapchat-fields').style.display = 'none';
    
    // Clear form fields
    document.querySelectorAll('#bookingModal input, #bookingModal select, #bookingModal textarea').forEach(field => {
        if (field.id !== 'call-date' && field.type !== 'button' && field.type !== 'submit') {
            field.value = '';
        }
    });
    
    // Clear errors
    document.querySelectorAll('.error-message').forEach(error => error.classList.remove('show'));
    
    // Reset time selection
    document.getElementById('selectedTimeDisplay').textContent = 'Select a time';
    document.getElementById('selected-time').value = '';
    closeTimeDropdown();
    
    generateTimeSlots();
}

function selectContactMethod(method) {
    contactMethod = method;
    
    document.querySelectorAll('.contact-method-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.contact-method-btn').classList.add('active');
    
    document.getElementById('phone-fields').style.display = method === 'phone' ? 'block' : 'none';
    document.getElementById('snapchat-fields').style.display = method === 'snapchat' ? 'block' : 'none';
}

function selectTime(timeDisplay, timeKey) {
    document.getElementById('selectedTimeDisplay').textContent = timeDisplay;
    const timeInput = document.getElementById('selected-time');
    timeInput.value = timeDisplay;
    timeInput.dataset.key = timeKey;
    closeTimeDropdown();
    document.getElementById('time-error').classList.remove('show');
}

function toggleTimeDropdown() {
    const dropdown = document.getElementById('timeSelectDropdown');
    const button = document.getElementById('timeSelectBtn');
    
    if (timeDropdownOpen) {
        dropdown.classList.remove('open');
        button.classList.remove('open');
    } else {
        dropdown.classList.add('open');
        button.classList.add('open');
    }
    
    timeDropdownOpen = !timeDropdownOpen;
}

function closeTimeDropdown() {
    const dropdown = document.getElementById('timeSelectDropdown');
    const button = document.getElementById('timeSelectBtn');
    
    dropdown.classList.remove('open');
    button.classList.remove('open');
    timeDropdownOpen = false;
}

function prevStep(step) {
    document.getElementById('step-' + step).classList.remove('active');
    currentStep = step - 1;
    document.getElementById('step-' + currentStep).classList.add('active');
}

function nextStep(step) {
    document.getElementById('step-' + step).classList.remove('active');
    currentStep = step + 1;
    document.getElementById('step-' + currentStep).classList.add('active');
}

function validateStep1() {
    let isValid = true;
    
    // Clear errors
    document.querySelectorAll('#step-1 .error-message').forEach(error => error.classList.remove('show'));
    
    if (contactMethod === 'phone') {
        const name = document.getElementById('full-name').value.trim();
        if (!name) {
            document.getElementById('name-error').textContent = 'Full name is required';
            document.getElementById('name-error').classList.add('show');
            isValid = false;
        }
        
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            document.getElementById('email-error').textContent = 'Valid email is required';
            document.getElementById('email-error').classList.add('show');
            isValid = false;
        }
        
        const phone = document.getElementById('phone').value.trim();
        if (!phone || phone.replace(/\D/g, '').length < 8) {
            document.getElementById('phone-error').textContent = 'Valid phone number is required';
            document.getElementById('phone-error').classList.add('show');
            isValid = false;
        }
    } else {
        const snapName = document.getElementById('snapchat-name').value.trim();
        if (!snapName) {
            document.getElementById('snapchat-name-error').textContent = 'Full name is required';
            document.getElementById('snapchat-name-error').classList.add('show');
            isValid = false;
        }
        
        const snapEmail = document.getElementById('snapchat-email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!snapEmail || !emailRegex.test(snapEmail)) {
            document.getElementById('snapchat-email-error').textContent = 'Valid email is required';
            document.getElementById('snapchat-email-error').classList.add('show');
            isValid = false;
        }
        
        const snapUsername = document.getElementById('snapchat-username').value.trim();
        if (!snapUsername) {
            document.getElementById('snapchat-username-error').textContent = 'Snapchat username is required';
            document.getElementById('snapchat-username-error').classList.add('show');
            isValid = false;
        }
    }
    
    const country = document.getElementById('country').value;
    if (!country) {
        document.getElementById('country-error').textContent = 'Please select your country';
        document.getElementById('country-error').classList.add('show');
        isValid = false;
    }
    
    if (isValid) nextStep(1);
    return isValid;
}

function validateStep2() {
    let isValid = true;
    
    document.querySelectorAll('#step-2 .error-message').forEach(error => error.classList.remove('show'));
    
    const date = document.getElementById('call-date').value;
    const time = document.getElementById('selected-time').value;
    const timeKey = document.getElementById('selected-time').dataset.key;
    
    if (!date) {
        document.getElementById('date-error').textContent = 'Please select a date';
        document.getElementById('date-error').classList.add('show');
        isValid = false;
    }
    
    if (!time || !timeKey) {
        document.getElementById('time-error').textContent = 'Please select a time';
        document.getElementById('time-error').classList.add('show');
        isValid = false;
    } else if (realTimeBookedSlots[timeKey]) {
        document.getElementById('time-error').textContent = 'This time slot is booked. Please select another.';
        document.getElementById('time-error').classList.add('show');
        isValid = false;
        generateTimeSlots();
    }
    
    if (isValid) nextStep(2);
    return isValid;
}

function validateAndSubmitBooking() {
    if (!validateStep1()) {
        document.getElementById('step-3').classList.remove('active');
        document.getElementById('step-2').classList.remove('active');
        document.getElementById('step-1').classList.add('active');
        currentStep = 1;
        return;
    }
    
    if (!validateStep2()) {
        document.getElementById('step-3').classList.remove('active');
        document.getElementById('step-2').classList.add('active');
        currentStep = 2;
        return;
    }
    
    submitBooking();
}

// ==================== ADMIN ACCESS ====================
function setupHiddenAdminAccess() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            const password = prompt("🔒 Enter admin password:");
            if (password === "s2ps@S2PS@") {
                localStorage.setItem('admin_authenticated', 'true');
                window.location.href = 'admin.html';
            } else if (password) {
                alert('❌ Incorrect password');
            }
        }
    });
}

// Event Listeners
document.getElementById('call-date')?.addEventListener('change', generateTimeSlots);

document.addEventListener('click', function(e) {
    if (!e.target.closest('.time-select-container')) {
        closeTimeDropdown();
    }
});

// Make functions globally available
window.selectContactMethod = selectContactMethod;
window.selectTime = selectTime;
window.toggleTimeDropdown = toggleTimeDropdown;
window.prevStep = prevStep;
window.nextStep = nextStep;
window.validateStep1 = validateStep1;
window.validateStep2 = validateStep2;
window.validateAndSubmitBooking = validateAndSubmitBooking;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.closeAppointmentConfirmation = closeAppointmentConfirmation;
// ==================== FIREBASE INTEGRATION ====================
async function loadBookedSlotsFromFirebase() {
    try {
        console.log("🔥 Loading booked slots from Firebase...");
        
        if (typeof firebaseDB === 'undefined') {
            console.warn("⚠️ Firebase DB not available");
            return;
        }
        
        const snapshot = await firebaseDB.collection('bookedSlots').get();
        const firebaseSlots = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            firebaseSlots[data.timeKey] = true;
        });
        
        // Merge with existing slots
        Object.assign(realTimeBookedSlots, firebaseSlots);
        
        // Save to local storage
        localStorage.setItem('synced2ps_booked_slots', JSON.stringify(realTimeBookedSlots));
        
        console.log(`✅ Loaded ${Object.keys(firebaseSlots).length} slots from Firebase`);
        return firebaseSlots;
        
    } catch (error) {
        console.error("❌ Error loading from Firebase:", error);
        return {};
    }
}

// ==================== FORCE REFRESH FUNCTION ====================
function forceRefreshSlotsFromAdmin() {
    console.log('Force refreshing slots from admin...');
    
    // Clear all caches
    localStorage.removeItem('synced2ps_booked_slots');
    localStorage.removeItem('synced2ps_bookings');
    
    // Clear global variables
    realTimeBookedSlots = {};
    
    // Reload from Firebase
    if (typeof firebaseDB !== 'undefined') {
        loadBookedSlotsFromFirebase().then(() => {
            generateTimeSlots();
            console.log('✅ Slots refreshed successfully from admin!');
            
            // Show notification if on booking page
            if (document.getElementById('bookingModal')) {
                alert('Time slots refreshed! Please check availability again.');
            }
        }).catch(error => {
            console.error('Error refreshing slots:', error);
        });
    } else {
        // Simple reload
        location.reload();
    }
}

// ==================== UPDATE TIME SLOTS UI ====================
function updateTimeSlotsUI() {
    generateTimeSlots();
}

// Make functions globally available
window.forceRefreshSlots = forceRefreshSlotsFromAdmin;
window.refreshSlots = forceRefreshSlotsFromAdmin;
window.updateTimeSlotsUI = updateTimeSlotsUI;

// ==================== DEBUG FUNCTION ====================
function checkSlotsStatus() {
    console.log('📊 Current Slots Status:');
    console.log('Local storage slots:', JSON.parse(localStorage.getItem('synced2ps_booked_slots') || '{}'));
    console.log('In-memory slots:', realTimeBookedSlots);
    
    if (typeof firebaseDB !== 'undefined') {
        firebaseDB.collection('bookedSlots').get().then(snapshot => {
            console.log('Firebase booked slots:', snapshot.size);
            snapshot.forEach(doc => {
                console.log('  -', doc.data().timeKey);
            });
        });
    }
}

window.checkSlotsStatus = checkSlotsStatus;
