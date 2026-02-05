console.log("Firebase registration script loaded!");

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted!");

    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const cardType = document.getElementById('cardType').value;
    const amount = document.getElementById('amount').value;

    console.log("Collected:", { name, email, cardType, amount });

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;

    try {
        // Check if Firebase is loaded
        if (!firebase || !firebase.firestore) {
            throw new Error("Firebase not loaded!");
        }

        // Save to Firebase
        await db.collection('registrations').add({
            name: name,
            email: email,
            cardType: cardType,
            amount: amount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            date: new Date().toISOString()
        });

        console.log("Saved to Firebase!");
        
        // Show success message
        showMessage('✅ Gift card generated! Check your email for details.', 'success');
        
        // Reset form
        document.getElementById('registrationForm').reset();

    } catch (error) {
        console.error('Error saving registration:', error);
        showMessage('❌ Error: ' + error.message, 'error');
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

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

// Test function to check Firebase
window.testFirebase = async () => {
    try {
        const testData = await db.collection('test').add({
            test: true,
            time: new Date().toISOString()
        });
        console.log("Firebase test successful!", testData);
        showMessage('✅ Firebase connected!', 'success');
        return true;
    } catch (error) {
        console.error("Firebase test failed:", error);
        showMessage('❌ Firebase error: ' + error.message, 'error');
        return false;
    }
};
