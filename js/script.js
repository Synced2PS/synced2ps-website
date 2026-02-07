// ==================== FIREBASE CHECK ====================
console.log("Firebase available:", typeof firebaseDB !== 'undefined');

if (typeof firebaseDB === 'undefined' && typeof firebase !== 'undefined') {
    console.log("Initializing Firebase from script.js...");
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig || {});
    }
    window.firebaseDB = firebase.firestore();
}

// ==================== ADMIN ACCESS (CLEAN & FIXED) ====================
(function () {
    "use strict";

    const ADMIN_URL = "admin.html";
    const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

    // SHA-256 of: s2ps@S2PS@
    const ADMIN_PASSWORD_SHA256_HEX =
        "fa1581bb39a1c19ada61774f8419d3e58ea239dbf20916667f9b777d92a9a019";

    const K_AUTH = "admin_authenticated";
    const K_TS = "admin_timestamp";

    function now() {
        return Date.now();
    }

    async function sha256Hex(str) {
        const data = new TextEncoder().encode(str);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return [...new Uint8Array(digest)]
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
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

    function showModal() {
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

    function closeModal() {
        const modal = document.getElementById("adminPasswordModal");
        if (!modal) return;
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
    }

    async function submitPassword() {
        const input = document.getElementById("adminPasswordInput");
        const error = document.getElementById("passwordError");
        if (!input || !error) return;

        const entered = input.value;
        input.value = "";

        const hash = await sha256Hex(entered);

        if (hash === ADMIN_PASSWORD_SHA256_HEX) {
            sessionStorage.setItem(K_AUTH, "true");
            sessionStorage.setItem(K_TS, String(now()));
            closeModal();
            window.open(ADMIN_URL, "_blank");
        } else {
            error.textContent = "Incorrect password";
            error.style.display = "block";
            input.focus();
        }
    }

    // Expose ONE clean API
    window.AdminAccess = {
        showAdminPasswordModal: showModal,
        submitAdminPassword: submitPassword,
        isAuthenticated
    };

    // Keyboard shortcut
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
            e.preventDefault();
            showModal();
        }
    });

    // Close modal on outside click
    document.addEventListener("click", e => {
        const modal = document.getElementById("adminPasswordModal");
        if (modal && e.target === modal) closeModal();
    });
})();

// ==================== BOOKING LOGIC (UNCHANGED CORE) ====================
let selectedPlan = "";
let selectedPlanPrice = 0;
let currentStep = 1;
let contactMethod = "phone";
let timeDropdownOpen = false;
let realTimeBookedSlots = {};

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Website loaded");
    initializeAll();
    loadBookedSlots();
});

// -------------------- BOOKINGS --------------------
async function loadBookedSlots() {
    realTimeBookedSlots = JSON.parse(
        localStorage.getItem("synced2ps_booked_slots") || "{}"
    );

    if (typeof firebaseDB !== "undefined") {
        const snapshot = await firebaseDB.collection("bookedSlots").get();
        snapshot.forEach(doc => {
            realTimeBookedSlots[doc.data().timeKey] = true;
        });
    }

    generateTimeSlots();
}

function generateTimeSlots() {
    const dateInput = document.getElementById("call-date");
    const dropdown = document.getElementById("timeSelectDropdown");
    if (!dateInput || !dropdown) return;

    const date = dateInput.value;
    dropdown.innerHTML = "";

    for (let hour = 9; hour <= 20; hour++) {
        for (let min of [0, 30]) {
            if (hour === 20 && min === 30) continue;
            const key = `${date}_${hour}:${min === 0 ? "00" : "30"}`;
            const label = `${hour % 12 || 12}:${min === 0 ? "00" : "30"} ${hour >= 12 ? "PM" : "AM"}`;
            const booked = realTimeBookedSlots[key];

            dropdown.innerHTML += `
                <div class="time-option ${booked ? "booked" : ""}"
                     ${!booked ? `onclick="selectTime('${label}','${key}')"` : ""}>
                    ${label} ${booked ? "(Booked)" : ""}
                </div>`;
        }
    }
}

function selectTime(label, key) {
    document.getElementById("selectedTimeDisplay").textContent = label;
    const input = document.getElementById("selected-time");
    input.value = label;
    input.dataset.key = key;
    closeTimeDropdown();
}

// -------------------- UI HELPERS --------------------
function initializeAll() {
    console.log("✅ UI ready");
}

function toggleTimeDropdown() {
    const dropdown = document.getElementById("timeSelectDropdown");
    dropdown.classList.toggle("open");
}

function closeTimeDropdown() {
    const dropdown = document.getElementById("timeSelectDropdown");
    dropdown.classList.remove("open");
}

window.selectTime = selectTime;
window.toggleTimeDropdown = toggleTimeDropdown;
