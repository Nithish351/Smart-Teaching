// Authentication module using Firebase Firestore for data persistence
const crypto = require('crypto');
const { db, auth: firebaseAuth, COLLECTIONS } = require('./firebaseAdmin');

// Admin credentials (keep in env for production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'nithish0351@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nithish0351';

// Hash password (simple - already using Firebase Auth for actual authentication)
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// Generate 4-digit class code
function generateClassCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Validate 4-digit code
function isValidClassCode(code) {
  return /^\d{4}$/.test(code);
}

// ==================== ADMIN ====================

// Admin login (simple check, not using Firebase Auth for admin)
function adminLogin(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return { ok: true, admin: { email: ADMIN_EMAIL, role: 'admin' } };
  }
  return { ok: false, error: 'Invalid admin credentials' };
}

// ==================== TEACHER REQUESTS ====================

// Submit teacher registration request
async function submitTeacherRequest(data) {
  try {
    const requestId = crypto.randomBytes(8).toString('hex');
    const requestData = {
      id: requestId,
      name: data.name,
      email: data.email,
      school: data.school,
      phone: data.phone,
      subject: data.subject || '',
      experience: data.experience || '',
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    if (db) {
      await db.collection(COLLECTIONS.TEACHER_REQUESTS).doc(requestId).set(requestData);
      console.log('[Firestore] Teacher request saved:', requestId);
    }

    return { ok: true, requestId, message: 'Teacher registration request submitted' };
  } catch (error) {
    console.error('[Firestore] submitTeacherRequest error:', error);
    return { ok: false, error: error.message };
  }
}

// Get all pending teacher requests
async function getPendingRequests() {
  try {
    if (!db) return [];

    const snapshot = await db.collection(COLLECTIONS.TEACHER_REQUESTS)
      .where('status', '==', 'pending')
      .get();

    const pending = [];
    snapshot.forEach(doc => {
      pending.push({ id: doc.id, ...doc.data() });
    });

    return pending;
  } catch (error) {
    console.error('[Firestore] getPendingRequests error:', error);
    return [];
  }
}

// ==================== TEACHER MANAGEMENT ====================

// Approve teacher and create Firebase Auth account
async function approveTeacher(requestId, email, password) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    // Get the request
    const requestDoc = await db.collection(COLLECTIONS.TEACHER_REQUESTS).doc(requestId).get();
    if (!requestDoc.exists) {
      return { ok: false, error: 'Request not found' };
    }

    const requestData = requestDoc.data();
    const teacherId = crypto.randomBytes(8).toString('hex');
    const classCode = generateClassCode();

    // Create Firebase Auth user if available
    let firebaseUid = null;
    if (firebaseAuth) {
      try {
        const userRecord = await firebaseAuth.createUser({
          email: email,
          password: password,
          displayName: requestData.name,
          disabled: false
        });
        firebaseUid = userRecord.uid;
        
        // Set custom claims for role
        await firebaseAuth.setCustomUserClaims(userRecord.uid, { role: 'teacher', teacherId });
        console.log('[Firebase Auth] Teacher user created:', email);
      } catch (authError) {
        console.warn('[Firebase Auth] Could not create auth user:', authError.message);
        console.warn('[Firebase Auth] Continuing with Firestore-only authentication');
        // Continue without Firebase Auth - we'll use Firestore for authentication
      }
    } else {
      console.warn('[Firebase Auth] Not available - using Firestore-only authentication');
    }

    // Create teacher document in Firestore
    const teacherData = {
      teacherId,
      email,
      passwordHash: hashPassword(password), // Backup for non-Firebase auth
      classCode,
      fullName: requestData.name,
      school: requestData.school,
      phone: requestData.phone,
      subject: requestData.subject || '',
      firebaseUid: firebaseUid || null,
      createdAt: new Date().toISOString()
    };

    await db.collection(COLLECTIONS.TEACHERS).doc(teacherId).set(teacherData);

    // Update request status
    await db.collection(COLLECTIONS.TEACHER_REQUESTS).doc(requestId).update({
      status: 'approved',
      approvedAt: new Date().toISOString()
    });

    console.log('[Firestore] Teacher approved:', teacherId);

    return {
      ok: true,
      teacher: {
        teacherId,
        email,
        classCode,
        message: 'Teacher account created successfully'
      }
    };
  } catch (error) {
    console.error('[Firestore] approveTeacher error:', error);
    return { ok: false, error: error.message };
  }
}

