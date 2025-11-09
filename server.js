// script.js

// 1. **FIREBASE CONFIGURATION** - REPLACE WITH YOUR ACTUAL VALUES
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore();
const storage = app.storage();
const auth = app.auth();

// **2. VERCEL BACKEND API BASE URL** - REPLACE WITH YOUR DEPLOYED VERCEL LINK
const VERCEL_API_BASE_URL = 'https://YOUR-VERCEL-PROJECT.vercel.app'; 
// Example: The endpoint for liking a video would be: VERCEL_API_BASE_URL + '/api/likeVideo'
