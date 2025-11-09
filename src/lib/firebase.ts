import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAjtHuW7aq-MV4fk9Psp0Qiz15N1MC4HLc",
  authDomain: "smart-teaching-94143.firebaseapp.com",
  projectId: "smart-teaching-94143",
  storageBucket: "smart-teaching-94143.firebasestorage.app",
  messagingSenderId: "155325747108",
  appId: "1:155325747108:web:75174bfe3f8ed19ab33b31",
  measurementId: "G-4JVBR69SL0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;