// Authentication module for Admin, Teacher, and Student roles
const crypto = require('crypto');

// In-memory storage (replace with database in production)
const users = {
  admin: {
    email: 'nithish0351@gmail.com',
    password: 'nithish0351', // Hash this in production
    role: 'admin'
  }
};

const teachers = new Map(); // { teacherId: { email, passwordHash, classCode, createdAt } }
const students = new Map(); // { studentId: { email, passwordHash, classCode, teacherId } }
const teacherRequests = new Map(); // { requestId: { name, email, school, phone, formData, status } }

// Hash password (simple - use bcrypt in production)
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

// Admin login
function adminLogin(email, password) {
  if (email === users.admin.email && password === users.admin.password) {
    return { ok: true, admin: { email: users.admin.email, role: 'admin' } };
  }
  return { ok: false, error: 'Invalid admin credentials' };
}

// Teacher registration request (via custom form or Google Form)
function submitTeacherRequest(data) {
  const requestId = crypto.randomBytes(8).toString('hex');
  teacherRequests.set(requestId, {
    name: data.name,
    email: data.email,
    school: data.school,
    phone: data.phone,
    subject: data.subject || '',
    experience: data.experience || '',
    formData: data,
    status: 'pending',
    submittedAt: new Date()
  });
  return { ok: true, requestId, message: 'Teacher registration request submitted' };
}

// Get all pending teacher requests (Admin only)
function getPendingRequests() {
  const pending = [];
  for (const [id, req] of teacherRequests) {
    if (req.status === 'pending') {
      pending.push({ id, ...req });
    }
  }
  return pending;
}

// Approve teacher request and create account
function approveTeacher(requestId, email, password) {
  if (!teacherRequests.has(requestId)) {
    return { ok: false, error: 'Request not found' };
  }
  
  const req = teacherRequests.get(requestId);
  const teacherId = crypto.randomBytes(8).toString('hex');
  const classCode = generateClassCode();
  
  teachers.set(teacherId, {
    email,
    passwordHash: hashPassword(password),
    classCode,
    fullName: req.name,
    school: req.school,
    createdAt: new Date()
  });
  
  // Mark as approved
  req.status = 'approved';
  req.approvedAt = new Date();
  
  return {
    ok: true,
    teacher: {
      teacherId,
      email,
      classCode,
      message: 'Teacher account created successfully'
    }
  };
}

// Approve teacher from Google Sheets
function approveGoogleSheetsTeacher(requestId, email, password) {
  // For Google Sheets requests, we don't have detailed info in memory
  // Just create the teacher account directly
  const teacherId = crypto.randomBytes(8).toString('hex');
  const classCode = generateClassCode();
  
  teachers.set(teacherId, {
    email,
    passwordHash: hashPassword(password),
    classCode,
    fullName: email.split('@')[0], // Use email prefix as name
    school: 'N/A',
    source: 'google-sheets',
    createdAt: new Date()
  });
  
  return {
    ok: true,
    teacher: {
      teacherId,
      email,
      classCode,
      message: 'Teacher account created successfully from Google Form'
    }
  };
}

// Reject teacher request
function rejectTeacher(requestId, reason) {
  if (!teacherRequests.has(requestId)) {
    return { ok: false, error: 'Request not found' };
  }
  
  const req = teacherRequests.get(requestId);
  req.status = 'rejected';
  req.rejectionReason = reason;
  req.rejectedAt = new Date();
  
  return { ok: true, message: 'Request rejected' };
}

// Teacher login
function teacherLogin(email, password) {
  for (const [teacherId, teacher] of teachers) {
    if (teacher.email === email && teacher.passwordHash === hashPassword(password)) {
      return {
        ok: true,
        teacher: {
          teacherId,
          email: teacher.email,
          classCode: teacher.classCode,
          fullName: teacher.fullName,
          role: 'teacher'
        }
      };
    }
  }
  return { ok: false, error: 'Invalid teacher credentials' };
}

// Student registration
function studentRegister(email, password, classCode, teacherId) {
  if (!isValidClassCode(classCode)) {
    return { ok: false, error: 'Invalid class code format' };
  }
  
  // Verify teacher exists and code matches
  if (!teachers.has(teacherId) || teachers.get(teacherId).classCode !== classCode) {
    return { ok: false, error: 'Invalid class code or teacher not found' };
  }
  
  // Check email not already registered
  for (const [_, student] of students) {
    if (student.email === email) {
      return { ok: false, error: 'Email already registered' };
    }
  }
  
  const studentId = crypto.randomBytes(8).toString('hex');
  students.set(studentId, {
    email,
    passwordHash: hashPassword(password),
    classCode,
    teacherId,
    createdAt: new Date()
  });
  
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
}

// Student login
function studentLogin(email, password) {
  for (const [studentId, student] of students) {
    if (student.email === email && student.passwordHash === hashPassword(password)) {
      return {
        ok: true,
        student: {
          studentId,
          email: student.email,
          teacherId: student.teacherId,
          classCode: student.classCode,
          role: 'student'
        }
      };
    }
  }
  return { ok: false, error: 'Invalid student credentials' };
}

// Get teacher's students
function getTeacherStudents(teacherId) {
  const teacherStudents = [];
  for (const [studentId, student] of students) {
    if (student.teacherId === teacherId) {
      teacherStudents.push({
        studentId,
        email: student.email,
        joinedAt: student.createdAt
      });
    }
  }
  return teacherStudents;
}

// Find teacher info by class code
function getTeacherByClassCode(classCode) {
  for (const [teacherId, teacher] of teachers) {
    if (teacher.classCode === classCode) {
      return { ok: true, teacher: { teacherId, email: teacher.email, classCode: teacher.classCode } };
    }
  }
  return { ok: false, error: 'Teacher not found for provided class code' };
}

// Find teacher info by id
function getTeacherById(teacherId) {
  const t = teachers.get(teacherId);
  if (!t) return { ok: false, error: 'Teacher not found' };
  return { ok: true, teacher: { teacherId, email: t.email, classCode: t.classCode } };
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
  generateClassCode,
  isValidClassCode,
  hashPassword,
  // Export data structures so they can be accessed from index.js
  teachers,
  students,
  teacherRequests
};
