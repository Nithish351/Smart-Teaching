import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ExternalLink, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TeacherRegistrationForm() {
  const [showInstructions, setShowInstructions] = useState(false);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Setup Instructions</CardTitle>
            <CardDescription className="text-center">
              How to view Google Form responses in Admin Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Quick Steps to Connect Google Forms:</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2">Step 1: Link Form to Google Sheets</h3>
                <ol className="list-decimal ml-4 space-y-1 text-sm text-gray-700">
                  <li>Open your Google Form in edit mode</li>
                  <li>Click the "Responses" tab at the top</li>
                  <li>Click the green Google Sheets icon (📊)</li>
                  <li>A new spreadsheet will be created automatically</li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2">Step 2: Get Spreadsheet ID</h3>
                <ol className="list-decimal ml-4 space-y-1 text-sm text-gray-700">
                  <li>The Google Sheet will open automatically</li>
                  <li>Copy the ID from the URL between <code className="bg-gray-100 px-1">/d/</code> and <code className="bg-gray-100 px-1">/edit</code></li>
                  <li>Example: <code className="bg-gray-100 px-1 text-xs">1abc123xyz...</code></li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2">Step 3: Configure Backend</h3>
                <ol className="list-decimal ml-4 space-y-1 text-sm text-gray-700">
                  <li>Open <code className="bg-gray-100 px-1">server/googleSheets.js</code></li>
                  <li>Find line 16: <code className="bg-gray-100 px-1 text-xs">const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';</code></li>
                  <li>Replace with your copied ID</li>
                  <li>Set spreadsheet to "Anyone with link can view"</li>
                  <li>Restart backend server</li>
                </ol>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">✅ That's it!</h3>
                <p className="text-sm text-green-800">
                  After setup, when teachers fill your Google Form, admin will see their requests automatically in the dashboard!
                </p>
              </div>
            </div>

            <Button onClick={() => setShowInstructions(false)} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Teacher Registration</CardTitle>
            <CardDescription className="text-center text-lg">
              Fill out the Google Form below. Admin will review and approve your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>Next Steps:</strong>
                    <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                      <li>Fill out the Google Form below</li>
                      <li>Admin will review your submission</li>
                      <li>You'll receive login credentials via email</li>
                      <li>Use credentials to access Teacher Dashboard</li>
                    </ol>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInstructions(true)}
                    className="ml-4 whitespace-nowrap"
                  >
                    Setup Guide
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            {/* Google Form Embed */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border">
              <iframe 
                src="https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/viewform?embedded=true" 
                width="100%" 
                height="1400" 
                frameBorder="0" 
                marginHeight={0} 
                marginWidth={0}
                title="Teacher Registration Form"
                className="w-full"
              >
                Loading Google Form...
              </iframe>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-900 text-sm flex items-center justify-between">
                  <span>
                    <strong>Alternative:</strong> You can also open this form in a new tab
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/viewform', '_blank')}
                    className="ml-4"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </AlertDescription>
              </Alert>

              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-900 text-sm">
                  <strong>For Admin:</strong> To see form responses in your dashboard, you need to link this form to Google Sheets. Click "Setup Guide" above for instructions.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TeacherRegistrationForm;
