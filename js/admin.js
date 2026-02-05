console.log("Admin script loaded");

// Admin password
const ADMIN_PASSWORD = "appleadmin2024";

// Login function
function login() {
    const password = document.getElementById('adminPassword').value;
    console.log("Login attempt with password:", password);
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        console.log("Login successful!");
        loadRegistrations();
    } else {
        alert('❌ Incorrect password!');
        console.log("Login failed");
    }
}

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
                console.log("Registration:", data);
                
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
                    <td>$${data.amount || 'N/A'}</td>
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

// Logout
function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('adminPassword').value = '';
    console.log("Logged out");
}

// Enter key for password
document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});
