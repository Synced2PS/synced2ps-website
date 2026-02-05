// Initialize Firebase - Use YOUR config from earlier
const firebaseConfig = {
    apiKey: "AIzaSyBy1SyiwD4QSC2T7_pOSHrhIANfgqoxqju",
    authDomain: "synced2ps.firebaseapp.com",
    projectId: "synced2ps",
    storageBucket: "synced2ps.firebasestorage.app",
    messagingSenderId: "326576247559",
    appId: "1:326576247559:web:7829337e4fef2f7504eba2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("Firebase connected!");

// KEEP ALL YOUR EXISTING BOOKING SYSTEM CODE BELOW
// -------------------------------------------------

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

// ... KEEP ALL YOUR EXISTING FUNCTIONS AS THEY WERE ...
// [Copy ALL the JavaScript from your working version here]

// -------------------------------------------------
// MODIFY THE submitBooking() FUNCTION TO SAVE TO FIREBASE
// -------------------------------------------------

// Submit booking - MODIFIED VERSION
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
        timestamp: new Date().toLocaleString(),
        firebaseSaved: false // Track if saved to Firebase
    };
    
    // 1. Save to Firebase FIRST
    saveToFirebase(registration)
        .then(firebaseId => {
            console.log('Saved to Firebase with ID:', firebaseId);
            registration.firebaseId = firebaseId;
            registration.firebaseSaved = true;
            
            // 2. Then save to localStorage as backup
            registrations.push(registration);
            localStorage.setItem('synced2ps_registrations', JSON.stringify(registrations));
            
            // 3. Mark time slot as booked
            bookedTimeSlots[timeKey] = true;
            localStorage.setItem('synced2ps_booked_slots', JSON.stringify(bookedTimeSlots));
            
            // 4. Show confirmation
            document.getElementById('appointment-date-display').textContent = formatDate(date);
            document.getElementById('appointment-time-display').textContent = timeDisplay + ' GMT';
            
            // Close booking modal first
            closeBookingModal();
            
            // Then show confirmation
            setTimeout(function() {
                document.getElementById('appointmentConfirmationModal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }, 100);
            
            // Send notification
            sendRegistrationNotification(registration);
        })
        .catch(error => {
            console.error('Firebase save failed:', error);
            
            // Fallback: Save only to localStorage
            alert('Network issue - saving locally. We\'ll sync to server later.');
            
            registrations.push(registration);
            localStorage.setItem('synced2ps_registrations', JSON.stringify(registrations));
            
            bookedTimeSlots[timeKey] = true;
            localStorage.setItem('synced2ps_booked_slots', JSON.stringify(bookedTimeSlots));
            
            // Show confirmation anyway
            document.getElementById('appointment-date-display').textContent = formatDate(date);
            document.getElementById('appointment-time-display').textContent = timeDisplay + ' GMT';
            
            closeBookingModal();
            
            setTimeout(function() {
                document.getElementById('appointmentConfirmationModal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }, 100);
        });
}

// Save registration to Firebase
async function saveToFirebase(registration) {
    try {
        const docRef = await db.collection('bookings').add({
            ...registration,
            firebaseTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: await getClientIP(),
            userAgent: navigator.userAgent
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        throw error;
    }
}

// Get client IP
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}

// -------------------------------------------------
// MODIFY THE showAdminInterface() FUNCTION TO SHOW FIREBASE DATA
// -------------------------------------------------

function showAdminInterface() {
    hideAdminPanel();
    
    // First, load data from Firebase
    loadFirebaseBookings()
        .then(firebaseData => {
            // Combine localStorage and Firebase data
            const allRegistrations = [...registrations, ...firebaseData];
            
            // Create admin panel
            const adminPanel = document.createElement('div');
            adminPanel.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10001; width: 90%; max-width: 900px; max-height: 80vh; overflow-y: auto;">
                    <h2 style="color: var(--primary); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Synced2PS Admin Panel</span>
                        <button onclick="document.body.removeChild(this.parentElement.parentElement.parentElement)" style="background: #ccc; color: #333; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Close</button>
                    </h2>
                    <p><strong>Local Registrations:</strong> ${registrations.length}</p>
                    <p><strong>Firebase Registrations:</strong> ${firebaseData.length}</p>
                    <p><strong>Booked Time Slots:</strong> ${Object.keys(bookedTimeSlots).length}</p>
                    
                    <div style="margin: 20px 0;">
                        <input type="text" id="adminSearch" placeholder="Search by name, email, or plan..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px;">
                        
                        <div id="adminRegistrationsList" style="max-height: 400px; overflow-y: auto;">
                            ${generateAdminListHTML(allRegistrations)}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="exportRegistrations()" style="background: var(--synced-gradient); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-download"></i> Export All (CSV)
                        </button>
                        <button onclick="syncToFirebase()" style="background: #5856d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-sync"></i> Sync to Firebase
                        </button>
                        <button onclick="clearAllRegistrations()" style="background: #ff3b30; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Clear Local Data
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
                    const filtered = allRegistrations.filter(reg => 
                        reg.name.toLowerCase().includes(searchTerm) ||
                        reg.email.toLowerCase().includes(searchTerm) ||
                        reg.plan.toLowerCase().includes(searchTerm) ||
                        reg.contactInfo.toLowerCase().includes(searchTerm)
                    );
                    document.getElementById('adminRegistrationsList').innerHTML = generateAdminListHTML(filtered);
                });
            }, 100);
        })
        .catch(error => {
            console.error('Error loading Firebase data:', error);
            // Show admin panel with just localStorage data
            showAdminPanelWithLocalData();
        });
}

// Load bookings from Firebase
async function loadFirebaseBookings() {
    try {
        const snapshot = await db.collection('bookings').orderBy('firebaseTimestamp', 'desc').get();
        const firebaseData = [];
        snapshot.forEach(doc => {
            firebaseData.push({
                id: doc.id,
                ...doc.data(),
                source: 'Firebase'
            });
        });
        return firebaseData;
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        return [];
    }
}

// Sync local data to Firebase
async function syncToFirebase() {
    const unsynced = registrations.filter(reg => !reg.firebaseSaved);
    
    if (unsynced.length === 0) {
        alert('All data is already synced to Firebase!');
        return;
    }
    
    let syncedCount = 0;
    
    for (const reg of unsynced) {
        try {
            await saveToFirebase(reg);
            reg.firebaseSaved = true;
            syncedCount++;
        } catch (error) {
            console.error('Failed to sync registration:', reg.id, error);
        }
    }
    
    // Update localStorage
    localStorage.setItem('synced2ps_registrations', JSON.stringify(registrations));
    
    alert(`Synced ${syncedCount} registrations to Firebase!`);
    
    // Refresh admin panel
    document.querySelector('[style*="position: fixed; top: 50%; left: 50%"]').remove();
    showAdminInterface();
}
