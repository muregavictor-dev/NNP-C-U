// NNP Christian Union - Firebase Configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyA53_wdp9fk9ZMGXyi-VLuKQIJkqSTTjls",
    authDomain: "nnp-christian-union.firebaseapp.com",
    databaseURL: "https://nnp-christian-union-default-rtdb.firebaseio.com/",
    projectId: "nnp-christian-union",
    storageBucket: "nnp-christian-union.firebasestorage.app",
    messagingSenderId: "803897522",
    appId: "1:803897522:web:7c7d04cf2726b7bfcb09ab",
    measurementId: "G-07XQ10ZCBL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const database = getDatabase(app);

// Make Firebase services accessible to other scripts
window.nnpFirebase = {
    app,
    auth,
    database
};

// Test database connection
const connectionRef = ref(database, ".info/connected");

onValue(connectionRef, (snapshot) => {
    if (snapshot.val() === true) {
        console.log("🔥 NNP CU Firebase connected successfully!");
    } else {
        console.log("NNP CU Firebase disconnected.");
    }
});

console.log("NNP CU Firebase initialized.");
export { app, auth, database };