// Approve teacher from Google Sheets
async function approveGoogleSheetsTeacher(requestId, email, password) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    const teacherId = crypto.randomBytes(8).toString('hex');
    const classCode = generateClassCode();

    // Create Firebase Auth user if available
    let firebaseUid = null;
    if (firebaseAuth) {
      try {
        const userRecord = await firebaseAuth.createUser({
          email: email,
          password: password,
          displayName: email.split('@')[0],
          disabled: false
        });
        firebaseUid = userRecord.uid;
        await firebaseAuth.setCustomUserClaims(userRecord.uid, { role: 'teacher', teacherId });
        console.log('[Firebase Auth] Teacher user created from Google Sheets:', email);
      } catch (authError) {
        console.warn('[Firebase Auth] Could not create auth user:', authError.message);
        console.warn('[Firebase Auth] Continuing with Firestore-only authentication');
        // Continue without Firebase Auth
      }
    } else {
      console.warn('[Firebase Auth] Not available - using Firestore-only authentication');
    }

    // Create teacher document
    const teacherData = {
      teacherId,
      email,
      passwordHash: hashPassword(password),
      classCode,
      fullName: email.split('@')[0],
      school: 'N/A',
      source: 'google-sheets',
      firebaseUid: firebaseUid || null,
      createdAt: new Date().toISOString()
    };

    await db.collection(COLLECTIONS.TEACHERS).doc(teacherId).set(teacherData);

    return {
      ok: true,
      teacher: {
        teacherId,
        email,
        classCode,
        message: 'Teacher account created from Google Form'
      }
    };
  } catch (error) {
    console.error('[Firestore] approveGoogleSheetsTeacher error:', error);
    return { ok: false, error: error.message };
  }
}

// Reject teacher request
async function rejectTeacher(requestId, reason) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    const requestDoc = await db.collection(COLLECTIONS.TEACHER_REQUESTS).doc(requestId).get();
    if (!requestDoc.exists) {
      return { ok: false, error: 'Request not found' };
    }

    await db.collection(COLLECTIONS.TEACHER_REQUESTS).doc(requestId).update({
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    });

    return { ok: true, message: 'Request rejected' };
  } catch (error) {
    console.error('[Firestore] rejectTeacher error:', error);
    return { ok: false, error: error.message };
  }
}

// Teacher login
async function teacherLogin(email, password) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    // Query teacher by email
    const snapshot = await db.collection(COLLECTIONS.TEACHERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { ok: false, error: 'Invalid teacher credentials' };
    }

    const teacherDoc = snapshot.docs[0];
    const teacher = teacherDoc.data();

    // Verify password
    if (teacher.passwordHash !== hashPassword(password)) {
      return { ok: false, error: 'Invalid teacher credentials' };
    }

    return {
      ok: true,
      teacher: {
        teacherId: teacher.teacherId,
        email: teacher.email,
        classCode: teacher.classCode,
        fullName: teacher.fullName,
        role: 'teacher'
      }
    };
  } catch (error) {
    console.error('[Firestore] teacherLogin error:', error);
    return { ok: false, error: error.message };
  }
}

// ==================== STUDENT MANAGEMENT ====================

// Student registration
async function studentRegister(email, password, classCode, teacherId) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    if (!isValidClassCode(classCode)) {
      return { ok: false, error: 'Invalid class code format' };
    }

    // Verify teacher exists and class code matches
    const teacherDoc = await db.collection(COLLECTIONS.TEACHERS).doc(teacherId).get();
    if (!teacherDoc.exists || teacherDoc.data().classCode !== classCode) {
      return { ok: false, error: 'Invalid class code or teacher not found' };
    }

    // Check if email already registered
    const existingStudent = await db.collection(COLLECTIONS.STUDENTS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingStudent.empty) {
      return { ok: false, error: 'Email already registered' };
    }

    const studentId = crypto.randomBytes(8).toString('hex');

    // Create Firebase Auth user
    let firebaseUid = null;
    if (firebaseAuth) {
      try {
        const userRecord = await firebaseAuth.createUser({
          email: email,
          password: password,
          displayName: email.split('@')[0],
          disabled: false
        });
        firebaseUid = userRecord.uid;
        await firebaseAuth.setCustomUserClaims(userRecord.uid, { role: 'student', studentId });
      } catch (authError) {
        console.warn('[Firebase Auth] Could not create auth user:', authError.message);
      }
    }

    // Create student document
    const studentData = {
      studentId,
      email,
      passwordHash: hashPassword(password),
      classCode,
      teacherId,
      firebaseUid: firebaseUid || null,
      createdAt: new Date().toISOString()
    };

    await db.collection(COLLECTIONS.STUDENTS).doc(studentId).set(studentData);

    return {
      ok: true,
      student: {
        studentId,
        email,
        teacherId,
        role: 'student',
        message: 'Student registered successfully'
      }
    };
  } catch (error) {
    console.error('[Firestore] studentRegister error:', error);
    return { ok: false, error: error.message };
  }
}

