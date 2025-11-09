const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testExtraction() {
  try {
    console.log('📄 Testing extraction endpoint...');
    
    // Test 1: Multipart extraction
    console.log('\n1️⃣ Testing /api/ai/extract-text (multipart)');
    const form = new FormData();
    form.append('file', fs.createReadStream('./test.pdf'));
    
    try {
      const res1 = await axios.post('http://localhost:3005/api/ai/extract-text', form, {
        headers: form.getHeaders(),
        timeout: 30000
      });
      console.log('✅ Multipart extraction successful');
      console.log('Response:', res1.data);
    } catch (e) {
      console.log('❌ Multipart failed:');
      console.log('  Code:', e.code);
      console.log('  Status:', e.response?.status);
      console.log('  Data:', JSON.stringify(e.response?.data));
      console.log('  Message:', e.message);
    }
    
    // Test 2: JSON base64 extraction
    console.log('\n2️⃣ Testing /api/ai/extract-text-json (base64)');
    const buffer = fs.readFileSync('./test.pdf');
    const base64 = buffer.toString('base64');
    
    try {
      const res2 = await axios.post('http://localhost:3005/api/ai/extract-text-json', {
        dataBase64: base64,
        name: 'test.pdf'
      }, { timeout: 30000 });
      console.log('✅ JSON extraction successful');
      console.log('Response:', res2.data);
    } catch (e) {
      console.log('❌ JSON extraction failed:');
      console.log('  Status:', e.response?.status);
      console.log('  Data:', JSON.stringify(e.response?.data));
      console.log('  Message:', e.message);
    }
    
    // Test 3: Debug env
    console.log('\n3️⃣ Testing /api/debug/env');
    try {
      const res3 = await axios.get('http://localhost:3005/api/debug/env');
      console.log('✅ Debug env:');
      console.log(JSON.stringify(res3.data, null, 2));
    } catch (e) {
      console.log('❌ Debug env failed:');
      console.log('  Status:', e.response?.status);
      console.log('  Message:', e.message);
    }
    
  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

testExtraction();
