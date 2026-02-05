// Initialize variables
let selectedPlan = '';
let selectedPlanPrice = 0;
let currentStep = 1;
let registrations = JSON.parse(localStorage.getItem('synced2ps_registrations')) || [];
let bookedTimeSlots = JSON.parse(localStorage.getItem('synced2ps_booked_slots')) || {};
let contactMethod = 'phone';
let timeDropdownOpen = false;

// Set minimum date to today and generate time slots
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('call-date');
    dateInput.min = today;
    dateInput.value = today; // Default to today
    
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Update available time slots when date changes
    dateInput.addEventListener('change', function() {
        generateTimeSlots();
    });
    
    // Initialize FAQ functionality
    initializeFAQ();
    
    // Close time dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.time-select-container')) {
            closeTimeDropdown();
        }
    });
    
    // Initialize smooth scrolling for navigation links
    initializeSmoothScrolling();
    
    // Generate initial time slots
    generateTimeSlots();
    
    // Add real-time validation for email and phone fields
    setupRealTimeValidation();
});

// Setup real-time validation
function setupRealTimeValidation() {
    // Email validation
    const emailFields = ['email', 'snapchat-email'];
    emailFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateEmail(this.value, this.id + '-error');
            });
        }
    });
    
    // Phone validation
    const phoneFields = ['phone', 'snapchat-phone'];
    phoneFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                if (this.value.trim()) {
                    validatePhone(this.value, this.id + '-error');
                }
            });
        }
    });
    
    // Name validation
    const nameFields = ['full-name', 'snapchat-name'];
    nameFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateName(this.value, this.id + '-error');
            });
        }
    });
}

// Validate email
function validateEmail(email, errorId) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errorElement = document.getElementById(errorId);
    
    if (!email.trim()) {
        return { isValid: false, message: 'Email is required' };
    }
    
    if (!emailRegex.test(email)) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a valid email address (e.g., name@example.com)';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Invalid email format' };
    }
    
    // Check for disposable/temporary email domains
    const disposableDomains = [
        'tempmail', 'temp-mail', 'mailinator', 'guerrillamail', 
        '10minutemail', 'throwaway', 'fake', 'yopmail', 'trashmail'
    ];
    const domain = email.split('@')[1].toLowerCase();
    if (disposableDomains.some(d => domain.includes(d))) {
        if (errorElement) {
            errorElement.textContent = 'Please use a permanent email address';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Disposable email not allowed' };
    }
    
    if (errorElement) {
        errorElement.classList.remove('show');
    }
    return { isValid: true, message: '' };
}

// Validate phone number
function validatePhone(phone, errorId) {
    // Remove all non-digit characters except + at beginning
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const errorElement = document.getElementById(errorId);
    
    if (!phone.trim()) {
        return { isValid: false, message: 'Phone number is required' };
    }
    
    // Check if phone number has at least 8 digits (minimum for most countries)
    const digitCount = cleanPhone.replace(/\D/g, '').length;
    if (digitCount < 8) {
        if (errorElement) {
            errorElement.textContent = 'Phone number is too short (minimum 8 digits)';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Phone number too short' };
    }
    
    // Check if phone number is too long (max 15 digits)
    if (digitCount > 15) {
        if (errorElement) {
            errorElement.textContent = 'Phone number is too long (maximum 15 digits)';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Phone number too long' };
    }
    
    // Check if phone starts with country code or has proper format
    if (!cleanPhone.match(/^(\+\d{1,3})?\d{8,15}$/)) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a valid phone number with country code (e.g., +441234567890)';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Invalid phone format' };
    }
    
    if (errorElement) {
        errorElement.classList.remove('show');
    }
    return { isValid: true, message: '' };
}

