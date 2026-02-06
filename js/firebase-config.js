// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyBy1SyiwD4QSC2T7_pOSHrhIANfgqoxqju",
    authDomain: "synced2ps.firebaseapp.com",
    projectId: "synced2ps",
    storageBucket: "synced2ps.firebasestorage.app",
    messagingSenderId: "326576247559",
    appId: "1:326576247559:web:7829337e4fef2f7504eba2"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized successfully!");

// Export for use in other files
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAuth = auth;
