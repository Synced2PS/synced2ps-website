console.log("Admin script loaded");

// ==================== FRONT-END ONLY ADMIN LOGIN (HARDENED) ====================
// NOTE: Without server-side auth, this is not truly secure. This removes plaintext passwords and adds lockout.

const ADMIN_PASSWORD_SHA256_HEX = "fa1581bb39a1c19ada61774f8419d3e58ea239bdf20916667f9b777d92a9a019"; // SHA-256 of your admin password
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_FAILURES = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const K_AUTH = "admin_authenticated";
const K_TS = "admin_timestamp";
const K_FAILS = "admin_failures";
const K_LOCKUNTIL = "admin_lock_until";

function now() { return Date.now(); }

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return out === 0;
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isLockedOut() {
  const until = Number(sessionStorage.getItem(K_LOCKUNTIL) || "0");
  return until && now() < until;
}

function lockoutRemainingSeconds() {
  const until = Number(sessionStorage.getItem(K_LOCKUNTIL) || "0");
  return Math.max(0, Math.ceil((until - now()) / 1000));
}

function recordFailure() {
  const fails = Number(sessionStorage.getItem(K_FAILS) || "0") + 1;
  sessionStorage.setItem(K_FAILS, String(fails));
  if (fails >= MAX_FAILURES) {
    sessionStorage.setItem(K_LOCKUNTIL, String(now() + LOCKOUT_MS));
    sessionStorage.setItem(K_FAILS, "0");
  }
}

function clearFailures() {
  sessionStorage.removeItem(K_FAILS);
  sessionStorage.removeItem(K_LOCKUNTIL);
}

function setAuthenticated() {
  sessionStorage.setItem(K_AUTH, "true");
  sessionStorage.setItem(K_TS, String(now()));
}

function clearAuth() {
  sessionStorage.removeItem(K_AUTH);
  sessionStorage.removeItem(K_TS);
}

function isAuthenticated() {
  if (sessionStorage.getItem(K_AUTH) !== "true") return false;
  const ts = Number(sessionStorage.getItem(K_TS) || "0");
  if (!ts) return false;
  if (now() - ts > SESSION_TTL_MS) {
    clearAuth();
    return false;
  }
  return true;
}

function showPanel() {
  const authSection = document.getElementById("authSection");
  const adminPanel = document.getElementById("adminPanel");
  if (authSection) authSection.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
}

function showLogin() {
  const authSection = document.getElementById("authSection");
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) adminPanel.style.display = "none";
  if (authSection) authSection.style.display = "block";
}

// If already authed (and not expired), skip login UI
if (isAuthenticated()) {
  showPanel();
  try { loadRegistrations(); } catch (e) {}
}

// Login function (called by your button)
async function login() {
  const input = document.getElementById("adminPassword");
  if (!input) return;

  if (isLockedOut()) {
    alert(`Too many attempts. Try again in ${lockoutRemainingSeconds()}s.`);
    input.value = "";
    input.focus();
    return;
  }

  const password = input.value || "";
  input.value = "";

  try {
    const enteredHash = await sha256Hex(password);
    if (constantTimeEqual(enteredHash, ADMIN_PASSWORD_SHA256_HEX)) {
      clearFailures();
      setAuthenticated();
      showPanel();
      loadRegistrations();
    } else {
      recordFailure();
      alert("❌ Incorrect password!");
      input.focus();
    }
  } catch (e) {
    alert("Unable to verify password in this browser.");
  }
}

// Logout
function logout() {
  clearFailures();
  clearAuth();
  showLogin();
  const input = document.getElementById("adminPassword");
  if (input) input.value = "";
  console.log("Logged out");
}

// Enter key for password
document.getElementById("adminPassword")?.addEventListener("keypress", (e) => {
  if ((e.key || "").toLowerCase() === "enter") {
    login();
  }
});

// ===== Existing data loading below (unchanged) =====

// Load registrations
function loadRegistrations() {
    console.log("Loading registrations...");

    db.collection('registrations')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            console.log("Got", snapshot.size, "registrations");

            const tableBody = document.getElementById('registrationsTable');
            tableBody.innerHTML = '';

            let todayCount = 0;
            const today = new Date().toDateString();

            snapshot.forEach(doc => {
                const data = doc.data();

                // Count today's
                const regDate = data.timestamp?.toDate ? 
                    data.timestamp.toDate().toDateString() : 
                    new Date(data.date).toDateString();

                if (regDate === today) todayCount++;

                // Add to table
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.cardType || 'N/A'}</td>
                    <td>${data.amount ? '$' + data.amount : 'N/A'}</td>
                    <td>${data.timestamp ? 
                        data.timestamp.toDate().toLocaleString() : 
                        (data.date ? new Date(data.date).toLocaleString() : 'N/A')}</td>
                `;
                tableBody.appendChild(row);
            });

            // Update counts
            document.getElementById('totalCount').textContent = snapshot.size;
            document.getElementById('todayCount').textContent = todayCount;
        }, (error) => {
            console.error("Error loading registrations:", error);
        });
}
