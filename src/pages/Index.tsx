import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthButton } from '@/components/AuthButton';
import { RoleSelection } from '@/components/RoleSelection';
import TeacherDashboard from '@/components/TeacherDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import TeacherRegistrationForm from '@/components/TeacherRegistrationForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, BookOpen, GraduationCap, Shield, UserPlus } from 'lucide-react';

export function BackendTest() {
  return <div>BackendTest</div>;
}

const Index = () => {
  const { user, loading, userRole, setUserRole, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTeacherRegistration, setShowTeacherRegistration] = useState(false);

  // If teacher registration mode is active, show registration form
  if (showTeacherRegistration) {
    return <TeacherRegistrationForm />;
  }

  // If admin mode is active, show AdminDashboard
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="py-6 px-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAdmin(false)}>
              <LogOut className="w-4 h-4 mr-2" />
              Exit Admin
            </Button>
          </div>
        </header>
        <main>
          <AdminDashboard onLogout={() => setShowAdmin(false)} />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center animate-bounce-in">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading Smart Teaching...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="py-6 px-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Smart Teaching
              </h1>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-education-purple bg-clip-text text-transparent leading-tight">
              Revolutionize Learning with AI
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Empower educators and students with intelligent teaching tools. 
              Upload PDFs to generate quizzes instantly, or discover curated educational content powered by AI.
            </p>
            
            {/* Feature highlights */}
            <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
              <Card className="shadow-soft border-0 hover:shadow-elegant transition-all duration-300 animate-slide-up">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">AI-Powered Quizzes</h3>
                  <p className="text-sm text-muted-foreground">Upload PDFs and generate comprehensive quizzes automatically using advanced AI</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-soft border-0 hover:shadow-elegant transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-education-purple to-accent rounded-full mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Smart Content Discovery</h3>
                  <p className="text-sm text-muted-foreground">Find relevant educational videos with AI-powered search and get intelligent summaries</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-soft border-0 hover:shadow-elegant transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-education-blue to-education-green rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Seamless Experience</h3>
                  <p className="text-sm text-muted-foreground">Intuitive interface designed for both teachers and students with real-time collaboration</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Authentication Section */}
          <div className="max-w-md mx-auto animate-slide-up delay-03">
            <AuthButton onSuccess={() => {}} />
          </div>
        </main>
      </div>
    );
  }

  // Role selection for authenticated users without a role
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header with logout */}
        <header className="py-6 px-4 border-b border-border/50">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Smart Teaching
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.displayName || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <RoleSelection onRoleSelect={setUserRole} />
          
          {/* Registration and Admin Links */}
          <div className="flex flex-col items-center gap-3 mt-8">
            <button
              onClick={() => setShowTeacherRegistration(true)}
              className="text-sm text-primary hover:text-accent flex items-center gap-2 font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register as New Teacher
            </button>
            <button
              onClick={() => setShowAdmin(true)}
              className="text-sm text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin Access
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Dashboard based on user role
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with logout and role indicator */}
      <header className="py-6 px-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Smart Teaching
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {userRole === 'teacher' ? (
                <BookOpen className="w-4 h-4 text-primary" />
              ) : (
                <GraduationCap className="w-4 h-4 text-education-purple" />
              )}
              <span className="text-sm font-medium capitalize">{userRole}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {user.displayName || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => setUserRole(null)}>
              Switch Role
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <BackendTest />
          </div>
        </div>
      </header>

      <main>
        {userRole === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
      </main>
    </div>
  );
}

export default Index;
