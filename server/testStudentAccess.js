require('dotenv').config();
const firestoreHelpers = require('./firestoreHelpers');

async function testStudentAccess() {
  console.log('\n========================================');
  console.log('TESTING STUDENT DATA ACCESS');
  console.log('========================================\n');

  const teacherId = 'eb10be102e05d4db';
  const classCode = '4732';

  console.log('1. Testing getTeacherNotes...');
  const notes = await firestoreHelpers.getTeacherNotes(teacherId);
  console.log(`   Found: ${notes.length} notes`);
  notes.forEach(note => {
    console.log(`   - ${note.title} (ID: ${note.id})`);
  });

  console.log('\n2. Testing getQuizzesByClassCode...');
  const quizzes = await firestoreHelpers.getQuizzesByClassCode(classCode);
  console.log(`   Found: ${quizzes.length} quizzes`);
  quizzes.forEach(quiz => {
    console.log(`   - ${quiz.title} (ID: ${quiz.id})`);
  });

  console.log('\n========================================');
  console.log('TEST COMPLETE');
  console.log('========================================\n');
  
  process.exit(0);
}

testStudentAccess().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
