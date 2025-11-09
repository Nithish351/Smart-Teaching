// Google Sheets API integration for fetching teacher registration form responses
const axios = require('axios');

const GOOGLE_SHEETS_API_KEY = 'AIzaSyBEV6jC-NBCIBOZv-q3z8GdE_-4W0rpZ2A';
// Extract the form ID from your iframe URL
const FORM_ID = '1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew';

// Note: To fetch Google Form responses, we need the associated Google Sheet ID
// The form needs to be linked to a Google Sheet (in the form's "Responses" tab)
// For this implementation, you'll need to:
// 1. Open your Google Form
// 2. Go to "Responses" tab
// 3. Click the Google Sheets icon to create a linked spreadsheet
// 4. Get the Spreadsheet ID from the URL

// IMPORTANT: Replace this with your actual Google Sheets ID after linking the form to a sheet
const SPREADSHEET_ID = '1ao_-Gk_gtCMgxTntukYrLLm1SO48CzbPxJ4z4-7uljU';

/**
 * Fetch teacher registration responses from Google Sheets
 * @returns {Promise<Array>} Array of teacher registration data
 */
async function fetchTeacherRegistrations() {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
      console.warn('[GoogleSheets] Spreadsheet ID not configured. Please link your Google Form to a spreadsheet.');
      return [];  // Now only returns empty if ID is NOT configured
    }

    // Google Sheets API endpoint to read data
    // Range 'Form Responses 1' is the default sheet name when a form is linked
    const range = 'Form Responses 1!A:Z'; // Read all columns
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${GOOGLE_SHEETS_API_KEY}`;

    const response = await axios.get(url);
    const rows = response.data.values || [];

    if (rows.length === 0) {
      return [];
    }

    // First row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to objects based on headers
    const registrations = dataRows.map((row, index) => {
      // Create a stable ID based on email + timestamp (first column)
      const email = row[headers.findIndex(h => String(h).toLowerCase().includes('email'))] || '';
      const timestamp = row[0] || '';
      // Use a hash of email + timestamp for stable ID across fetches
      const crypto = require('crypto');
      const stableId = crypto.createHash('md5').update(`${email}_${timestamp}`).digest('hex').substring(0, 16);
      
      const registration = {
        id: `sheet_${stableId}`,
        timestamp: timestamp,
        status: 'pending'
      };

      // Map common form field names
      headers.forEach((header, idx) => {
        const headerLower = String(header).toLowerCase().trim();
        const value = row[idx] || '';

        if (headerLower.includes('name') || headerLower.includes('full name')) {
          registration.name = value;
        } else if (headerLower.includes('email')) {
          registration.email = value;
        } else if (headerLower.includes('school') || headerLower.includes('institution') || headerLower.includes('department')) {
          registration.school = value;
        } else if (headerLower.includes('phone') || headerLower.includes('contact') || headerLower.includes('number')) {
          registration.phone = value;
        } else if (headerLower.includes('subject')) {
          registration.subject = value;
        } else if (headerLower.includes('experience')) {
          registration.experience = value;
        } else if (headerLower.includes('code') || headerLower.includes('teacher code')) {
          registration.preferredCode = value;
        }
      });

      return registration;
    });

    return registrations.filter(r => r.email); // Only return entries with email
  } catch (error) {
    console.error('[GoogleSheets] Error fetching registrations:', error.response?.data || error.message);
    throw new Error(`Failed to fetch Google Sheets data: ${error.message}`);
  }
}

/**
 * Setup instructions for Google Forms integration
 */
function getSetupInstructions() {
  return {
    step1: 'Open your Google Form at https://docs.google.com/forms/d/1FAIpQLSfecwiJ0avsYbrcoxo1VlGSVnZ1EqQexKvkZoHIhJIefhHVew/edit',
    step2: 'Click on the "Responses" tab',
    step3: 'Click the Google Sheets icon (green spreadsheet icon) to create a linked spreadsheet',
    step4: 'Once the spreadsheet opens, copy the Spreadsheet ID from the URL',
    step5: 'The URL format is: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
    step6: 'Replace SPREADSHEET_ID in server/googleSheets.js with your actual ID',
    step7: 'Make sure your Google Sheets API is enabled in Google Cloud Console',
    step8: 'Ensure the spreadsheet is set to "Anyone with the link can view"',
    apiKeyNote: 'Your API key: AIzaSyBEV6jC-NBCIBOZv-q3z8GdE_-4W0rpZ2A',
    formId: FORM_ID,
    currentSpreadsheetId: SPREADSHEET_ID
  };
}

/**
 * Test function to verify Google Sheets API access
 */
async function testConnection() {
  try {
    const registrations = await fetchTeacherRegistrations();
    return {
      success: true,
      count: registrations.length,
      data: registrations,
      message: `Successfully fetched ${registrations.length} registration(s)`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      instructions: getSetupInstructions()
    };
  }
}

module.exports = {
  fetchTeacherRegistrations,
  getSetupInstructions,
  testConnection,
  SPREADSHEET_ID,
  FORM_ID
};