// Validate name
function validateName(name, errorId) {
    const errorElement = document.getElementById(errorId);
    
    if (!name.trim()) {
        if (errorElement) {
            errorElement.textContent = 'Full name is required';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Name is required' };
    }
    
    if (name.trim().length < 2) {
        if (errorElement) {
            errorElement.textContent = 'Name must be at least 2 characters';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Name too short' };
    }
    
    if (name.trim().length > 100) {
        if (errorElement) {
            errorElement.textContent = 'Name is too long (maximum 100 characters)';
            errorElement.classList.add('show');
        }
        return { isValid: false, message: 'Name too long' };
    }
    
    if (errorElement) {
        errorElement.classList.remove('show');
    }
    return { isValid: true, message: '' };
}

// Generate time slots in GMT/London time (9 AM to 8 PM, 30-minute intervals)
function generateTimeSlots() {
    const dateInput = document.getElementById('call-date');
    const selectedDate = dateInput.value;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getMinutes();
    
    const timeDropdown = document.getElementById('timeSelectDropdown');
    const times = [];
    
    // Check if selected date is today
    const isToday = selectedDate === today;
    
    // Generate slots from 9:00 AM to 8:00 PM every 30 minutes in GMT
    for (let hour = 9; hour <= 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 20 && minute === 30) break; // Stop at 8:00 PM
            
            // Check if time is at least 2 hours from now for today
            if (isToday) {
                // Calculate if this time is at least 2 hours from now
                const slotHour = hour;
                const slotMinute = minute;
                
                // Calculate difference in minutes
                const nowInMinutes = currentHour * 60 + currentMinute;
                const slotInMinutes = slotHour * 60 + slotMinute;
                const timeDifference = slotInMinutes - nowInMinutes;
                
                // Skip if less than 2 hours (120 minutes) from now
                if (timeDifference < 120) {
                    continue;
                }
            }
            
            // Format time in 12-hour format with AM/PM
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const displayMinute = minute === 0 ? '00' : '30';
            
            const timeString = `${displayHour}:${displayMinute} ${ampm}`;
            const timeKey = `${selectedDate}_${hour}:${minute === 0 ? '00' : '30'}`;
            
            // Check if this time slot is already booked
            const isBooked = bookedTimeSlots[timeKey] === true;
            
            times.push({
                display: timeString,
                key: timeKey,
                hour: hour,
                minute: minute,
                booked: isBooked
            });
        }
    }
    
    // Add to dropdown
    timeDropdown.innerHTML = times.map(time => 
        `<div class="time-option ${time.booked ? 'booked' : ''}" 
              onclick="${time.booked ? '' : `selectTime('${time.display}', '${time.key}')`}"
              ${time.booked ? 'style="cursor: not-allowed;"' : ''}>
            ${time.display} ${time.booked ? '(Booked)' : ''}
        </div>`
    ).join('');
    
    // Reset selected time if current selection is booked or unavailable
    const selectedTimeKey = document.getElementById('selected-time').dataset.key;
    if (selectedTimeKey) {
        const selectedTime = times.find(t => t.key === selectedTimeKey);
        if (!selectedTime || selectedTime.booked) {
            document.getElementById('selectedTimeDisplay').textContent = 'Select a time';
            document.getElementById('selected-time').value = '';
            delete document.getElementById('selected-time').dataset.key;
        }
    }
}

// FAQ functionality - SIMPLIFIED AND WORKING
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherIcon = otherItem.querySelector('.faq-question i');
                    otherIcon.classList.remove('fa-chevron-up');
                    otherIcon.classList.add('fa-chevron-down');
                }
            });
            
            // Toggle current item
            const isActive = item.classList.contains('active');
            item.classList.toggle('active');
            
            const icon = question.querySelector('i');
            if (!isActive) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    });
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#plans') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Open booking modal
function openBookingModal(plan, price) {
    selectedPlan = plan;
    selectedPlanPrice = price;
    
    // Update plan display
    document.getElementById('plan-name-display').textContent = plan + ' Plan';
    document.getElementById('plan-price-display').textContent = price > 0 ? '£' + price + '/month' : 'Custom Pricing';
    
    // Reset form to step 1
    resetForm();
    
    // Show modal
    document.getElementById('bookingModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('active');
    
    // Reset form to step 1
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step-1').classList.add('active');
    currentStep = 1;
    
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
}

// Close appointment confirmation
function closeAppointmentConfirmation() {
    document.getElementById('appointmentConfirmationModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Select contact method
function selectContactMethod(method) {
    contactMethod = method;
    
    // Update button styles
    document.querySelectorAll('.contact-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide appropriate fields
    if (method === 'phone') {
        document.getElementById('phone-fields').style.display = 'block';
        document.getElementById('snapchat-fields').style.display = 'none';
    } else {
        document.getElementById('phone-fields').style.display = 'none';
        document.getElementById('snapchat-fields').style.display = 'block';
    }
}

// Toggle time dropdown
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

// Select time
function selectTime(timeDisplay, timeKey) {
    document.getElementById('selectedTimeDisplay').textContent = timeDisplay;
    document.getElementById('selected-time').value = timeDisplay;
    document.getElementById('selected-time').dataset.key = timeKey;
    closeTimeDropdown();
    
    // Clear any time error
    document.getElementById('time-error').classList.remove('show');
}

// Reset form
function resetForm() {
    currentStep = 1;
    contactMethod = 'phone';
    
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show step 1
    document.getElementById('step-1').classList.add('active');
    
    // Reset form fields
    document.getElementById('bookingModal').querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type !== 'hidden' && field.id !== 'call-date') {
            field.value = '';
        }
    });
    
    // Clear all error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
    
    // Clear error classes from inputs
    document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
        field.classList.remove('error');
    });
    
    // Set date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('call-date').value = today;
    document.getElementById('call-date').min = today;
    
    // Reset contact method
    document.querySelectorAll('.contact-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.contact-method-btn').classList.add('active');
    document.getElementById('phone-fields').style.display = 'block';
    document.getElementById('snapchat-fields').style.display = 'none';
    
    // Reset time selector
    document.getElementById('selectedTimeDisplay').textContent = 'Select a time';
    document.getElementById('selected-time').value = '';
    if (document.getElementById('selected-time').dataset.key) {
        delete document.getElementById('selected-time').dataset.key;
    }
    closeTimeDropdown();
    
    // Regenerate time slots
    generateTimeSlots();
}

