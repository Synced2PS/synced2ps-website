// ==================== FIREBASE CONFIGURATION ====================
console.log("🚀 Initializing Firebase...");

// YOUR FIREBASE CONFIG - REPLACE WITH YOUR ACTUAL VALUES
const firebaseConfig = {
    apiKey: "AIzaSyYOUR_API_KEY_HERE",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase only if not already initialized
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase initialized successfully!");
        } catch (error) {
            console.error("❌ Firebase initialization error:", error);
        }
    }
    
    // Make database globally available
    window.firebaseDB = firebase.firestore();
    window.firebaseAuth = firebase.auth();
    
    console.log("✅ Firebase Firestore available as 'firebaseDB'");
} else {
    console.error("❌ Firebase SDK not loaded!");
}
