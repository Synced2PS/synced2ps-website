// Admin password (in production, use Firebase Authentication)
const ADMIN_PASSWORD = "appleadmin2024"; // Change this!

let registrations = [];

// Login function
function login() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadRegistrations();
    } else {
        alert('Incorrect password!');
    }
}

// Load registrations from Firestore
function loadRegistrations() {
    db.collection('registrations')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            registrations = [];
            const tableBody = document.getElementById('registrationsTable');
            tableBody.innerHTML = '';
            
            let todayCount = 0;
            const today = new Date().toDateString();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                registrations.push(data);
                
                // Count today's registrations
                const regDate = data.timestamp?.toDate().toDateString();
                if (regDate === today) todayCount++;
                
                // Add to table
                const row = `
                    <tr>
                        <td>${data.name || 'N/A'}</td>
                        <td>${data.email || 'N/A'}</td>
                        <td>${data.cardType || 'N/A'}</td>
                        <td>$${data.amount || 'N/A'}</td>
                        <td>${data.timestamp ? data.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                        <td>${data.ip || 'N/A'}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            
            // Update counts
            document.getElementById('totalCount').textContent = registrations.length;
            document.getElementById('todayCount').textContent = todayCount;
        });
}

// Export to CSV
function exportToCSV() {
    let csv = 'Name,Email,Card Type,Amount,Date,IP Address\n';
    
    registrations.forEach(reg => {
        const date = reg.timestamp ? reg.timestamp.toDate().toLocaleString() : 'N/A';
        csv += `"${reg.name || ''}","${reg.email || ''}","${reg.cardType || ''}","${reg.amount || ''}","${date}","${reg.ip || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Logout
function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('adminPassword').value = '';
}
