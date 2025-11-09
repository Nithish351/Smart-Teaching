import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import backend from '@/lib/backend';

interface TeacherRequest {
  id: string;
  name: string;
  email: string;
  school: string;
  phone: string;
  timestamp?: string;
  subject?: string;
  experience?: string;
  status?: string;
}

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teacherRequests, setTeacherRequests] = useState<TeacherRequest[]>([]);
  const [approvalForm, setApprovalForm] = useState<string | null>(null);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setIsLoggedIn(true);
        setError('');
        setAdminPassword('');
        loadTeacherRequests();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: unknown) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'unknown'));
    }
  };

  const loadTeacherRequests = async () => {
    try {
      const res = await fetch('/api/auth/teacher/requests');
      const data = await res.json();
      const allRequests = data.requests || [];
      // Filter to show only pending requests
      const pending = allRequests.filter((r: TeacherRequest) => 
        !r.status || r.status === 'pending'
      );
      setTeacherRequests(pending);
      
      // Show info about data sources if available
      if (data.sources) {
        console.log(`Loaded ${data.sources.local} local + ${data.sources.googleSheets} Google Sheets requests`);
      }
    } catch (err: unknown) {
      setError('Failed to load requests');
    }
  };

  const handleApproveTeacher = async (requestId: string) => {
    if (!newTeacherEmail || !newTeacherPassword) {
      setError('Please fill in email and password');
      return;
    }
    try {
      const res = await fetch('/api/auth/teacher/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, email: newTeacherEmail, password: newTeacherPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(`Teacher approved! Class Code: ${data.teacher.classCode}`);
        setNewTeacherEmail('');
        setNewTeacherPassword('');
        setApprovalForm(null);
        loadTeacherRequests();
      } else {
        setError(data.error);
      }
    } catch (err: unknown) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'unknown'));
    }
  };

  const handleRejectTeacher = async (requestId: string) => {
    try {
      setError(''); // Clear any previous errors
      const res = await fetch('/api/auth/teacher/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reason: 'Rejected by admin' })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess('Request rejected successfully');
        setError('');
        loadTeacherRequests(); // Reload to remove from list
      } else {
        setError(data.error || 'Failed to reject request');
      }
    } catch (err: unknown) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'unknown'));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Admin Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <Button type="submit" className="w-full">Login</Button>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>

        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert className="mb-4 bg-green-50"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Registration Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherRequests.length === 0 ? (
                  <p className="text-gray-500">No pending requests</p>
                ) : (
                  teacherRequests.map((req: TeacherRequest) => (
                    <div key={req.id} className="border p-4 rounded bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{req.name}</h3>
                        {req.timestamp && (
                          <span className="text-xs text-gray-500">
                            {new Date(req.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 mb-3">
                        <p className="text-sm text-gray-700">📧 {req.email}</p>
                        <p className="text-sm text-gray-700">🏫 {req.school}</p>
                        <p className="text-sm text-gray-700">📞 {req.phone}</p>
                        {req.subject && (
                          <p className="text-sm text-gray-700">📚 Subject: {req.subject}</p>
                        )}
                        {req.experience && (
                          <p className="text-sm text-gray-700">⭐ Experience: {req.experience}</p>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setApprovalForm(req.id);
                            setNewTeacherEmail(req.email); // Pre-fill email
                          }}
                          className="flex-1"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectTeacher(req.id)}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {approvalForm && (
            <Card>
              <CardHeader>
                <CardTitle>Approve Teacher</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Teacher Email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Temporary Password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                  />
                  <Button
                    onClick={() => handleApproveTeacher(approvalForm)}
                    className="w-full"
                  >
                    Create Account & Generate Class Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setApprovalForm(null)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
