// Firebase Admin SDK for backend operations
const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
// Option 1: Using environment variable (recommended for production)
// Download service account key from Firebase Console > Project Settings > Service Accounts
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable

// Option 2: Direct initialization (for development)
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "smart-teaching-94143",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
};

// Initialize Firebase Admin only if not already initialized
let db = null;
let auth = null;

if (!admin.apps.length) {
  try {
    // If service account credentials are provided in env
    if (serviceAccount.clientEmail && serviceAccount.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId
      });
      console.log('[Firebase Admin] Initialized with service account credentials');
      db = admin.firestore();
      auth = admin.auth();
    } else {
      // No credentials available - initialize Firestore only without Auth
      console.warn('[Firebase Admin] No service account credentials found');
      console.warn('[Firebase Admin] To enable Firebase Authentication:');
      console.warn('[Firebase Admin] 1. Go to Firebase Console > Project Settings > Service Accounts');
      console.warn('[Firebase Admin] 2. Generate new private key');
      console.warn('[Firebase Admin] 3. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env');
      console.log('[Firebase Admin] Initializing with Firestore-only (no Firebase Auth)');
      
      // Initialize with project ID only for Firestore
      admin.initializeApp({
        projectId: serviceAccount.projectId
      });
      
      db = admin.firestore();
      // auth remains null - Firestore-only authentication will be used
      console.log('[Firebase Admin] Firestore initialized successfully');
      console.log('[Firebase Admin] Using Firestore-only authentication (email/password stored in Firestore)');
    }
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error.message);
    console.warn('[Firebase Admin] Running without Firebase Admin SDK');
    console.warn('[Firebase Admin] Authentication and data storage may not work properly');
  }
}

// Get instances if already initialized
if (admin.apps.length > 0 && !db) {
  try {
    db = admin.firestore();
  } catch (e) {
    console.warn('[Firebase Admin] Could not get Firestore instance:', e.message);
  }
}

if (admin.apps.length > 0 && !auth && serviceAccount.clientEmail) {
  try {
    auth = admin.auth();
  } catch (e) {
    console.warn('[Firebase Admin] Could not get Auth instance:', e.message);
  }
}

// Firestore collections
const COLLECTIONS = {
  TEACHERS: 'teachers',
  STUDENTS: 'students',
  TEACHER_REQUESTS: 'teacherRequests',
  NOTES: 'notes',
  QUIZZES: 'quizzes',
  QUIZ_ATTEMPTS: 'quizAttempts'
};

module.exports = {
  admin,
  db,
  auth,
  COLLECTIONS
};
