const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function main() {
  const baseUrl = 'http://localhost:3006';
  console.log(`\n🔎 Checking backend at ${baseUrl}`);

  // Health
  try {
    const res = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
    console.log('✅ /api/health:', res.data);
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    process.exit(1);
  }

  // Extract text (multipart)
  let extracted = '';
  try {
    const pdfPath = './test.pdf';
    if (!fs.existsSync(pdfPath)) {
      throw new Error('Missing test.pdf in server folder');
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(pdfPath));
    const res = await axios.post(`${baseUrl}/api/ai/extract-text`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });
    extracted = String(res.data?.text || '').slice(0, 400);
    console.log(`✅ /api/ai/extract-text: got ${res.data?.text?.length || 0} chars`);
    console.log('   Preview:', extracted.replace(/\s+/g, ' ').slice(0, 120));
  } catch (err) {
    console.error('❌ Extraction failed:', err.response?.status, err.response?.data || err.message);
  }

  // Gemini quiz (use extracted text if available, else a small sample)
  try {
    const text = extracted || 'Photosynthesis is the process by which green plants convert light energy into chemical energy.';
    const res = await axios.post(`${baseUrl}/api/ai/generate-quiz-gemini`, {
      text,
      count: 3,
      difficulty: 'easy',
    }, { timeout: 90000 });
    const qs = res.data?.questions || [];
    console.log(`✅ /api/ai/generate-quiz-gemini: got ${qs.length} questions`);
    console.log(qs.slice(0, 3));
  } catch (err) {
    console.error('❌ Gemini quiz failed:', err.response?.status, err.response?.data || err.message);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
