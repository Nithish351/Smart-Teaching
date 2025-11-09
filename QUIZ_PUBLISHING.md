# Quiz Publishing Feature

## Overview
Teachers can now publish quizzes to make them available to students. Only published quizzes are visible and accessible to students.

## Teacher Features

### Publishing a Quiz
1. Create a quiz (via PDF generation or manual creation)
2. In the "Created Quizzes" section, click **"Publish to Students"** (green button)
3. Quiz status changes to "Published" with a green badge
4. Students can now see and take this quiz

### Unpublishing a Quiz
1. Find a published quiz (shows green "Published" badge)
2. Click **"Unpublish"** (orange button)
3. Quiz is removed from student view
4. Can be published again later

### Quiz Status Indicators
- **Published Badge**: Green badge showing quiz is live
- **Published Date**: Shows when quiz was made available
- **Button State**: Changes between "Publish" (green) and "Unpublish" (orange)

## Student Access

### How Students See Quizzes
Students can access quizzes using their teacher's **class code**:

1. Student logs in with class code
2. Sees list of all published quizzes
3. Can take any published quiz
4. Unpublished quizzes are hidden

### API Endpoints for Students

**Get Published Quizzes:**
```
GET /api/student/quizzes/:classCode
```
Returns list of published quizzes for that class.

**Get Specific Quiz:**
```
GET /api/student/quiz/:quizId
```
Returns full quiz with questions (only if published).

## Backend API Routes

### Teacher Routes

**Publish Quiz:**
```javascript
POST /api/teacher/publish-quiz
Body: {
  quizId: "quiz-id",
  teacherId: "teacher-id"
}
Response: {
  ok: true,
  message: "Quiz published successfully"
}
```

**Unpublish Quiz:**
```javascript
POST /api/teacher/unpublish-quiz
Body: {
  quizId: "quiz-id",
  teacherId: "teacher-id"
}
Response: {
  ok: true,
  message: "Quiz unpublished successfully"
}
```

### Student Routes

**Get All Published Quizzes:**
```javascript
GET /api/student/quizzes/:classCode
Response: {
  quizzes: [
    {
      id: "quiz-id",
      title: "Quiz Title",
      questionCount: 10,
      publishedAt: "2025-11-07T..."
    }
  ]
}
```

**Get Quiz to Take:**
```javascript
GET /api/student/quiz/:quizId
Response: {
  id: "quiz-id",
  title: "Quiz Title",
  questions: [
    {
      question: "What is...?",
      options: ["A", "B", "C", "D"],
      correctAnswer: 0
    }
  ]
}
```

## Quiz Object Structure

```javascript
{
  id: "unique-quiz-id",
  title: "Quiz Title",
  teacherId: "teacher-id",
  questions: [...],
  createdAt: "2025-11-07T...",
  isPublished: true/false,
  publishedAt: "2025-11-07T..." // only when published
}
```

## Workflow

### Teacher Workflow:
1. **Create** quiz (PDF or manual)
2. **Review** questions using "View Questions"
3. **Publish** to students when ready
4. **Unpublish** if changes needed
5. **Re-publish** after updates

### Student Workflow:
1. **Login** with class code
2. **View** available published quizzes
3. **Select** a quiz to take
4. **Complete** the quiz
5. **Submit** for grading (future feature)

## Features

### Security
- Only published quizzes are accessible to students
- Teacher ID verification on publish/unpublish
- Quiz ownership validation

### Status Management
- Clear visual indicators (badges, colors)
- Publish dates tracked
- Can toggle status anytime

### Student Experience
- Only see relevant published quizzes
- Cannot access unpublished quizzes
- Clean, filtered quiz list by class code

## Future Enhancements

Possible additions:
- Quiz scheduling (publish on specific date)
- Auto-unpublish after deadline
- Student quiz submissions and grading
- Quiz analytics and statistics
- Student progress tracking
- Time limits for quizzes
- Multiple attempts tracking
- Quiz results dashboard

## Usage Example

### Teacher publishes a quiz:
```javascript
// Teacher creates quiz
const quiz = await createQuiz({ title: "Math Quiz", questions: [...] });

// Teacher publishes it
await publishQuiz(quiz.id);

// Students can now see it
const studentQuizzes = await getQuizzesForClass(classCode);
// Returns: [{ id: "...", title: "Math Quiz", ... }]
```

### Student takes a quiz:
```javascript
// Student gets quiz list
const quizzes = await fetch('/api/student/quizzes/4152');

// Student selects a quiz
const quiz = await fetch('/api/student/quiz/quiz-id-123');

// Student sees all questions and can answer
```

## Notes

- Quizzes are stored in-memory (use database for production)
- Publishing is instant (no delay)
- Unpublishing removes quiz immediately from student view
- Teachers can view all quizzes (published or not)
- Students only see published quizzes for their class
