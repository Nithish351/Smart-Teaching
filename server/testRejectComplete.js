// Comprehensive test for reject functionality
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:3006';

async function runFullTest() {
  console.log('\n' + '='.repeat(60));
  console.log('  🧪 COMPLETE REJECT FUNCTIONALITY TEST');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Test 1: Check Google Sheets IDs are stable
    console.log('📋 TEST 1: Verify Stable IDs');
    console.log('-'.repeat(60));
    
    const fetch1 = await axios.get(`${API_BASE}/api/auth/teacher/requests`);
    const requests1 = fetch1.data.requests || [];
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const fetch2 = await axios.get(`${API_BASE}/api/auth/teacher/requests`);
    const requests2 = fetch2.data.requests || [];
    
    if (requests1.length > 0 && requests2.length > 0) {
      const firstId1 = requests1[0].id;
      const firstId2 = requests2[0].id;
      
      if (firstId1 === firstId2) {
        console.log('✅ PASS: IDs are stable across fetches');
        console.log(`   ID: ${firstId1}`);
      } else {
        console.log('❌ FAIL: IDs are changing!');
        console.log(`   First fetch:  ${firstId1}`);
        console.log(`   Second fetch: ${firstId2}`);
        return;
      }
    } else {
      console.log('⚠️  SKIP: No requests to test');
      return;
    }
    
    // Test 2: Reject a request
    console.log('\n📋 TEST 2: Reject Request');
    console.log('-'.repeat(60));
    
    const testRequest = requests1[0];
    console.log(`Request to reject:`);
    console.log(`  Name:  ${testRequest.name}`);
    console.log(`  Email: ${testRequest.email}`);
    console.log(`  ID:    ${testRequest.id}`);
    
    console.log(`\nSending reject...`);
    const rejectRes = await axios.post(`${API_BASE}/api/auth/teacher/reject`, {
      requestId: testRequest.id,
      reason: 'Test rejection - automated test'
    });
    
    console.log(`Response:`, JSON.stringify(rejectRes.data, null, 2));
    
    if (rejectRes.data.ok) {
      console.log('✅ PASS: Reject successful');
    } else {
      console.log('❌ FAIL: Reject failed');
      console.log(`   Error: ${rejectRes.data.error}`);
      return;
    }
    
    // Test 3: Verify request is filtered out
    console.log('\n📋 TEST 3: Verify Filtering');
    console.log('-'.repeat(60));
    
    const fetch3 = await axios.get(`${API_BASE}/api/auth/teacher/requests`);
    const requests3 = fetch3.data.requests || [];
    
    const stillExists = requests3.some(r => r.id === testRequest.id);
    
    console.log(`Requests before reject: ${requests1.length}`);
    console.log(`Requests after reject:  ${requests3.length}`);
    console.log(`Request still in list:  ${stillExists ? 'YES ❌' : 'NO ✅'}`);
    
    if (!stillExists && requests3.length === requests1.length - 1) {
      console.log('✅ PASS: Request successfully filtered out');
    } else if (!stillExists) {
      console.log('⚠️  PARTIAL: Request filtered but count mismatch');
    } else {
      console.log('❌ FAIL: Request still appears in list');
      return;
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📱 Now test in the browser:');
    console.log('   1. Open http://localhost:5173');
    console.log('   2. Login as admin');
    console.log('   3. Click Reject on any request');
    console.log('   4. Request should disappear!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.log('\n💡 Make sure the backend server is running and restarted with new code!\n');
  }
}

runFullTest();
