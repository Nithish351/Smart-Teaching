// Firestore helper functions for notes and quizzes
const { db, COLLECTIONS } = require('./authFirestore');

// ==================== NOTES ====================

// Save note metadata to Firestore (file stored in Supabase)
async function saveNote(noteData) {
  try {
    if (!db) throw new Error('Firestore not initialized');
    
    // Don't store fileData - it's in Supabase Storage
    const metadata = {
      id: noteData.id,
      title: noteData.title,
      teacherId: noteData.teacherId,
      fileName: noteData.fileName,
      storagePath: noteData.storagePath,
      publicUrl: noteData.publicUrl,
      size: noteData.size,
      mimeType: noteData.mimeType,
      uploadedAt: noteData.uploadedAt
    };
    
    await db.collection(COLLECTIONS.NOTES).doc(noteData.id).set(metadata);
    console.log('[Firestore] Note metadata saved:', noteData.id);
    return { ok: true };
  } catch (error) {
    console.error('[Firestore] saveNote error:', error);
    return { ok: false, error: error.message };
  }
}

// Get all notes for a teacher
async function getTeacherNotes(teacherId) {
  try {
    if (!db) return [];
    
    const snapshot = await db.collection(COLLECTIONS.NOTES)
      .where('teacherId', '==', teacherId)
      .get();
    
    const notes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notes.push({
        id: data.id,
        title: data.title,
        fileName: data.fileName,
        size: data.size,
        mimeType: data.mimeType,
        publicUrl: data.publicUrl,
        uploadedAt: data.uploadedAt
      });
    });
    
    // Sort by uploadedAt in memory (descending - newest first)
    notes.sort((a, b) => {
      const dateA = new Date(a.uploadedAt || 0);
      const dateB = new Date(b.uploadedAt || 0);
      return dateB - dateA;
    });
    
    return notes;
  } catch (error) {
    console.error('[Firestore] getTeacherNotes error:', error);
    return [];
  }
}

// Get single note by ID (metadata only, file is in Supabase)
async function getNoteById(noteId) {
  try {
    if (!db) return null;
    
    const doc = await db.collection(COLLECTIONS.NOTES).doc(noteId).get();
    if (!doc.exists) return null;
    
    return doc.data();
  } catch (error) {
    console.error('[Firestore] getNoteById error:', error);
    return null;
  }
}

// ==================== QUIZZES ====================

// Save quiz to Firestore
async function saveQuiz(quizData) {
  try {
    if (!db) throw new Error('Firestore not initialized');
    
    await db.collection(COLLECTIONS.QUIZZES).doc(quizData.id).set(quizData);
    console.log('[Firestore] Quiz saved:', quizData.id);
    return { ok: true };
  } catch (error) {
    console.error('[Firestore] saveQuiz error:', error);
    return { ok: false, error: error.message };
  }
}

// Get all quizzes for a teacher
async function getTeacherQuizzes(teacherId) {
  try {
    if (!db) return [];
    
    const snapshot = await db.collection(COLLECTIONS.QUIZZES)
      .where('teacherId', '==', teacherId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const quizzes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      quizzes.push({
        id: data.id,
        title: data.title,
        questionCount: data.questions ? data.questions.length : 0,
        createdAt: data.createdAt,
        isPublished: data.isPublished || false,
        publishedAt: data.publishedAt || null
      });
    });
    
    return quizzes;
  } catch (error) {
    console.error('[Firestore] getTeacherQuizzes error:', error);
    return [];
  }
}

// Get single quiz by ID
async function getQuizById(quizId) {
  try {
    if (!db) return null;
    
    const doc = await db.collection(COLLECTIONS.QUIZZES).doc(quizId).get();
    if (!doc.exists) return null;
    
    return doc.data();
  } catch (error) {
    console.error('[Firestore] getQuizById error:', error);
    return null;
  }
}

// Update quiz (e.g., publish/unpublish)
async function updateQuiz(quizId, updates) {
  try {
    if (!db) throw new Error('Firestore not initialized');
    
    await db.collection(COLLECTIONS.QUIZZES).doc(quizId).update(updates);
    console.log('[Firestore] Quiz updated:', quizId);
    return { ok: true };
  } catch (error) {
    console.error('[Firestore] updateQuiz error:', error);
    return { ok: false, error: error.message };
  }
}

// Get published quizzes for a student (by class code)
async function getPublishedQuizzesForClass(classCode) {
  try {
    if (!db) return [];
    
    // First, get all teachers with matching class code
    const { getAllTeachers } = require('./authFirestore');
    const allTeachers = await getAllTeachers();
    
    const teachers = allTeachers.filter(t => t.classCode === classCode);
    if (teachers.length === 0) {
      console.log(`[Firestore] No teachers found for class code: ${classCode}`);
      return [];
    }
    
    const teacherId = teachers[0].teacherId;
    console.log(`[Firestore] Found teacher ${teacherId} for class ${classCode}`);
    
    // Get all published quizzes for this teacher
    const snapshot = await db.collection(COLLECTIONS.QUIZZES)
      .where('teacherId', '==', teacherId)
      .where('isPublished', '==', true)
      .get();
    
    const quizzes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      quizzes.push({
        id: data.id,
        title: data.title,
        questionCount: data.questions ? data.questions.length : 0,
        publishedAt: data.publishedAt
      });
    });
    
    console.log(`[Firestore] Found ${quizzes.length} published quizzes for class ${classCode}`);
    return quizzes;
  } catch (error) {
    console.error('[Firestore] getPublishedQuizzesForClass error:', error);
    return [];
  }
}

// ==================== QUIZ ATTEMPTS ====================

// Save quiz attempt result
async function saveQuizAttempt(attemptData) {
  try {
    if (!db) throw new Error('Firestore not initialized');
    
    const attemptId = `${attemptData.studentId}_${attemptData.quizId}_${Date.now()}`;
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).doc(attemptId).set({
      ...attemptData,
      id: attemptId,
      attemptedAt: new Date().toISOString()
    });
    
    console.log('[Firestore] Quiz attempt saved:', attemptId);
    return { ok: true, attemptId };
  } catch (error) {
    console.error('[Firestore] saveQuizAttempt error:', error);
    return { ok: false, error: error.message };
  }
}

// Get quiz attempts for a student
async function getStudentQuizAttempts(studentId) {
  try {
    if (!db) return [];
    
    const snapshot = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
      .where('studentId', '==', studentId)
      .orderBy('attemptedAt', 'desc')
      .get();
    
    const attempts = [];
    snapshot.forEach(doc => {
      attempts.push(doc.data());
    });
    
    return attempts;
  } catch (error) {
    console.error('[Firestore] getStudentQuizAttempts error:', error);
    return [];
  }
}

module.exports = {
  saveNote,
  getTeacherNotes,
  getNoteById,
  saveQuiz,
  getTeacherQuizzes,
  getQuizById,
  updateQuiz,
  getPublishedQuizzesForClass,
  saveQuizAttempt,
  getStudentQuizAttempts
};
