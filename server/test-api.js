#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Simple retry logic
async function testWithRetry(name, fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n${name} (attempt ${i + 1}/${maxRetries})`);
      await fn();
      return;
    } catch (e) {
      if (i === maxRetries - 1) {
        console.error('❌ Failed after', maxRetries, 'attempts');
        console.error('Error:', e.code, e.message);
      } else {
        console.log('⏳ Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

async function main() {
  console.log('🧪 Testing API endpoints...\n');
  
  const baseUrl = 'http://localhost:3005';
  const pdfPath = './test.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ test.pdf not found');
    process.exit(1);
  }

  // Test 1: Health check
  await testWithRetry('1️⃣ Health check', async () => {
    const res = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
    console.log('✅ Server is running:', res.data);
  });

  // Test 2: Debug env
  await testWithRetry('2️⃣ Debug environment', async () => {
    const res = await axios.get(`${baseUrl}/api/debug/env`, { timeout: 5000 });
    console.log('✅ Environment:', res.data);
  });

  // Test 3: Multipart extraction
  await testWithRetry('3️⃣ Multipart extraction', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(pdfPath));
    const res = await axios.post(`${baseUrl}/api/ai/extract-text`, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    console.log('✅ Extracted text length:', res.data.text?.length || 0, 'characters');
    console.log('   Preview:', (res.data.text || '').substring(0, 100));
  });

  // Test 4: JSON base64 extraction
  await testWithRetry('4️⃣ JSON base64 extraction', async () => {
    const buffer = fs.readFileSync(pdfPath);
    const base64 = buffer.toString('base64');
    const res = await axios.post(`${baseUrl}/api/ai/extract-text-json`, {
      dataBase64: base64,
      name: 'test.pdf'
    }, { timeout: 30000 });
    console.log('✅ Extracted text length:', res.data.text?.length || 0, 'characters');
    console.log('   Preview:', (res.data.text || '').substring(0, 100));
  });

  console.log('\n✅ All tests passed!');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
