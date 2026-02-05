document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const cardType = document.getElementById('cardType').value;
    const amount = document.getElementById('amount').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;
    
    try {
        // Save to Firestore
        await db.collection('registrations').add({
            name: name,
            email: email,
            cardType: cardType,
            amount: amount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: await getClientIP(),
            userAgent: navigator.userAgent
        });
        
        // Show success message
        showMessage('✅ Gift card generated! Check your email for details.', 'success');
        
        // Reset form
        document.getElementById('registrationForm').reset();
        
    } catch (error) {
        console.error('Error saving registration:', error);
        showMessage('❌ Error generating gift card. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Get client IP (using free IP API)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unknown';
    }
}

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 5000);
}
