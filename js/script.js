console.log("Simple form script loaded!");

document.getElementById('registrationForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const cardType = document.getElementById('cardType').value;
    const amount = document.getElementById('amount').value;
    
    console.log("Form submitted with:", name, email, cardType, amount);
    
    // Simple success message
    document.getElementById('message').innerHTML = `
        <div class="success">
            ✅ Thank you ${name}! Your $${amount} ${cardType} gift card is being generated.<br>
            Details sent to: ${email}
        </div>
    `;
    
    // Reset form
    document.getElementById('registrationForm').reset();
    
    return false;
});
