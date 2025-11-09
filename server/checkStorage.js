require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStorage() {
  try {
    console.log('\n========================================');
    console.log('📊 STORAGE CHECK REPORT');
    console.log('========================================\n');

    // Check Firestore Notes
    console.log('1️⃣  FIRESTORE NOTES METADATA:');
    console.log('----------------------------------------');
    const notesSnapshot = await db.collection('notes').get();
    console.log(`   Total notes in Firestore: ${notesSnapshot.size}`);
    
    if (notesSnapshot.size > 0) {
      console.log('\n   Sample note document:');
      const sampleNote = notesSnapshot.docs[0];
      const noteData = sampleNote.data();
      console.log(`   ID: ${sampleNote.id}`);
      console.log(`   Title: ${noteData.title}`);
      console.log(`   Teacher ID: ${noteData.teacherId}`);
      console.log(`   Uploaded: ${noteData.uploadedAt}`);
      console.log(`   Storage Path: ${noteData.storagePath || 'N/A'}`);
      console.log(`   Public URL: ${noteData.publicUrl || 'N/A'}`);
    }

    // Check Firestore Quizzes
    console.log('\n2️⃣  FIRESTORE QUIZZES:');
    console.log('----------------------------------------');
    const quizzesSnapshot = await db.collection('quizzes').get();
    console.log(`   Total quizzes in Firestore: ${quizzesSnapshot.size}`);
    
    if (quizzesSnapshot.size > 0) {
      console.log('\n   Sample quiz document:');
      const sampleQuiz = quizzesSnapshot.docs[0];
      const quizData = sampleQuiz.data();
      console.log(`   ID: ${sampleQuiz.id}`);
      console.log(`   Title: ${quizData.title}`);
      console.log(`   Teacher ID: ${quizData.teacherId}`);
      console.log(`   Published: ${quizData.isPublished}`);
      console.log(`   Questions: ${quizData.questions ? quizData.questions.length : 0}`);
    }

    // Check Supabase Storage
    console.log('\n3️⃣  SUPABASE STORAGE (PDF FILES):');
    console.log('----------------------------------------');
    const { data: files, error } = await supabase.storage.from('notes').list();
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   Total PDF files in Supabase: ${files.length}`);
      if (files.length > 0) {
        console.log('\n   Files:');
        files.forEach((file, index) => {
          const sizeKB = file.metadata?.size ? Math.round(file.metadata.size / 1024) : 0;
          console.log(`   ${index + 1}. ${file.name} (${sizeKB} KB)`);
        });
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📋 SUMMARY:');
    console.log('========================================');
    console.log(`✅ Firestore Notes Metadata: ${notesSnapshot.size} documents`);
    console.log(`✅ Firestore Quizzes: ${quizzesSnapshot.size} documents`);
    console.log(`✅ Supabase PDF Storage: ${files ? files.length : 0} files`);
    console.log('\n💡 Architecture:');
    console.log('   - Notes metadata (title, teacher, etc.) → Firestore');
    console.log('   - PDF files (large binaries) → Supabase Storage');
    console.log('   - Quizzes (questions, answers) → Firestore');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkStorage();
