// Your Firebase configuration from the screenshot
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
const db = firebase.firestore();  // FIXED: .firestore() not .fstore()
console.log("Firebase initialized successfully!");
