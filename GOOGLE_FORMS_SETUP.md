# Google Forms Integration Setup Guide

## Overview
Your Smart Teaching platform now integrates with Google Forms for teacher registration! Teachers fill out a Google Form, and admins can view and approve these requests directly in the Admin Dashboard.

## 🔑 Your Configuration

**Google Forms API Key:** `AIzaSyBEV6jC-NBCIBOZv-q3z8GdE_-4W0rpZ2A`

**Google Form URL:** 
```
https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/viewform
```

**Form ID:** `1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew`

## 📋 Setup Instructions

### Step 1: Link Your Google Form to Google Sheets

1. Open your Google Form: https://docs.google.com/forms/d/e/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/edit

2. Click on the **"Responses"** tab at the top

3. Click the **Google Sheets icon** (green spreadsheet icon) to create a linked spreadsheet

4. A new Google Sheet will be created automatically

### Step 2: Get Your Spreadsheet ID

1. Once the spreadsheet opens, look at the URL in your browser:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

2. Copy the **SPREADSHEET_ID** from the URL (the long string between `/d/` and `/edit`)

### Step 3: Configure Your Backend

1. Open the file: `server/googleSheets.js`

2. Find this line (around line 16):
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```

3. Replace `'YOUR_SPREADSHEET_ID_HERE'` with your actual Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = '1abc123xyz...'; // Your actual ID
   ```

### Step 4: Set Spreadsheet Permissions

1. In your Google Sheet, click the **"Share"** button (top right)

2. Change access to: **"Anyone with the link can view"**

3. Click **"Done"**

### Step 5: Enable Google Sheets API (If Not Already Enabled)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Select your project or create a new one

3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Make sure your API key `AIzaSyBEV6jC-NBCIBOZv-q3z8GdE_-4W0rpZ2A` has access to Google Sheets API

### Step 6: Test the Integration

1. Restart your backend server:
   ```bash
   cd server
   node index.js
   ```

2. Test the connection by visiting:
   ```
   http://127.0.0.1:3006/api/google/sheets/test
   ```

3. You should see a success message with the number of registrations

## 🎯 How It Works

### For Teachers:
1. Visit the main page at `http://localhost:5173`
2. Click **"Register as New Teacher"**
3. Fill out the embedded Google Form
4. Submit and wait for admin approval

### For Admins:
1. Click **"Admin Access"** on the main page
2. Login with admin credentials:
   - Email: `admin@teachsmart.com`
   - Password: `Admin@123`
3. See all pending teacher requests (from both Google Forms and manual requests)
4. Approve requests by:
   - Clicking "Approve"
   - Setting teacher email (pre-filled from form)
   - Creating a temporary password
   - System generates a 4-digit class code automatically

## 📊 Admin Dashboard Features

The Admin Dashboard now shows:
- **Teacher name** (from form)
- **Email address**
- **School/Institution**
- **Phone number**
- **Subject** (if included in form)
- **Experience** (if included in form)
- **Timestamp** of submission

## 🔍 Testing Endpoints

### Check Setup Status:
```bash
curl http://127.0.0.1:3006/api/google/sheets/setup
```

### Test Connection:
```bash
curl http://127.0.0.1:3006/api/google/sheets/test
```

### View All Registrations:
```bash
curl http://127.0.0.1:3006/api/google/sheets/registrations
```

### View Pending Requests (Combined):
```bash
curl http://127.0.0.1:3006/api/auth/teacher/requests
```

## 📝 Form Field Mapping

The system automatically maps these common form fields:
- **Name**: Any field containing "name" or "full name"
- **Email**: Any field containing "email"
- **School**: Any field containing "school" or "institution"
- **Phone**: Any field containing "phone" or "contact"
- **Subject**: Any field containing "subject"
- **Experience**: Any field containing "experience"

## 🚀 Next Steps

1. Complete Steps 1-3 above to link your form to a spreadsheet
2. Update `server/googleSheets.js` with your Spreadsheet ID
3. Restart the backend server
4. Test by submitting a form response
5. Login as admin and check if the request appears

## ⚠️ Important Notes

- **Data Refresh**: The system fetches Google Sheets data when admin loads the dashboard
- **Rate Limits**: Google Sheets API has rate limits - don't refresh too frequently
- **Security**: Keep your API key secure and don't commit it to public repositories
- **Spreadsheet Format**: Don't modify the spreadsheet column headers after form is linked
- **Status Tracking**: Once approved, requests won't show in pending list anymore

## 🛠️ Troubleshooting

### "Failed to fetch Google Sheets data"
- Check that Spreadsheet ID is correctly set in `server/googleSheets.js`
- Verify spreadsheet permissions are set to "Anyone with the link can view"
- Ensure Google Sheets API is enabled in Google Cloud Console

### "No pending requests"
- Submit a test form response first
- Check browser console for errors
- Verify backend is running and accessible

### API Key Issues
- Ensure API key has Google Sheets API enabled
- Check API key restrictions in Google Cloud Console
- Verify API key is correctly set in `server/googleSheets.js`

## 📧 Support

If you encounter issues:
1. Check backend console logs for detailed error messages
2. Visit `/api/google/sheets/setup` for configuration details
3. Review this setup guide step by step

## ✅ Verification Checklist

- [ ] Google Form is created and accessible
- [ ] Form is linked to a Google Sheet (Responses tab)
- [ ] Spreadsheet ID copied and added to `server/googleSheets.js`
- [ ] Spreadsheet permissions set to "Anyone with the link can view"
- [ ] Google Sheets API enabled in Google Cloud Console
- [ ] API key configured in `server/googleSheets.js`
- [ ] Backend server restarted
- [ ] Test endpoint returns successful response
- [ ] Test form submission appears in Admin Dashboard

---

**Congratulations!** Once setup is complete, your Google Forms integration will be fully functional. Teachers can register through the form, and admins can approve them seamlessly through the dashboard.