// Form navigation
function nextStep(step) {
    // Hide current step
    document.getElementById('step-' + step).classList.remove('active');
    
    // Show next step
    currentStep = step + 1;
    document.getElementById('step-' + currentStep).classList.add('active');
}

function prevStep(step) {
    // Hide current step
    document.getElementById('step-' + step).classList.remove('active');
    
    // Show previous step
    currentStep = step - 1;
    document.getElementById('step-' + currentStep).classList.add('active');
}

// Validate Step 1
function validateStep1() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('#step-1 .error-message').forEach(error => {
        error.classList.remove('show');
    });
    
    document.querySelectorAll('#step-1 input, #step-1 select').forEach(field => {
        field.classList.remove('error');
    });
    
    if (contactMethod === 'phone') {
        // Validate name
        const name = document.getElementById('full-name').value.trim();
        const nameValidation = validateName(name, 'name-error');
        if (!nameValidation.isValid) {
            document.getElementById('full-name').classList.add('error');
            isValid = false;
        }
        
        // Validate email
        const email = document.getElementById('email').value.trim();
        const emailValidation = validateEmail(email, 'email-error');
        if (!emailValidation.isValid) {
            document.getElementById('email').classList.add('error');
            isValid = false;
        }
        
        // Validate phone
        const phone = document.getElementById('phone').value.trim();
        const phoneValidation = validatePhone(phone, 'phone-error');
        if (!phoneValidation.isValid) {
            document.getElementById('phone').classList.add('error');
            isValid = false;
        }
    } else {
        // Validate Snapchat name
        const snapName = document.getElementById('snapchat-name').value.trim();
        const nameValidation = validateName(snapName, 'snapchat-name-error');
        if (!nameValidation.isValid) {
            document.getElementById('snapchat-name').classList.add('error');
            isValid = false;
        }
        
        // Validate Snapchat email
        const snapEmail = document.getElementById('snapchat-email').value.trim();
        const emailValidation = validateEmail(snapEmail, 'snapchat-email-error');
        if (!emailValidation.isValid) {
            document.getElementById('snapchat-email').classList.add('error');
            isValid = false;
        }
        
        // Validate Snapchat username
        const snapUsername = document.getElementById('snapchat-username').value.trim();
        if (!snapUsername) {
            document.getElementById('snapchat-username-error').textContent = 'Snapchat username is required';
            document.getElementById('snapchat-username-error').classList.add('show');
            document.getElementById('snapchat-username').classList.add('error');
            isValid = false;
        }
        
        // Validate optional phone if provided
        const snapPhone = document.getElementById('snapchat-phone').value.trim();
        if (snapPhone) {
            const phoneValidation = validatePhone(snapPhone, 'snapchat-phone-error');
            if (!phoneValidation.isValid) {
                document.getElementById('snapchat-phone').classList.add('error');
                // Don't set isValid to false for optional field
            }
        }
    }
    
    // Validate country
    const country = document.getElementById('country').value;
    if (!country) {
        document.getElementById('country-error').textContent = 'Please select your country';
        document.getElementById('country-error').classList.add('show');
        document.getElementById('country').classList.add('error');
        isValid = false;
    }
    
    if (isValid) {
        nextStep(1);
    }
    
    return isValid;
}

