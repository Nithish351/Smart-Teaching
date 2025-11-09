import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: 'student' | 'teacher') => void;
}

export const RoleSelection = ({ onRoleSelect }: RoleSelectionProps) => {
  const handleStudentSelect = () => {
    onRoleSelect('student');
  };

  const handleTeacherSelect = () => {
    onRoleSelect('teacher');
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Choose Your Role
        </h2>
        <p className="text-muted-foreground">Select how you'd like to use Smart Teaching</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Student Role */}
        <Card className="cursor-pointer hover:shadow-elegant transition-all duration-300 border-0 hover:scale-105 animate-slide-up">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-education-purple to-accent rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Student</CardTitle>
            <CardDescription className="text-base">
              Access learning materials and search educational content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-education-purple rounded-full" />
                YouTube educational content search
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-education-purple rounded-full" />
                AI-powered learning assistance
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-education-purple rounded-full" />
                Interactive learning experience
              </li>
            </ul>
            <Button
              onClick={handleStudentSelect}
              size="lg"
              className="w-full bg-gradient-to-r from-education-purple to-accent hover:from-education-purple/90 hover:to-accent/90 text-white font-semibold"
            >
              Continue as Student
            </Button>
          </CardContent>
        </Card>

        {/* Teacher Role */}
        <Card className="cursor-pointer hover:shadow-elegant transition-all duration-300 border-0 hover:scale-105 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-education-blue rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Teacher</CardTitle>
            <CardDescription className="text-base">
              Create and manage educational content and quizzes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Upload and manage PDF materials
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Generate AI-powered quizzes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Create custom questions manually
              </li>
            </ul>
            <Button
              onClick={handleTeacherSelect}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-education-blue hover:from-primary/90 hover:to-education-blue/90 text-white font-semibold"
            >
              Continue as Teacher
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};