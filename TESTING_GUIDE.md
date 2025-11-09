# End-to-End Testing Guide for Smart Teaching Platform

## 🚀 Server Status
Both servers are currently running:
- **Backend API**: http://127.0.0.1:3006 ✅
- **Frontend**: http://localhost:5173 ✅

## 📋 Complete Testing Flow

### Part 1: Admin Workflow (Teacher Approval)

1. **Open the Application**
   - Navigate to http://localhost:5173 in your browser
   - You should see the Smart Teaching landing page

2. **Access Admin Dashboard**
   - Scroll down on the role selection page
   - Click on the "Admin Access" link at the bottom
   - You'll be taken to the Admin Dashboard

3. **Login as Admin**
   - Email: `admin@teachsmart.com`
   - Password: `Admin@123`
   - Click "Login"
   - ✅ You should see "No pending teacher requests" initially

---

### Part 2: Teacher Registration & Approval

4. **Open New Browser Tab (or use Incognito Mode)**
   - This simulates a teacher registering
   - Go to http://localhost:5173

5. **Register as Teacher**
   - Click "Teacher" role option
   - You'll see the Teacher Dashboard login screen
   - Click "New teacher? Register here" link
   - Fill in the registration form:
     - Name: `Test Teacher`
     - Email: `teacher@example.com`
     - School: `Test School`
     - Phone: `1234567890`
   - Click "Submit Request"
   - ✅ You should see a success message with a Request ID

6. **Go Back to Admin Tab**
   - Refresh the admin dashboard or click the "Refresh" button
   - ✅ You should now see 1 pending teacher request
   - The request should show:
     - Name: Test Teacher
     - Email: teacher@example.com
     - School: Test School
     - Phone: 1234567890

7. **Approve the Teacher**
   - Click the green "Approve" button
   - ✅ You should see a success message showing:
     - Teacher Email: teacher@example.com
     - **4-digit Class Code** (e.g., 7845)
   - **IMPORTANT**: Copy this 4-digit class code - you'll need it for student registration!

---

### Part 3: Teacher Login & Verification

8. **Go Back to Teacher Tab**
   - Click "Back to Login" if you're on the registration success page
   - OR refresh the page to go back to login

9. **Login as Teacher**
   - Email: `teacher@example.com`
   - Password: `teacher@example.com` (default password is same as email)
   - Click "Login"
   - ✅ You should see:
     - A welcome message with teacher email
     - Your **4-digit Class Code** displayed prominently
     - "Enrolled Students" section (currently empty)

---

### Part 4: Student Registration with Class Code

10. **Open Another New Tab (or Incognito Window)**
    - This simulates a student joining
    - Go to http://localhost:5173

11. **Select Student Role**
    - Click "Student" role option
    - You'll see the Student Dashboard

12. **Register as Student**
    - Click "New student? Register here" link
    - Fill in the registration form:
      - Email: `student1@example.com`
      - Password: `student123`
      - **4-Digit Class Code**: Enter the code you copied from Step 7
    - Click "Register"
    - ✅ You should see a success message

13. **Login as Student**
    - Click "Go to Login" or refresh
    - Email: `student1@example.com`
    - Password: `student123`
    - Click "Login"
    - ✅ You should see:
      - Welcome message with student email
      - "Joined Classes" section showing:
        - Teacher: Test Teacher (teacher@example.com)
        - Class Code: [your 4-digit code]

---

### Part 5: Verify Teacher Sees Student

14. **Go Back to Teacher Tab**
    - Refresh the teacher dashboard
    - ✅ In the "Enrolled Students" section, you should now see:
      - Email: student1@example.com
      - Joined: [timestamp]

---

## 🧪 Additional Tests

### Test Multiple Students
15. **Register More Students** (repeat steps 10-13 with different emails):
    - `student2@example.com` / `student123`
    - `student3@example.com` / `student123`
    - All using the same 4-digit class code
    - ✅ Teacher dashboard should show all enrolled students

### Test Wrong Class Code
16. **Try Invalid Class Code**
    - Register with email `student4@example.com`
    - Use a wrong class code (e.g., `9999`)
    - ✅ Should show error: "Teacher not found with this class code"

### Test Multiple Teachers
17. **Register Another Teacher**
    - Register as `teacher2@example.com`
    - Admin approves and gets a DIFFERENT 4-digit code
    - Students can join either class by using the respective codes

---

## 🔍 PDF Extraction Test

18. **Test PDF Upload** (in Teacher Dashboard):
    - Once logged in as teacher, look for PDF upload feature
    - Upload the test PDF: `pdf-extractor/valid-test.pdf`
    - ✅ Should successfully extract text: "Hello World!"

---

## ✅ Expected Behaviors

### Admin Dashboard
- ✓ Shows pending teacher requests
- ✓ Can approve teachers (generates 4-digit code)
- ✓ Can reject teachers
- ✓ Displays confirmation with class code after approval

### Teacher Dashboard
- ✓ Registration form for new teachers
- ✓ Login for approved teachers
- ✓ Displays unique 4-digit class code
- ✓ Lists all enrolled students with join timestamps
- ✓ Updates student list when new students join

### Student Dashboard
- ✓ Registration requires valid 4-digit class code
- ✓ Validates class code before registration
- ✓ Login for registered students
- ✓ Shows all joined classes
- ✓ Displays teacher information for each class

---

## 🐛 Troubleshooting

### Backend Not Responding
```powershell
# Check if backend is running (should see PID 9272)
Get-Process | Where-Object {$_.ProcessName -eq 'node'}

# Test health endpoint
curl.exe http://127.0.0.1:3006/api/health
# Should return: {"ok":true}
```

### Frontend Not Loading
```powershell
# Check if Vite dev server is running
# Should show: "Local: http://localhost:5173/"
# If not, restart with:
cd "c:\Users\Nithish\OneDrive\Desktop\smart---teaching - Copy\lovable\teach-smart-now-main\teach-smart-now-main"
npm run dev
```

### Clear All Data (Restart from Scratch)
```powershell
# Kill backend server
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restart backend (in new window)
cd "c:\Users\Nithish\OneDrive\Desktop\smart---teaching - Copy\lovable\teach-smart-now-main\teach-smart-now-main\server"
node index.js
```
Note: This clears all in-memory data (teachers, students, requests)

---

## 📊 Test Results Summary

Fill this out as you test:

- [ ] Admin can login
- [ ] Teacher can register
- [ ] Admin sees pending request
- [ ] Admin can approve teacher
- [ ] Admin sees 4-digit class code
- [ ] Teacher can login
- [ ] Teacher sees class code in dashboard
- [ ] Student can register with valid code
- [ ] Student registration fails with invalid code
- [ ] Student can login
- [ ] Student sees joined classes
- [ ] Teacher sees enrolled students
- [ ] PDF extraction works
- [ ] Multiple students can join same class
- [ ] Multiple teachers get different codes

---

## 🎯 Success Criteria

✅ **Complete Flow Working** when:
1. Admin successfully approves teacher
2. Teacher receives unique 4-digit code
3. Student can register using that code
4. Teacher can see enrolled students
5. Student can see joined classes
6. PDF extraction returns text correctly

---

## 📝 Notes

- All data is stored **in-memory** - server restart will clear everything
- Default admin credentials are hardcoded in `server/auth.js`
- Teacher default password = their email address
- Class codes are random 4-digit numbers (0000-9999)
- PDF extraction uses dual-API support for different pdf-parse versions

---

**Good luck with testing! 🚀**