// Validate Step 2
function validateStep2() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('#step-2 .error-message').forEach(error => {
        error.classList.remove('show');
    });
    
    document.querySelectorAll('#step-2 input, #step-2 select').forEach(field => {
        field.classList.remove('error');
    });
    
    const date = document.getElementById('call-date').value;
    const time = document.getElementById('selected-time').value;
    const timeKey = document.getElementById('selected-time').dataset.key;
    
    // Validate date
    if (!date) {
        document.getElementById('date-error').textContent = 'Please select a date';
        document.getElementById('date-error').classList.add('show');
        document.getElementById('call-date').classList.add('error');
        isValid = false;
    } else {
        // Check if date is in the past
        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            document.getElementById('date-error').textContent = 'Please select a future date';
            document.getElementById('date-error').classList.add('show');
            document.getElementById('call-date').classList.add('error');
            isValid = false;
        }
    }
    
    // Validate time
    if (!time || !timeKey) {
        document.getElementById('time-error').textContent = 'Please select a time';
        document.getElementById('time-error').classList.add('show');
        isValid = false;
    } else {
        // Check if selected time is booked
        if (bookedTimeSlots[timeKey] === true) {
            document.getElementById('time-error').textContent = 'This time slot has been booked. Please select another time.';
            document.getElementById('time-error').classList.add('show');
            isValid = false;
            generateTimeSlots(); // Refresh available slots
        }
        
        // If date is today, check if time is at least 2 hours from now
        if (date === new Date().toISOString().split('T')[0]) {
            const now = new Date();
            const [hour, minute] = timeKey.split('_')[1].split(':').map(Number);
            
            const selectedDateTime = new Date();
            selectedDateTime.setHours(hour, minute, 0, 0);
            
            const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            
            if (selectedDateTime < twoHoursFromNow) {
                document.getElementById('time-error').textContent = 'Please select a time at least 2 hours from now';
                document.getElementById('time-error').classList.add('show');
                isValid = false;
            }
        }
    }
    
    if (isValid) {
        nextStep(2);
    }
    
    return isValid;
}

// Validate and submit booking
function validateAndSubmitBooking() {
    // Validate all steps
    if (!validateStep1()) {
        // Go back to step 1 if validation fails
        document.getElementById('step-3').classList.remove('active');
        document.getElementById('step-2').classList.remove('active');
        document.getElementById('step-1').classList.add('active');
        currentStep = 1;
        return;
    }
    
    if (!validateStep2()) {
        // Go back to step 2 if validation fails
        document.getElementById('step-3').classList.remove('active');
        document.getElementById('step-2').classList.add('active');
        currentStep = 2;
        return;
    }
    
    // If all validation passes, submit the booking
    submitBooking();
}

