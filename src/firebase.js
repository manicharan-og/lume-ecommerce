import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyDkJ0OxcX85uApnZbRd4yjMfhcA1Bm_c9w",

  authDomain:
    "lume-clothing-store.firebaseapp.com",

  projectId:
    "lume-clothing-store",

  storageBucket:
    "lume-clothing-store.firebasestorage.app",

  messagingSenderId:
    "966303360699",

  appId:
    "1:966303360699:web:0462589465106506a86b9e",
};

// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore Database
export const db = getFirestore(app);

export default app;