import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, LogOut, Code2, BookOpen, Upload, FileText, PlusCircle, Trash2, Loader2, Eye, Send, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Student {
  email: string;
  joinedAt: string;
}

interface Note {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  size: number;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
  isPublished?: boolean;
  publishedAt?: string;
}

interface TeacherDashboardProps {
  onLogout?: () => void;
}

function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teacherData, setTeacherData] = useState<{ email: string; classCode: string; teacherId: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // PDF Quiz Generation States
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfQuizTitle, setPdfQuizTitle] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Manual Quiz Creation States
  const [manualQuizTitle, setManualQuizTitle] = useState('');
  const [manualQuestions, setManualQuestions] = useState<Question[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  // Notes Upload States
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [isUploadingNote, setIsUploadingNote] = useState(false);

  // View Quiz States
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isViewingQuiz, setIsViewingQuiz] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const t = data.teacher || {};
      setTeacherData({
        email: t.email,
        classCode: t.classCode,
        teacherId: t.teacherId,
      });

      // Fetch students for this teacher
      const studentsResponse = await fetch(`/api/teacher/students/${t.teacherId}`);
      const studentsData = await studentsResponse.json();

      if (studentsResponse.ok) {
        setStudents(studentsData.students || []);
      }

      // Fetch notes for this teacher
      try {
        const notesResponse = await fetch(`/api/teacher/notes/${t.teacherId}`);
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData.notes || []);
        }
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      }

      // Fetch quizzes for this teacher
      try {
        const quizzesResponse = await fetch(`/api/teacher/quizzes/${t.teacherId}`);
        if (quizzesResponse.ok) {
          const quizzesData = await quizzesResponse.json();
          setQuizzes(quizzesData.quizzes || []);
        }
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
      }

      setIsLoggedIn(true);
      setEmail('');
      setPassword('');
      toast({
        title: 'Welcome!',
        description: `Logged in as ${t.email}`,
      });
    } catch (err) {
      const errorMsg = (err as { message?: string })?.message || 'Login failed';
      setError(errorMsg);
      toast({
        title: 'Login Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTeacherData(null);
    setStudents([]);
    setNotes([]);
    setQuizzes([]);
    setEmail('');
    setPassword('');
    setError('');
    onLogout?.();
  };

  // Upload Note Handler
  const handleUploadNote = async () => {
    if (!noteFile || !noteTitle.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both a title and a file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingNote(true);
    try {
      const formData = new FormData();
      formData.append('file', noteFile);
      formData.append('title', noteTitle);
      formData.append('teacherId', teacherData?.teacherId || '');

      const response = await fetch('/api/teacher/upload-note', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const newNote: Note = {
        id: data.noteId,
        title: noteTitle,
        fileName: noteFile.name,
        uploadedAt: new Date().toISOString(),
        size: noteFile.size,
      };

      setNotes([...notes, newNote]);
      setNoteFile(null);
      setNoteTitle('');
      
      toast({
        title: 'Success!',
        description: 'Note uploaded successfully.',
      });
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingNote(false);
    }
  };

  // Generate Quiz from PDF
  const handleGenerateQuizFromPDF = async () => {
    if (!pdfFile || !pdfQuizTitle.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both a title and a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      // Extract text from PDF
      const formData = new FormData();
      formData.append('file', pdfFile);

      const extractResponse = await fetch('/api/ai/extract-text', {
        method: 'POST',
        body: formData,
      });

      const extractData = await extractResponse.json();

      if (!extractResponse.ok) {
        throw new Error(extractData.error || 'Failed to extract text from PDF');
      }

      // Generate quiz from extracted text
      const quizResponse = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractData.text,
          title: pdfQuizTitle,
          teacherId: teacherData?.teacherId,
          count: questionCount,
        }),
      });

      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || 'Failed to generate quiz');
      }

      const newQuiz: Quiz = {
        id: quizData.quizId,
        title: pdfQuizTitle,
        questions: quizData.questions,
        createdAt: new Date().toISOString(),
      };

      setQuizzes([...quizzes, newQuiz]);
      setPdfFile(null);
      setPdfQuizTitle('');
      
      toast({
        title: 'Success!',
        description: `Quiz created with ${quizData.questions.length} questions.`,
      });
    } catch (err) {
      toast({
        title: 'Quiz Generation Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Add question to manual quiz
  const addManualQuestion = () => {
    setManualQuestions([
      ...manualQuestions,
      { question: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]);
  };

  // Remove question from manual quiz
  const removeManualQuestion = (index: number) => {
    if (manualQuestions.length > 1) {
      setManualQuestions(manualQuestions.filter((_, i) => i !== index));
    }
  };

  // Update manual question
  const updateManualQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...manualQuestions];
    if (field === 'question') {
      updated[index].question = value as string;
    } else if (field === 'correctAnswer') {
      updated[index].correctAnswer = value as number;
    }
    setManualQuestions(updated);
  };

  // Update manual question option
  const updateManualOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...manualQuestions];
    updated[qIndex].options[optIndex] = value;
    setManualQuestions(updated);
  };

  // Create manual quiz
  const handleCreateManualQuiz = async () => {
    if (!manualQuizTitle.trim()) {
      toast({
        title: 'Missing Title',
        description: 'Please provide a quiz title.',
        variant: 'destructive',
      });
      return;
    }

    // Validate questions
    const hasEmptyQuestions = manualQuestions.some(q => !q.question.trim());
    const hasEmptyOptions = manualQuestions.some(q => q.options.some(opt => !opt.trim()));

    if (hasEmptyQuestions || hasEmptyOptions) {
      toast({
        title: 'Incomplete Quiz',
        description: 'Please fill in all questions and options.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/teacher/create-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualQuizTitle,
          questions: manualQuestions,
          teacherId: teacherData?.teacherId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quiz');
      }

      const newQuiz: Quiz = {
        id: data.quizId,
        title: manualQuizTitle,
        questions: manualQuestions,
        createdAt: new Date().toISOString(),
      };

      setQuizzes([...quizzes, newQuiz]);
      setManualQuizTitle('');
      setManualQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
      
      toast({
        title: 'Success!',
        description: 'Quiz created successfully.',
      });
    } catch (err) {
      toast({
        title: 'Creation Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes(quizzes.filter(q => q.id !== quizId));
    toast({
      title: 'Deleted',
      description: 'Quiz deleted successfully.',
    });
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
    toast({
      title: 'Deleted',
      description: 'Note deleted successfully.',
    });
  };

  // Publish quiz to students
  const handlePublishQuiz = async (quizId: string) => {
    try {
      const response = await fetch('/api/teacher/publish-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          teacherId: teacherData?.teacherId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish quiz');
      }

      // Update local state
      setQuizzes(quizzes.map(q => 
        q.id === quizId 
          ? { ...q, isPublished: true, publishedAt: new Date().toISOString() }
          : q
      ));

      toast({
        title: 'Quiz Published!',
        description: 'Students can now access this quiz.',
      });
    } catch (err) {
      toast({
        title: 'Publish Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  // Unpublish quiz
  const handleUnpublishQuiz = async (quizId: string) => {
    try {
      const response = await fetch('/api/teacher/unpublish-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          teacherId: teacherData?.teacherId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish quiz');
      }

      // Update local state
      setQuizzes(quizzes.map(q => 
        q.id === quizId 
          ? { ...q, isPublished: false, publishedAt: undefined }
          : q
      ));

      toast({
        title: 'Quiz Unpublished',
        description: 'Students can no longer access this quiz.',
      });
    } catch (err) {
      toast({
        title: 'Unpublish Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Teacher Login</CardTitle>
            <CardDescription>Sign in to access your class dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {teacherData?.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Class Code Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Class Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {teacherData?.classCode}
              </div>
              <p className="text-sm text-gray-600">
                Share this code with students to join your class
              </p>
            </CardContent>
          </Card>

          {/* Students Count Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students Enrolled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {students.length}
              </div>
              <p className="text-sm text-gray-600">
                Active students in your class
              </p>
            </CardContent>
          </Card>

          {/* Materials Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {notes.length}
              </div>
              <p className="text-sm text-gray-600">
                Uploaded study materials
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="pdf-quiz">PDF Quiz</TabsTrigger>
            <TabsTrigger value="manual-quiz">Manual Quiz</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>
                  {students.length} student{students.length !== 1 ? 's' : ''} in your class
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      No students enrolled yet. Share your class code to start!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                            Student Email
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                            Joined Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {students.map((student, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {student.email}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {new Date(student.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Upload Tab */}
          <TabsContent value="notes">
            <div className="grid gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Study Notes
                  </CardTitle>
                  <CardDescription>
                    Upload PDF notes for your students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="noteTitle">Note Title</Label>
                    <Input
                      id="noteTitle"
                      placeholder="e.g., Chapter 5 - Algebra"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noteFile">PDF File</Label>
                    <Input
                      id="noteFile"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button 
                    onClick={handleUploadNote} 
                    disabled={isUploadingNote}
                    className="w-full"
                  >
                    {isUploadingNote ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Note
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Uploaded Notes</CardTitle>
                  <CardDescription>
                    {notes.length} note{notes.length !== 1 ? 's' : ''} uploaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        No notes uploaded yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{note.title}</p>
                              <p className="text-sm text-gray-600">
                                {note.fileName} • {(note.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PDF Quiz Generation Tab */}
          <TabsContent value="pdf-quiz">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Generate Quiz from PDF
                </CardTitle>
                <CardDescription>
                  Upload a PDF and AI will generate quiz questions automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdfQuizTitle">Quiz Title</Label>
                  <Input
                    id="pdfQuizTitle"
                    placeholder="e.g., Chapter 5 Quiz"
                    value={pdfQuizTitle}
                    onChange={(e) => setPdfQuizTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="50"
                    placeholder="10"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                  />
                  <p className="text-xs text-gray-500">Choose between 1 and 50 questions</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdfFile">PDF File</Label>
                  <Input
                    id="pdfFile"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button 
                  onClick={handleGenerateQuizFromPDF} 
                  disabled={isGeneratingQuiz}
                  className="w-full"
                >
                  {isGeneratingQuiz ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Quiz Creation Tab */}
          <TabsContent value="manual-quiz">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Create Quiz Manually
                </CardTitle>
                <CardDescription>
                  Create your own quiz questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="manualQuizTitle">Quiz Title</Label>
                  <Input
                    id="manualQuizTitle"
                    placeholder="e.g., Mid-term Exam"
                    value={manualQuizTitle}
                    onChange={(e) => setManualQuizTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-6">
                  {manualQuestions.map((q, qIndex) => (
                    <Card key={qIndex}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                          {manualQuestions.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeManualQuestion(qIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Textarea
                            placeholder="Enter your question"
                            value={q.question}
                            onChange={(e) => updateManualQuestion(qIndex, 'question', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label>Options</Label>
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={`Option ${optIndex + 1}`}
                                value={opt}
                                onChange={(e) => updateManualOption(qIndex, optIndex, e.target.value)}
                              />
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correctAnswer === optIndex}
                                onChange={() => updateManualQuestion(qIndex, 'correctAnswer', optIndex)}
                                className="w-4 h-4"
                                aria-label={`Mark option ${optIndex + 1} as correct answer`}
                              />
                            </div>
                          ))}
                          <p className="text-xs text-gray-500">Select the radio button for the correct answer</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={addManualQuestion}
                    variant="outline"
                    className="flex-1"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                  <Button 
                    onClick={handleCreateManualQuiz}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Quiz'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Created Quizzes */}
        {quizzes.length > 0 && (
          <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle>Created Quizzes</CardTitle>
              <CardDescription>
                {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{quiz.title}</p>
                          {quiz.isPublished && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Published
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {quiz.questions.length} questions • Created {new Date(quiz.createdAt).toLocaleDateString()}
                        </p>
                        {quiz.isPublished && quiz.publishedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Published {new Date(quiz.publishedAt).toLocaleDateString()} - Students can access this quiz
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setIsViewingQuiz(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Questions
                      </Button>
                      {quiz.isPublished ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnpublishQuiz(quiz.id)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePublishQuiz(quiz.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Publish to Students
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Quiz Dialog */}
        <Dialog open={isViewingQuiz} onOpenChange={setIsViewingQuiz}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuiz?.title}</DialogTitle>
              <DialogDescription>
                {selectedQuiz?.questions.length} questions • Created {selectedQuiz && new Date(selectedQuiz.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {selectedQuiz?.questions.map((q, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg border ${
                            q.correctAnswer === optIndex
                              ? 'bg-green-50 border-green-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span>{option}</span>
                            {q.correctAnswer === optIndex && (
                              <span className="ml-auto text-green-600 text-sm font-medium">
                                ✓ Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default TeacherDashboard;