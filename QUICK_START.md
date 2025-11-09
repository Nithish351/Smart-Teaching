# 🚀 Quick Start Guide

## Current Server Status

✅ **Backend**: Running on http://127.0.0.1:3006 (PID 9272)
✅ **Frontend**: Running on http://localhost:5173

## 🎯 Quick Test (5 Minutes)

### 1. Open Your Browser
Navigate to: **http://localhost:5173**

### 2. Test Admin Flow
1. Scroll down and click **"Admin Access"**
2. Login:
   - Email: `admin@teachsmart.com`
   - Password: `Admin@123`
3. You'll see "No pending teacher requests" initially

### 3. Register a Teacher (New Tab)
1. Open http://localhost:5173 in a **new tab**
2. Click **"Teacher"** role
3. Click **"New teacher? Register here"**
4. Fill form:
   - Name: `John Doe`
   - Email: `john@school.com`
   - School: `Test School`
   - Phone: `1234567890`
5. Submit and note the Request ID

### 4. Approve Teacher (Admin Tab)
1. Go back to admin tab
2. You'll see 1 pending request
3. Click **"Approve"**
4. **COPY THE 4-DIGIT CODE** (e.g., 7845)

### 5. Login as Teacher
1. Go back to teacher tab
2. Click **"Back to Login"**
3. Login:
   - Email: `john@school.com`
   - Password: `john@school.com` (default = email)
4. You'll see your **Class Code** and empty student list

### 6. Register a Student (New Tab)
1. Open http://localhost:5173 in a **new tab**
2. Click **"Student"** role
3. Click **"New student? Register here"**
4. Fill form:
   - Email: `student1@test.com`
   - Password: `pass123`
   - **Class Code**: [paste the 4-digit code from step 4]
5. Register and login

### 7. Verify
- **Student tab**: Should see teacher "John Doe" in "Joined Classes"
- **Teacher tab**: Refresh - should see "student1@test.com" in enrolled students

## 🎉 Success!

If all steps worked, you have successfully tested:
✅ Admin approval workflow
✅ Teacher registration & login
✅ 4-digit class code generation
✅ Student registration with code validation
✅ Teacher-student association
✅ Real-time data flow

## 📚 Full Documentation

- **Detailed Testing**: See `TESTING_GUIDE.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

## 🔧 If Servers Are Not Running

### Restart Backend
```powershell
cd "c:\Users\Nithish\OneDrive\Desktop\smart---teaching - Copy\lovable\teach-smart-now-main\teach-smart-now-main\server"
node index.js
```

### Restart Frontend
```powershell
cd "c:\Users\Nithish\OneDrive\Desktop\smart---teaching - Copy\lovable\teach-smart-now-main\teach-smart-now-main"
npm run dev
```

## 🆘 Quick Health Checks

```powershell
# Test backend
curl.exe http://127.0.0.1:3006/api/health
# Should return: {"ok":true}

# Check if servers are running
Get-Process | Where-Object {$_.ProcessName -eq 'node'}
```

---

**Happy Testing! 🎓**
