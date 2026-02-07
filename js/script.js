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

    // SIMPLE PASSWORD SYSTEM - No hash issues
    const ADMIN_PASSWORD = "admin123"; // Change this if you want
    
    function showAdminPasswordModal() {
        const modal = document.getElementById("adminPasswordModal");
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");

        if (!modal || !input || !error) return;

        input.value = "";
        error.style.display = "none";
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        input.focus();
    }

    function closeAdminPasswordModal() {
        const modal = document.getElementById("adminPasswordModal");
        if (!modal) return;
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
    }

    function submitAdminPassword() {
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");
        if (!input || !error) return;

        const entered = input.value;
        input.value = "";

        if (entered === ADMIN_PASSWORD) {
            // Password is CORRECT
            error.style.display = "none";
            
            // Store authentication
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
            input.focus();
        }
    }

    // Initialize admin keyboard shortcut
    function initAdminShortcut() {
        document.addEventListener("keydown", e => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
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
    }

    return {
        showAdminPasswordModal,
        submitAdminPassword,
        initAdminShortcut
    };
})();

// ==================== BOOKING SYSTEM VARIABLES ====================
let selectedPlan = '';
let selectedPlanPrice = 0;
let currentStep = 1;
let contactMethod = 'phone';
let timeDropdownOpen = false;
let realTimeBookedSlots = {};

// ==================== BOOKING FUNCTIONS ====================
async function loadBookedSlots() {
    realTimeBookedSlots = JSON.parse(localStorage.getItem('synced2ps_booked_slots') || '{}');
    
    if (firebaseInitialized && db) {
        try {
            const snapshot = await db.collection('bookedSlots').get();
            snapshot.forEach(doc => {
                realTimeBookedSlots[doc.data().timeKey] = true;
            });
        } catch (error) {
            console.error("Error loading from Firebase:", error);
        }
    }
    
    generateTimeSlots();
}

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

async function saveBookingToFirebase(registration, timeKey) {
    if (!firebaseInitialized || !db) {
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
        const bookingRef = await db.collection('bookings').add(registration);
        
        // Mark slot as booked in Firebase
        await db.collection('bookedSlots').doc(timeKey).set({
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

async function submitBooking() {
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
            plan: selectedPlan,
            price: selectedPlanPrice,
            contactMethod: contactMethod,
            name: name,
            email: email,
            contactInfo: contactInfo,
            country: document.getElementById('country').value,
            date: date,
            time: timeDisplay,
            timeKey: timeKey,
            timezone: document.getElementById('timezone').value || 'GMT',
            experience: document.getElementById('experience').value,
            goals: document.getElementById('goals').value.trim(),
            questions: document.getElementById('questions').value.trim(),
            timestamp: new Date().toISOString(),
            status: 'booked'
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
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Booking';
        }
    }
}

// ==================== UI HELPER FUNCTIONS ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
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
    const timeError = document.getElementById('time-error');
    if (timeError) timeError.classList.remove('show');
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
    
    if (dropdown) dropdown.classList.remove('open');
    if (button) button.classList.remove('open');
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

// ==================== INITIALIZATION ====================
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
        
        // Listen for date changes
        dateInput.addEventListener('change', generateTimeSlots);
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
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            faqItems.forEach(otherItem => {
                if (otherItem !== item) otherItem.classList.remove('active');
            });
            item.classList.toggle('active', !isActive);
        });
    });
    
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
    
    // Close time dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.time-select-container')) {
            closeTimeDropdown();
        }
    });
    
    // Load booked slots
    loadBookedSlots();
    
    console.log("✅ All systems initialized successfully!");
});

// ==================== GLOBAL FUNCTIONS ====================
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
window.AdminAccess = AdminAccess;