// Submit booking - FIXED VERSION
function submitBooking() {
    // Collect form data based on contact method
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
    
    const registration = {
        id: Date.now(),
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
        timestamp: new Date().toLocaleString()
    };
    
    // Save to localStorage
    registrations.push(registration);
    localStorage.setItem('synced2ps_registrations', JSON.stringify(registrations));
    
    // Mark time slot as booked
    bookedTimeSlots[timeKey] = true;
    localStorage.setItem('synced2ps_booked_slots', JSON.stringify(bookedTimeSlots));
    
    // Show appointment confirmation popup
    document.getElementById('appointment-date-display').textContent = formatDate(date);
    document.getElementById('appointment-time-display').textContent = timeDisplay + ' GMT';
    
    // IMPORTANT: Close booking modal first
    closeBookingModal();
    
    // Then show the confirmation modal after a brief delay
    setTimeout(function() {
        document.getElementById('appointmentConfirmationModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 100);
    
    // Send notification (simulated - in production, this would connect to your backend)
    sendRegistrationNotification(registration);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Send notification (in production, this would be a real API call)
function sendRegistrationNotification(registration) {
    console.log('New registration received:', registration);
    // In a real implementation, you would send this to your backend
}

// Admin access functions
function showAdminPanel() {
    document.getElementById('adminAccessPanel').style.display = 'block';
}

function hideAdminPanel() {
    document.getElementById('adminAccessPanel').style.display = 'none';
}

function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === 'Synced2PS@') {
        showAdminInterface();
    } else {
        alert('Incorrect password');
    }
}

function showAdminInterface() {
    hideAdminPanel();
    
    // Create admin panel
    const adminPanel = document.createElement('div');
    adminPanel.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10001; width: 90%; max-width: 900px; max-height: 80vh; overflow-y: auto;">
            <h2 style="color: var(--primary); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span>Synced2PS Admin Panel</span>
                <button onclick="document.body.removeChild(this.parentElement.parentElement.parentElement)" style="background: #ccc; color: #333; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Close</button>
            </h2>
            <p><strong>Total Registrations:</strong> ${registrations.length}</p>
            <p><strong>Booked Time Slots:</strong> ${Object.keys(bookedTimeSlots).length}</p>
            
            <div style="margin: 20px 0;">
                <input type="text" id="adminSearch" placeholder="Search by name, email, or plan..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px;">
                
                <div id="adminRegistrationsList" style="max-height: 400px; overflow-y: auto;">
                    ${generateAdminListHTML(registrations)}
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="exportRegistrations()" style="background: var(--synced-gradient); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-download"></i> Export All (CSV)
                </button>
                <button onclick="clearAllRegistrations()" style="background: #ff3b30; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Clear All Data
                </button>
                <button onclick="clearBookedSlots()" style="background: #ff9500; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-calendar-times"></i> Clear Booked Slots
                </button>
            </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000;"></div>
    `;
    document.body.appendChild(adminPanel);
    
    // Add search functionality
    setTimeout(() => {
        document.getElementById('adminSearch').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = registrations.filter(reg => 
                reg.name.toLowerCase().includes(searchTerm) ||
                reg.email.toLowerCase().includes(searchTerm) ||
                reg.plan.toLowerCase().includes(searchTerm) ||
                reg.contactInfo.toLowerCase().includes(searchTerm)
            );
            document.getElementById('adminRegistrationsList').innerHTML = generateAdminListHTML(filtered);
        });
    }, 100);
}

function generateAdminListHTML(registrationsList) {
    if (registrationsList.length === 0) {
        return '<p style="text-align: center; color: #666; padding: 20px;">No registrations found</p>';
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">';
    html += '<tr style="background: #f5f5f7; position: sticky; top: 0;">';
    html += '<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>';
    html += '<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Plan</th>';
    html += '<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Name</th>';
    html += '<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Contact</th>';
    html += '<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Call Time</th>';
    html += '</tr>';
    
    registrationsList.slice().reverse().forEach(reg => {
        const contactDisplay = reg.contactMethod === 'phone' 
            ? `📱 ${reg.contactInfo}`
            : `👻 ${reg.contactInfo}`;
            
        html += '<tr>';
        html += `<td style="padding: 10px; border: 1px solid #ddd;">${new Date(reg.timestamp).toLocaleDateString()}</td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd;"><strong>${reg.plan}</strong></td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd;">${reg.name}<br><small>${reg.email}</small></td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd;">${contactDisplay}</td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd;">${reg.date}<br>${reg.time} (GMT)</td>`;
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}

function exportRegistrations() {
    if (registrations.length === 0) {
        alert('No registrations to export');
        return;
    }
    
    // Convert to CSV
    const headers = ['ID', 'Plan', 'Price', 'Contact Method', 'Name', 'Email', 'Contact Info', 'Country', 'Call Date', 'Call Time', 'Timezone', 'Experience', 'Goals', 'Questions', 'Timestamp'];
    const csvRows = [headers.join(',')];
    
    registrations.forEach(reg => {
        const row = [
            reg.id,
            reg.plan,
            reg.price,
            reg.contactMethod,
            `"${reg.name}"`,
            reg.email,
            `"${reg.contactInfo}"`,
            reg.country,
            reg.date,
            reg.time,
            reg.timezone,
            reg.experience,
            `"${reg.goals}"`,
            `"${reg.questions}"`,
            `"${reg.timestamp}"`
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synced2ps_registrations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    alert(`Exported ${registrations.length} registrations`);
}

function clearAllRegistrations() {
    if (confirm('Are you sure you want to delete ALL registration data? This cannot be undone.')) {
        localStorage.removeItem('synced2ps_registrations');
        registrations = [];
        alert('All registration data has been cleared.');
        document.querySelector('[style*="position: fixed; top: 50%; left: 50%"]').remove();
    }
}

function clearBookedSlots() {
    if (confirm('Clear all booked time slots? This will make all times available again.')) {
        localStorage.removeItem('synced2ps_booked_slots');
        bookedTimeSlots = {};
        alert('All booked time slots have been cleared.');
        document.querySelector('[style*="position: fixed; top: 50%; left: 50%"]').remove();
    }
}

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            if (document.getElementById('bookingModal').classList.contains('active')) {
                closeBookingModal();
            }
            if (document.getElementById('appointmentConfirmationModal').classList.contains('active')) {
                closeAppointmentConfirmation();
            }
        }
    });
});

// Keyboard shortcuts for admin access (Ctrl+Shift+A)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        showAdminPanel();
    }
});
