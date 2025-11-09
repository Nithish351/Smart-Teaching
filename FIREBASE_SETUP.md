# Firebase + Supabase Hybrid Storage Setup Guide

Your application now uses a **hybrid storage architecture** combining Firebase Firestore and Supabase Storage for optimal performance!

## 🎉 Benefits of Hybrid Architecture

### Storage Strategy
- 📦 **Large files (notes)** → Supabase Storage
- 📊 **Metadata & structured data** → Firestore
- 🔐 **Authentication** → Firebase Auth
- 🎯 **Quizzes** → Firestore

### Why This Approach?
- ✅ **Firestore**: Great for queries but has 1MB document limit
- ✅ **Supabase Storage**: Optimized for files, no size limits, CDN delivery
- ✅ **Best of both**: Fast queries + scalable file storage

## 📋 Setup Steps

### Step 1: Firebase Console Setup

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `smart-teaching-94143`
3. **Enable Firestore Database**:
   - Click "Firestore Database" in the left menu
   - Click "Create database"
   - Choose "Start in production mode" or "test mode"
   - Select a location (e.g., `us-central`)

### Step 2: Enable Firebase Authentication

1. In Firebase Console, click "Authentication"
2. Click "Get Started"
3. Enable these sign-in methods:
   - **Email/Password**: Enable it
   - **Google**: Enable it (already configured in your app)

### Step 3: Get Service Account Credentials

1. In Firebase Console, click the gear icon ⚙️ → "Project settings"
2. Go to the "Service Accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely

### Step 4: Configure Environment Variables

Open `server/.env` and add these lines:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=smart-teaching-94143
FIREBASE_CLIENT_EMAIL=your-service-account@smart-teaching-94143.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**How to get these values from the JSON file you downloaded:**

- `FIREBASE_CLIENT_EMAIL`: Copy the `client_email` field
- `FIREBASE_PRIVATE_KEY`: Copy the `private_key` field (keep the quotes and `\n` characters)

**Example:**
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@smart-teaching-94143.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### Step 5: Set Firestore Security Rules

In Firebase Console → Firestore Database → Rules, use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Teachers collection - only authenticated teachers can read their own data
    match /teachers/{teacherId} {
      allow read: if request.auth != null && request.auth.token.role == 'teacher';
      allow write: if false; // Only backend can write
    }
    
    // Students collection - only authenticated students can read their own data
    match /students/{studentId} {
      allow read: if request.auth != null && request.auth.token.role == 'student';
      allow write: if false; // Only backend can write
    }
    
    // Teacher requests - admin only
    match /teacherRequests/{requestId} {
      allow read, write: if false; // Only backend can access
    }
    
    // Notes - teachers can read their own, students can read their teacher's
    match /notes/{noteId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
    
    // Quizzes - teachers can read their own, students can read published quizzes
    match /quizzes/{quizId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
    
    // Quiz attempts - students can read their own
    match /quizAttempts/{attemptId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
  }
}
```

## 🚀 Testing Your Setup

### 1. Start the servers:

```bash
# Terminal 1 - Backend
cd server
node index.js

# Terminal 2 - Frontend  
npm run dev
```

### 2. Check backend logs:

You should see:
```
[Firebase Admin] Initialized with service account credentials
[server] listening on http://127.0.0.1:3006
```

If you see warnings, check your environment variables.

### 3. Test the application:

1. **Create a teacher account**:
   - Login as admin (nithish0351@gmail.com / nithish0351)
   - Approve a teacher request
   - Login as teacher

2. **Upload a note**:
   - Upload a PDF file
   - Restart the server
   - **Check if notes still appear** ✅ (they should!)

3. **Create and publish a quiz**:
   - Generate a quiz from PDF
   - Publish it
   - Restart the server  
   - **Check if quiz still appears** ✅ (it should!)

4. **Login as student**:
   - Register with teacher's class code
   - View available quizzes ✅

## 📊 Firestore Collections

Your data is organized in these collections:

| Collection | Purpose | Storage Location | Fields |
|------------|---------|-----------------|--------|
| `teachers` | Teacher accounts | Firestore | teacherId, email, classCode, fullName, school |
| `students` | Student accounts | Firestore | studentId, email, classCode, teacherId |
| `teacherRequests` | Pending registrations | Firestore | name, email, school, phone, status |
| `notes` | **Metadata only** | Firestore | id, title, fileName, storagePath, publicUrl, size |
| `quizzes` | Created quizzes | Firestore | id, title, questions, teacherId, isPublished |
| `quizAttempts` | Student quiz results | Firestore | studentId, quizId, score, answers |

## 📦 Supabase Storage Buckets

| Bucket | Purpose | Structure | Public |
|--------|---------|-----------|--------|
| `notes` | PDF files & documents | `{teacherId}/{noteId}.{ext}` | Yes |

**Note**: File data is stored in Supabase Storage, only metadata is in Firestore!

## 🔍 Viewing Your Data

1. Go to Firebase Console
2. Click "Firestore Database"
3. Browse your collections and documents
4. You can manually edit data here if needed!

## 🛠️ Troubleshooting

### Error: "Firestore not initialized"

**Solution**: Make sure you've set all three environment variables in `.env`:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Error: "Could not create auth user"

**Solution**: Enable Email/Password authentication in Firebase Console → Authentication → Sign-in method

### Data not persisting

**Solution**: 
1. Check backend logs for Firestore errors
2. Verify your service account has proper permissions
3. Check Firestore rules aren't blocking writes

### Private key format issues

**Solution**: Make sure to:
1. Keep the quotes around the private key
2. Don't remove the `\n` characters
3. The key should start with `"-----BEGIN PRIVATE KEY-----\n`

## 🎓 Migration Complete!

Your application now uses:
- ✅ **Firebase Firestore** for data storage
- ✅ **Firebase Authentication** for user management  
- ✅ **Persistent storage** - data survives restarts
- ✅ **Automatic backups** - your data is safe
- ✅ **Real-time sync** - updates are instant
- ✅ **Scalable** - handles growth automatically

## 📝 Next Steps (Optional)

1. **Add indexes** for better query performance
2. **Set up Firebase Storage** for larger files
3. **Enable Firebase Analytics** for usage tracking
4. **Set up Firebase Hosting** for deployment
5. **Add composite indexes** if queries require them

## 🔒 Security Notes

- ⚠️ **Never commit** the service account JSON file to git
- ⚠️ **Never commit** `.env` file with real credentials
- ✅ Service account credentials should only be on the server
- ✅ Client apps use Firebase Auth tokens, not service account

---

**Need help?** Check the Firebase documentation: https://firebase.google.com/docs/firestore
