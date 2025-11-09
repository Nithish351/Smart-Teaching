// Test the reject functionality
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:3006';

async function testReject() {
  console.log('\n🧪 Testing Reject Functionality\n');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Get teacher requests
    console.log('\n1️⃣ Fetching teacher requests...');
    const requestsRes = await axios.get(`${API_BASE}/api/auth/teacher/requests`);
    const requests = requestsRes.data.requests || [];
    
    console.log(`   Found ${requests.length} requests`);
    console.log(`   Sources: Firestore=${requestsRes.data.sources.firestore}, Google Sheets=${requestsRes.data.sources.googleSheets}`);
    
    if (requests.length === 0) {
      console.log('\n❌ No requests to test with!');
      return;
    }
    
    // Pick the first request
    const testRequest = requests[0];
    console.log(`\n2️⃣ Testing reject with request:`);
    console.log(`   ID: ${testRequest.id}`);
    console.log(`   Name: ${testRequest.name}`);
    console.log(`   Email: ${testRequest.email}`);
    console.log(`   Source: ${testRequest.id.startsWith('sheet_') ? 'Google Sheets' : 'Firestore'}`);
    
    // Step 2: Reject the request
    console.log(`\n3️⃣ Sending reject request...`);
    try {
      const rejectRes = await axios.post(`${API_BASE}/api/auth/teacher/reject`, {
        requestId: testRequest.id,
        reason: 'Test rejection'
      });
      
      console.log('   Response:', JSON.stringify(rejectRes.data, null, 2));
      
      if (rejectRes.data.ok) {
        console.log('   ✅ Reject successful!');
        console.log(`   Message: ${rejectRes.data.message}`);
      } else {
        console.log('   ❌ Reject failed');
        console.log(`   Error: ${rejectRes.data.error}`);
      }
    } catch (rejectError) {
      console.log('   ❌ Reject request failed');
      if (rejectError.response) {
        console.log(`   Status: ${rejectError.response.status}`);
        console.log(`   Error: ${JSON.stringify(rejectError.response.data, null, 2)}`);
      } else {
        console.log(`   Error: ${rejectError.message}`);
      }
    }
    
    // Step 3: Verify it's removed from the list
    console.log(`\n4️⃣ Verifying request is removed from list...`);
    const verifyRes = await axios.get(`${API_BASE}/api/auth/teacher/requests`);
    const afterRequests = verifyRes.data.requests || [];
    
    const stillExists = afterRequests.some(r => r.id === testRequest.id);
    
    if (stillExists) {
      console.log('   ❌ Request still appears in list!');
    } else {
      console.log('   ✅ Request successfully removed from list!');
    }
    
    console.log(`   Requests before: ${requests.length}`);
    console.log(`   Requests after: ${afterRequests.length}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testReject();
