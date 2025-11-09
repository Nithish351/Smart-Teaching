# Google Forms API Setup Guide

## Important: Google Forms API Limitation

**Google Forms does NOT have a direct API to fetch responses.** Instead, you must:

1. Link your Google Form to Google Sheets
2. Use Google Sheets API to read the responses

## Your Google Form
```
https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/viewform
```

## Step-by-Step Setup

### Step 1: Link Form to Google Sheets

1. **Open your Google Form in edit mode:**
   - Go to: https://docs.google.com/forms/d/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/edit
   
2. **Click "Responses" tab** at the top

3. **Click the green Google Sheets icon** (📊)
   - This creates a new spreadsheet linked to your form
   - All form responses will automatically appear in this sheet

4. **Copy the Spreadsheet ID:**
   - The new Google Sheet will open
   - Copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_THE_SPREADSHEET_ID]/edit
   ```
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1abc123xyz.../edit`
   - Copy: `1abc123xyz...`

### Step 2: Make Spreadsheet Public

1. In the Google Sheet, click **"Share"** button (top right)

2. Change access to: **"Anyone with the link can view"**

3. Click **"Done"**

### Step 3: Update Backend Code

1. Open `server/googleSheets.js`

2. Find line 16:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```

3. Replace with your actual Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = '1abc123xyz...'; // Your copied ID
   ```

### Step 4: Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Select your project (or create one)

3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Verify your API Key has access:
   - Go to "APIs & Services" → "Credentials"
   - Find your API key: `AIzaSyBEV6jC-NBCIBOZv-q3z8GdE_-4W0rpZ2A`
   - Click Edit
   - Under "API restrictions", ensure "Google Sheets API" is allowed

### Step 5: Test the Integration

1. **Restart backend server:**
   ```bash
   cd server
   node index.js
   ```

2. **Test the connection:**
   ```bash
   curl http://127.0.0.1:3006/api/google/sheets/test
   ```

3. **Submit a test form:**
   - Go to your form: https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/viewform
   - Fill out and submit

4. **Check if it appears in admin dashboard:**
   - Login as admin: `admin@teachsmart.com` / `Admin@123`
   - Check pending requests

## How It Works

```
User fills Google Form
        ↓
Form saves to Google Sheets (automatic)
        ↓
Your backend calls Google Sheets API
        ↓
Fetches responses and displays in Admin Dashboard
        ↓
Admin approves teacher
```

## API Endpoints

### Check Configuration
```bash
curl http://127.0.0.1:3006/api/google/sheets/setup
```

### Test Connection
```bash
curl http://127.0.0.1:3006/api/google/sheets/test
```

### View Registrations
```bash
curl http://127.0.0.1:3006/api/google/sheets/registrations
```

### View All Requests (Custom + Google Forms)
```bash
curl http://127.0.0.1:3006/api/auth/teacher/requests
```

## Troubleshooting

### "Spreadsheet ID not configured"
- Make sure you updated `server/googleSheets.js` with the actual Spreadsheet ID

### "Failed to fetch Google Sheets data"
- Verify spreadsheet is set to "Anyone with link can view"
- Check that Google Sheets API is enabled
- Verify API key has correct permissions

### "No data returned"
- Submit a test form response first
- Wait a few seconds for Google to process
- Check that form is properly linked to spreadsheet

### Form not linking to sheet
- You must click the green Sheets icon in Responses tab
- Cannot use API without this step
- Each form can only link to one sheet

## Important Notes

1. **No Direct Form API**: Google Forms doesn't provide an API to read responses directly
2. **Sheets API Required**: You MUST link form to Google Sheets to fetch data
3. **Manual Step**: The form-to-sheet linking must be done manually in Google Forms
4. **Public Access**: Spreadsheet must be public for API to read it
5. **Real-time Sync**: Form responses appear in sheet instantly

## Current Status

✅ **Already Configured:**
- Backend code ready (`server/googleSheets.js`)
- Admin dashboard shows Google Sheets data
- API endpoints created
- Custom form as primary method
- Google Sheets as secondary source

⏳ **You Need To Do:**
1. Link form to Google Sheets (green icon)
2. Copy Spreadsheet ID
3. Update `server/googleSheets.js`
4. Make spreadsheet public
5. Restart backend

## Alternative Solution

If you don't want to use Google Sheets API, you have **two options**:

### Option 1: Use Custom Form Only (Current Setup)
- Teachers register through your app's custom form
- Data stored in your backend
- Admin approves directly
- ✅ **Already working!**

### Option 2: Use Webhooks (Advanced)
- Set up a webhook to receive form submissions
- Requires Google Apps Script
- More complex setup
- Not recommended for beginners

## Recommendation

**Use the custom form** (already working) as your primary method. The Google Sheets integration is optional and can be configured later if needed.

Your app currently works perfectly with the custom registration form! Teachers can:
1. Click "Register as New Teacher"
2. Fill out the form in your app
3. Submit → Admin sees it immediately
4. Admin approves → Teacher gets account

**No Google Sheets setup required for this to work!**