// Student login
async function studentLogin(email, password) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    const snapshot = await db.collection(COLLECTIONS.STUDENTS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { ok: false, error: 'Invalid student credentials' };
    }

    const studentDoc = snapshot.docs[0];
    const student = studentDoc.data();

    // Verify password
    if (student.passwordHash !== hashPassword(password)) {
      return { ok: false, error: 'Invalid student credentials' };
    }

    return {
      ok: true,
      student: {
        studentId: student.studentId,
        email: student.email,
        teacherId: student.teacherId,
        classCode: student.classCode,
        role: 'student'
      }
    };
  } catch (error) {
    console.error('[Firestore] studentLogin error:', error);
    return { ok: false, error: error.message };
  }
}

// ==================== HELPER FUNCTIONS ====================

// Get teacher's students
async function getTeacherStudents(teacherId) {
  try {
    if (!db) return [];

    const snapshot = await db.collection(COLLECTIONS.STUDENTS)
      .where('teacherId', '==', teacherId)
      .get();

    const students = [];
    snapshot.forEach(doc => {
      const student = doc.data();
      students.push({
        studentId: student.studentId,
        email: student.email,
        joinedAt: student.createdAt
      });
    });

    return students;
  } catch (error) {
    console.error('[Firestore] getTeacherStudents error:', error);
    return [];
  }
}

// Find teacher by class code
async function getTeacherByClassCode(classCode) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    const snapshot = await db.collection(COLLECTIONS.TEACHERS)
      .where('classCode', '==', classCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { ok: false, error: 'Teacher not found for provided class code' };
    }

    const teacher = snapshot.docs[0].data();
    return {
      ok: true,
      teacher: {
        teacherId: teacher.teacherId,
        email: teacher.email,
        classCode: teacher.classCode
      }
    };
  } catch (error) {
    console.error('[Firestore] getTeacherByClassCode error:', error);
    return { ok: false, error: error.message };
  }
}

// Find teacher by ID
async function getTeacherById(teacherId) {
  try {
    if (!db) return { ok: false, error: 'Firestore not initialized' };

    const doc = await db.collection(COLLECTIONS.TEACHERS).doc(teacherId).get();
    if (!doc.exists) {
      return { ok: false, error: 'Teacher not found' };
    }

    const teacher = doc.data();
    return {
      ok: true,
      teacher: {
        teacherId: teacher.teacherId,
        email: teacher.email,
        classCode: teacher.classCode
      }
    };
  } catch (error) {
    console.error('[Firestore] getTeacherById error:', error);
    return { ok: false, error: error.message };
  }
}

// Get all teachers (for student quiz lookup)
async function getAllTeachers() {
  try {
    if (!db) return [];

    const snapshot = await db.collection(COLLECTIONS.TEACHERS).get();
    const teachers = [];
    
    snapshot.forEach(doc => {
      const teacher = doc.data();
      teachers.push({
        teacherId: teacher.teacherId,
        email: teacher.email,
        classCode: teacher.classCode
      });
    });

    return teachers;
  } catch (error) {
    console.error('[Firestore] getAllTeachers error:', error);
    return [];
  }
}

module.exports = {
  adminLogin,
  submitTeacherRequest,
  getPendingRequests,
  approveTeacher,
  approveGoogleSheetsTeacher,
  rejectTeacher,
  teacherLogin,
  studentRegister,
  studentLogin,
  getTeacherStudents,
  getTeacherByClassCode,
  getTeacherById,
  getAllTeachers,
  generateClassCode,
  isValidClassCode,
  hashPassword,
  // Export db and collections for direct use in other modules
  db,
  COLLECTIONS
};
