import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, LogOut, Lock, Download, FileText, Video, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

type View = 'login' | 'dashboard' | 'join';

interface JoinedClass {
  teacherId: string;
  teacherEmail: string;
  classCode: string;
  joinedAt: string;
}

interface Note {
  id: string;
  title: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
  publishedAt: string;
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
}

interface StudentDashboardProps {
  onLogout?: () => void;
}

export const StudentDashboard = ({ onLogout }: StudentDashboardProps) => {
  const [currentView, setCurrentView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState<{ email: string; studentId: string; teacherId?: string; classCode?: string } | null>(null);
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([]);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // New state for notes, quizzes, and YouTube
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(false);

  const buildJoinedClassesFromStudent = async (student: { teacherId?: string; classCode?: string }) => {
    if (!student.teacherId || !student.classCode) return [] as JoinedClass[];
    try {
      const resp = await fetch(`/api/teacher/${student.teacherId}`);
      const t = await resp.json();
      if (!resp.ok) return [] as JoinedClass[];
      return [{
        teacherId: student.teacherId,
        teacherEmail: t.teacher?.email || 'Unknown',
        classCode: student.classCode,
        joinedAt: new Date().toISOString(),
      }];
    } catch {
      return [] as JoinedClass[];
    }
  };

  const handleGoogleSignIn = async () => {
    if (!classCode || classCode.length !== 4) {
      setError('Please enter a valid 4-digit class code before signing in with Google');
      toast({ 
        title: 'Class Code Required', 
        description: 'Please enter your 4-digit class code first', 
        variant: 'destructive' 
      });
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error('No email found in Google account');
      }

      const lookup = await fetch(`/api/auth/teacher/by-classcode/${encodeURIComponent(classCode)}`);
      const lookupData = await lookup.json();
      if (!lookup.ok) throw new Error(lookupData.error || 'Invalid class code');

      const teacherId = lookupData.teacher?.teacherId;
      const teacherEmail = lookupData.teacher?.email;
      if (!teacherId) throw new Error('Teacher not found for this code');

      const response = await fetch('/api/auth/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          password: user.uid,
          classCode, 
          teacherId 
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      const s = data.student || {};
      setStudentData({ email: s.email, studentId: s.studentId, teacherId, classCode });
      setJoinedClasses([{
        teacherId,
        teacherEmail: teacherEmail || 'Unknown',
        classCode,
        joinedAt: new Date().toISOString(),
      }]);
      setCurrentView('dashboard');
      setClassCode('');
      toast({ 
        title: 'Welcome!', 
        description: `Signed in with Google as ${user.email}` 
      });
    } catch (err) {
      const errorMsg = (err as { message?: string })?.message || 'Google sign-in failed';
      setError(errorMsg);
      toast({ 
        title: 'Sign-In Failed', 
        description: errorMsg, 
        variant: 'destructive' 
      });
      await auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!classCode || classCode.length !== 4) {
      setError('Please enter a valid 4-digit class code');
      return;
    }
    setIsLoading(true);
    try {
      const lookup = await fetch(`/api/auth/teacher/by-classcode/${encodeURIComponent(classCode)}`);
      const lookupData = await lookup.json();
      if (!lookup.ok) throw new Error(lookupData.error || 'Invalid class code');

      const teacherId = lookupData.teacher?.teacherId;
      const teacherEmail = lookupData.teacher?.email;
      if (!teacherId) throw new Error('Teacher not found for this code');

      const response = await fetch('/api/auth/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, classCode, teacherId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      const s = data.student || {};
      setStudentData({ email: s.email, studentId: s.studentId, teacherId, classCode });
      setJoinedClasses([{
        teacherId,
        teacherEmail: teacherEmail || 'Unknown',
        classCode,
        joinedAt: new Date().toISOString(),
      }]);
      setCurrentView('dashboard');
      setEmail('');
      setPassword('');
      setClassCode('');
      toast({ title: 'Registration Successful!', description: `Welcome, ${s.email || email}!` });
    } catch (err) {
      const errorMsg = (err as { message?: string })?.message || 'Registration failed';
      setError(errorMsg);
      toast({ title: 'Registration Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    
    setCurrentView('login');
    setStudentData(null);
    setJoinedClasses([]);
    setEmail('');
    setPassword('');
    setClassCode('');
    setError('');
    setNotes([]);
    setQuizzes([]);
    setYoutubeVideos([]);
    onLogout?.();
  };

  // Fetch notes when dashboard loads
  useEffect(() => {
    const fetchNotes = async () => {
      if (!studentData?.teacherId) return;
      
      try {
        const response = await fetch(`/api/teacher/notes/${studentData.teacherId}`);
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
        }
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      }
    };

    const fetchQuizzes = async () => {
      if (!studentData?.classCode) {
        console.log('[Student] No class code available');
        return;
      }
      
      console.log('[Student] Fetching quizzes for class code:', studentData.classCode);
      try {
        const response = await fetch(`/api/student/quizzes/${studentData.classCode}`);
        console.log('[Student] Quiz fetch response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Student] Quiz data received:', data);
          setQuizzes(data.quizzes || []);
        } else {
          const errorData = await response.json();
          console.error('[Student] Quiz fetch failed:', errorData);
        }
      } catch (err) {
        console.error('[Student] Failed to fetch quizzes:', err);
      }
    };

    if (currentView === 'dashboard' && studentData?.classCode) {
      fetchNotes();
      fetchQuizzes();
    }
  }, [currentView, studentData]);

  const handleDownloadNote = async (noteId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/teacher/download-note/${noteId}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Success', description: 'Note downloaded successfully!' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to download note', variant: 'destructive' });
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`/api/student/quiz/${quizId}`);
      if (!response.ok) throw new Error('Failed to load quiz');
      
      const data = await response.json();
      setCurrentQuiz(data);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
      setShowQuizDialog(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load quiz', variant: 'destructive' });
    }
  };

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmitQuiz = () => {
    if (!currentQuiz) return;
    
    let score = 0;
    currentQuiz.questions.forEach((q, index) => {
      if (quizAnswers[index] === q.correctAnswer) {
        score++;
      }
    });
    
    setQuizScore(score);
    setQuizSubmitted(true);
    
    toast({
      title: 'Quiz Submitted!',
      description: `You scored ${score} out of ${currentQuiz.questions.length}`,
    });
  };

  const handleYouTubeSearch = async () => {
    if (!youtubeQuery.trim()) {
      toast({ title: 'Error', description: 'Please enter a search query', variant: 'destructive' });
      return;
    }

    setLoadingYouTube(true);
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(youtubeQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setYoutubeVideos(data.videos || []);
      
      if (data.videos?.length === 0) {
        toast({ title: 'No Results', description: 'No videos found for your search' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to search YouTube', variant: 'destructive' });
      setYoutubeVideos([]);
    } finally {
      setLoadingYouTube(false);
    }
  };

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Portal</h1>
            <p className="text-gray-600">Sign in with your credentials and class code</p>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Student Login</CardTitle>
              <CardDescription>Enter your email, password, and class code to access your classes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
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
                    placeholder="student@example.com" 
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
                    placeholder="" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-code" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> 4-Digit Class Code
                  </Label>
                  <Input 
                    id="class-code" 
                    type="text" 
                    placeholder="XXXX" 
                    value={classCode} 
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())} 
                    maxLength={4} 
                    required 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Make sure to enter your class code before signing in with Google
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {studentData?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedClasses.length === 0 ? (
                <div className="col-span-full">
                  <Card className="shadow-lg text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">You haven't joined any classes yet.</p>
                    <p className="text-gray-500 mt-2">Ask your teacher for a 4-digit class code to join.</p>
                    <Button onClick={handleLogout} className="mt-6 bg-purple-600 hover:bg-purple-700">Logout & Register Again</Button>
                  </Card>
                </div>
              ) : (
                joinedClasses.map((cls, index) => (
                  <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> Teacher's Class
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Teacher Email</p>
                        <p className="text-lg font-medium">{cls.teacherEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Class Code</p>
                        <p className="text-xl font-bold text-purple-600 tracking-widest">{cls.classCode}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Joined On</p>
                        <p className="text-sm">{new Date(cls.joinedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{notes.length}</p>
                            <p className="text-xs text-gray-600">Notes</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">{quizzes.length}</p>
                            <p className="text-xs text-gray-600">Quizzes</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{youtubeVideos.length}</p>
                            <p className="text-xs text-gray-600">Videos</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Study Materials
                </CardTitle>
                <CardDescription>Download notes and materials uploaded by your teacher</CardDescription>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No notes available yet</p>
                    <p className="text-sm text-gray-500 mt-2">Check back later for study materials</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{note.title}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-500">{note.fileName}</p>
                            <Badge variant="outline">{(note.size / 1024).toFixed(1)} KB</Badge>
                            <p className="text-xs text-gray-400">{new Date(note.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleDownloadNote(note.id, note.fileName)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Available Quizzes
                </CardTitle>
                <CardDescription>Test your knowledge with quizzes from your teacher</CardDescription>
              </CardHeader>
              <CardContent>
                {quizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No quizzes available yet</p>
                    <p className="text-sm text-gray-500 mt-2">Your teacher will publish quizzes soon</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => (
                      <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription>
                            {quiz.questionCount} questions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500">
                              Published: {new Date(quiz.publishedAt).toLocaleDateString()}
                            </p>
                            <Button 
                              onClick={() => handleStartQuiz(quiz.id)}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Start Quiz
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* YouTube Tab */}
          <TabsContent value="youtube">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" /> YouTube Learning
                </CardTitle>
                <CardDescription>Search for educational videos related to your studies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for educational videos..."
                      value={youtubeQuery}
                      onChange={(e) => setYoutubeQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleYouTubeSearch()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleYouTubeSearch}
                      disabled={loadingYouTube}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      {loadingYouTube ? 'Searching...' : 'Search'}
                    </Button>
                  </div>

                  {youtubeVideos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {youtubeVideos.map((video) => (
                        <Card key={video.id} className="hover:shadow-md transition-shadow overflow-hidden">
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-48 object-cover"
                          />
                          <CardHeader>
                            <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{video.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">By: {video.channelTitle}</p>
                              <Button 
                                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                                className="w-full bg-red-600 hover:bg-red-700"
                              >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Watch Video
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quiz Dialog */}
        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{currentQuiz?.title}</DialogTitle>
              <DialogDescription>
                {quizSubmitted 
                  ? `You scored ${quizScore} out of ${currentQuiz?.questions.length}`
                  : `Answer all ${currentQuiz?.questions.length} questions`
                }
              </DialogDescription>
            </DialogHeader>
            
            {currentQuiz && (
              <div className="space-y-6 mt-4">
                {currentQuiz.questions.map((question, qIndex) => (
                  <Card key={qIndex}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Question {qIndex + 1}: {question.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => {
                          const isSelected = quizAnswers[qIndex] === oIndex;
                          const isCorrect = question.correctAnswer === oIndex;
                          const showResult = quizSubmitted;
                          
                          return (
                            <button
                              key={oIndex}
                              onClick={() => !quizSubmitted && handleAnswerChange(qIndex, oIndex)}
                              disabled={quizSubmitted}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                showResult && isCorrect
                                  ? 'border-green-500 bg-green-50'
                                  : showResult && isSelected && !isCorrect
                                  ? 'border-red-500 bg-red-50'
                                  : isSelected
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                                {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {!quizSubmitted && (
                  <Button 
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(quizAnswers).length !== currentQuiz.questions.length}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Submit Quiz
                  </Button>
                )}
                
                {quizSubmitted && (
                  <Button 
                    onClick={() => setShowQuizDialog(false)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Close
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentDashboard;
