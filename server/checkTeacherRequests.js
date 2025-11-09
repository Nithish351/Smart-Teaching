const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkRequests() {
  try {
    console.log('\n🔍 Checking teacher_requests collection...\n');
    
    const snapshot = await db.collection('teacher_requests').get();
    
    console.log(`Total requests: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('❌ No teacher requests found in Firestore!');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📋 Request:');
      console.log(`  ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Email: ${data.email}`);
      console.log(`  Status: ${data.status || 'pending'}`);
      console.log(`  Timestamp: ${data.timestamp || 'N/A'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkRequests();
