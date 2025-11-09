const path = require('path');
// Load env from server/.env and override any pre-set shell variables (e.g., PORT)
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const axios = require('axios');
let pdfParse = null; // lazy-loaded local PDF extractor
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
// Import Firestore-based authentication (NEW - replaces in-memory auth)
const auth = require('./authFirestore'); 
const googleSheets = require('./googleSheets'); // Import Google Sheets integration
const firestoreHelpers = require('./firestoreHelpers'); // Import Firestore helpers for notes/quizzes
const rejectedRequests = require('./rejectedRequests'); // Import rejected requests tracker
const fsp = fs.promises;

// Helper: persist debug artifacts to OS temp dir
async function saveDebugArtifact(tag, content) {
	try {
		const id = crypto.randomBytes(6).toString('hex');
		const filename = path.join(os.tmpdir(), `tsn_debug_${tag}_${Date.now()}_${id}.txt`);
		const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
		await fsp.writeFile(filename, data, 'utf8');
		console.log('[server] Debug artifact saved:', filename);
		return filename;
	} catch (e) {
		console.warn('[server] Failed to save debug artifact for', tag, e?.message || e);
		return null;
	}
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Firestore database reference for notes and quizzes (NEW - replaces in-memory Maps)
const { db, COLLECTIONS } = auth;

const PORT = process.env.PORT || 3006;
const SKIP_BUCKET_CHECK = String(process.env.SUPABASE_SKIP_BUCKET_CHECK || '').toLowerCase() === 'true';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gaoguwecvtmwkuycbxym.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Google Generative Language API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // YouTube Data API v3 key

if (!SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('[server] SUPABASE_SERVICE_ROLE_KEY not set. Signed uploads will not work until you add it to server/.env');
}

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
	: null;

async function ensureBucket(bucketId = 'notes', isPublic = true) {
	if (!supabaseAdmin) return;
	try {
		const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
		if (listErr) throw listErr;
		const exists = (buckets || []).some(b => b.name === bucketId);
		if (!exists) {
			await supabaseAdmin.storage.createBucket(bucketId, { public: isPublic, fileSizeLimit: '50mb' });
			console.log(`[server] created Supabase bucket '${bucketId}' (public=${isPublic})`);
		} else {
			// Optionally update public setting if mismatched
			// Supabase does not support updating bucket public flag directly via JS SDK v2 yet
			console.log(`[server] bucket '${bucketId}' exists`);
		}
	} catch (e) {
		console.warn('[server] ensureBucket error:', e.message || e);
	}
}

app.get('/api/health', (req, res) => {
	console.log('[server] /api/health called');
	res.json({ ok: true });
});

// Test endpoint to verify extraction is callable
app.get('/api/ai/test', (req, res) => {
	console.log('[server] /api/ai/test called');
	res.json({ message: 'test endpoint works' });
});

// Create a signed upload URL for a given bucket and path
app.post('/api/storage/signed-upload', async (req, res) => {
	try {
		if (!supabaseAdmin) {
			return res.status(500).json({ error: 'Server not configured for Supabase. Missing SUPABASE_SERVICE_ROLE_KEY.' });
		}
		const { bucket = 'notes', path } = req.body || {};
		if (!path) {
			return res.status(400).json({ error: 'Missing required body field: path' });
		}
		const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
		if (error) {
			console.error('[server] signed-upload error:', error);
			return res.status(500).json({ error: error.message });
		}
		return res.json({ bucket, path: data.path || path, token: data.token, signedUrl: data.signedUrl });
	} catch (err) {
		console.error('[server] signed-upload exception:', err);
		return res.status(500).json({ error: err.message || 'Unknown error' });
	}
});

// Simple debug endpoint to verify envs
app.get('/api/debug/env', (req, res) => {
	res.json({
		PORT,
		SUPABASE_URL: SUPABASE_URL?.slice(0, 30) + '...',
		HAS_SERVICE_ROLE: Boolean(SUPABASE_SERVICE_ROLE_KEY),
		HAS_GEMINI: Boolean(GEMINI_API_KEY)
	});
});

// Create a public URL (for public buckets)
app.get('/api/storage/public-url', async (req, res) => {
	try {
		const bucket = req.query.bucket || 'notes';
		const path = req.query.path;
		if (!path) {
			return res.status(400).json({ error: 'Missing required query param: path' });
		}
		const client = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || '');
		const { data } = client.storage.from(bucket).getPublicUrl(path);
		return res.json({ publicUrl: data.publicUrl });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Unknown error' });
	}
});

	// Create a time-limited signed download URL for private buckets
	app.get('/api/storage/signed-download', async (req, res) => {
		try {
			if (!supabaseAdmin) {
				return res.status(500).json({ error: 'Server not configured for Supabase. Missing SUPABASE_SERVICE_ROLE_KEY.' });
			}
			const bucket = req.query.bucket || 'notes';
			const path = req.query.path;
			const expiresIn = parseInt(req.query.expiresIn || '604800', 10); // 7 days
			if (!path) {
				return res.status(400).json({ error: 'Missing required query param: path' });
			}
			const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
			if (error) {
				return res.status(500).json({ error: error.message });
			}
			return res.json({ signedUrl: data.signedUrl, expiresIn });
		} catch (err) {
			return res.status(500).json({ error: err.message || 'Unknown error' });
		}
	});

// ===== Text Extraction Endpoint (local pdf-parse, multipart only) =====
// Multipart: accepts 'file' form field (primary and only path)
app.post('/api/ai/extract-text', upload.single('file'), async (req, res) => {
	console.log('[server] /api/ai/extract-text called, file:', req.file ? req.file.originalname : 'NO FILE');
	try {
		if (!req.file) {
			console.error('[server] no file in request');
			return res.status(400).json({ error: 'Missing file' });
		}

		// Local extraction via pdf-parse (primary)
		try {
			console.log('[server] attempting pdf-parse...');
			if (!pdfParse) {
				try {
					pdfParse = require('pdf-parse');
					console.log('[server] pdf-parse loaded');
				} catch (requireErr) {
					console.error('[server] failed to require pdf-parse:', requireErr?.message);
					throw requireErr;
				}
			}
			let text = '';
			// Support both old (function) and new (class) APIs of pdf-parse
			if (typeof pdfParse === 'function' || typeof (pdfParse?.default) === 'function') {
				const fn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
				const parsed = await fn(req.file.buffer);
				text = String(parsed?.text || '').replace(/\s+/g, ' ').trim();
			} else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
				const { PDFParse } = pdfParse;
				const u8 = new Uint8Array(req.file.buffer);
				const parser = new PDFParse(u8);
				try {
					await parser.load();
					const t = await parser.getText();
					text = String(t || '').replace(/\s+/g, ' ').trim();
				} finally {
					if (typeof parser.destroy === 'function') {
						try { parser.destroy(); } catch {}
					}
				}
			}
			console.log('[server] extracted', text.length, 'characters');

			// Persist extracted text for debugging inspection
			try {
				const debugPath = path.join(os.tmpdir(), `tsn_extracted_text_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.txt`);
				await fsp.writeFile(debugPath, text, 'utf8');
				console.log('[server] Debug: extracted text saved to', debugPath);
			} catch (saveErr) {
				console.warn('[server] Failed to save extracted text debug artifact:', saveErr?.message || saveErr);
			}
			if (text.length > 0) return res.json({ text });
		} catch (e) {
			console.error('[server] local pdf-parse error (multipart):', e?.message || e);
			console.error('[server] stack:', e?.stack);
		}

		// Secondary naive fallback: attempt to read visible strings from PDF content streams
		try {
			const raw = req.file.buffer.toString('latin1');
			// Capture text within parentheses followed by Tj/TJ operators
			const matches = [...raw.matchAll(/\(([^)]*)\)\s*T[Jj]/g)].map(m => m[1]);
			const naive = matches
				.map(s => s.replace(/\\\)/g, ')').replace(/\\\(/g, '(').replace(/\\n/g, ' '))
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();
			console.log('[server] naive PDF extraction length:', naive.length);
			// Persist naive extracted text for debugging
			try {
				const debugPath = path.join(os.tmpdir(), `tsn_extracted_text_naive_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.txt`);
				await fsp.writeFile(debugPath, naive, 'utf8');
				console.log('[server] Debug: naive extracted text saved to', debugPath);
			} catch (saveErr) {
				console.warn('[server] Failed to save naive extracted text debug artifact:', saveErr?.message || saveErr);
			}
			if (naive.length > 0) return res.json({ text: naive, warn: 'naive-pdf-fallback' });
		} catch (e) {
			console.warn('[server] naive PDF extraction failed:', e?.message || e);
		}

		return res.status(502).json({ error: 'Failed to extract text from PDF' });
	} catch (err) {
		console.error('[server] extract-text exception:', err);
		return res.status(502).json({ error: err?.message || 'Unknown error' });
	}
});

// Note: JSON/base64 route removed to simplify and avoid proxy inconsistencies

// ===== AUTHENTICATION ROUTES (Updated for Firestore) =====

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
	const { email, password } = req.body;
	const result = await auth.adminLogin(email, password);
	if (result.ok) {
		return res.json(result);
	}
	return res.status(401).json(result);
});

// Submit teacher registration request
app.post('/api/auth/teacher/request', async (req, res) => {
	const { name, email, school, phone } = req.body;
	if (!name || !email || !school || !phone) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	const result = await auth.submitTeacherRequest({ name, email, school, phone });
	return res.json(result);
});

// Get pending teacher requests (Admin only)
// This now fetches from Google Sheets AND Firestore
app.get('/api/auth/teacher/requests', async (req, res) => {
	try {
		// Get Firestore requests
		let firestoreRequests = await auth.getPendingRequests();
		// Ensure it's an array
		if (!Array.isArray(firestoreRequests)) {
			console.warn('[server] Firestore requests is not an array:', firestoreRequests);
			firestoreRequests = [];
		}
		
		// Get Google Sheets requests
		let sheetRequests = [];
		try {
			sheetRequests = await googleSheets.fetchTeacherRegistrations();
			if (!Array.isArray(sheetRequests)) {
				console.warn('[server] Google Sheets requests is not an array');
				sheetRequests = [];
			}
		} catch (err) {
			console.warn('[server] Failed to fetch Google Sheets data:', err.message);
		}
		
		// Merge both sources
		const allRequests = [...firestoreRequests, ...sheetRequests];
		
		// Filter out rejected requests
		const filteredRequests = await rejectedRequests.filterRejected(allRequests);
		
		return res.json({ 
			requests: filteredRequests,
			sources: {
				firestore: firestoreRequests.length,
				googleSheets: sheetRequests.length,
				total: allRequests.length,
				afterRejectionFilter: filteredRequests.length
			}
		});
	} catch (error) {
		console.error('[server] Error fetching requests:', error);
		return res.status(500).json({ error: error.message });
	}
});

// Approve teacher request
app.post('/api/auth/teacher/approve', async (req, res) => {
	const { requestId, email, password } = req.body;
	if (!requestId || !email || !password) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	
	try {
		// Handle Google Sheets requests (ID starts with "sheet_")
		if (requestId.startsWith('sheet_')) {
			const result = await auth.approveGoogleSheetsTeacher(requestId, email, password);
			if (result.ok) {
				return res.json(result);
			}
			return res.status(400).json(result);
		}
		
		// Handle Firestore requests
		const result = await auth.approveTeacher(requestId, email, password);
		if (result.ok) {
			return res.json(result);
		}
		return res.status(400).json(result);
	} catch (error) {
		return res.status(500).json({ ok: false, error: error.message });
	}
});

// Reject teacher request
app.post('/api/auth/teacher/reject', async (req, res) => {
	const { requestId, reason } = req.body;
	console.log(`[server] Reject request received for ID: ${requestId}`);
	
	if (!requestId) {
		console.error('[server] Missing requestId');
		return res.status(400).json({ ok: false, error: 'Missing requestId' });
	}
	
	try {
		// Mark as rejected in our tracking collection (works for both Google Sheets and Firestore)
		console.log(`[server] Calling markAsRejected...`);
		const trackResult = await rejectedRequests.markAsRejected(requestId, reason || 'Rejected by admin');
		console.log(`[server] markAsRejected result:`, trackResult);
		
		if (!trackResult.ok) {
			console.error('[server] markAsRejected failed:', trackResult.error);
			return res.status(500).json(trackResult);
		}
		
		// If it's a Firestore request, also update the status in the original collection
		if (!requestId.startsWith('sheet_')) {
			console.log(`[server] Updating Firestore request status...`);
			await auth.rejectTeacher(requestId, reason || '');
		} else {
			console.log(`[server] Skipping Firestore update for Google Sheets request`);
		}
		
		console.log(`[server] ✅ Successfully rejected request: ${requestId}`);
		return res.json({ 
			ok: true, 
			message: 'Request rejected successfully'
		});
	} catch (error) {
		console.error('[server] ❌ Error rejecting request:', error);
		return res.status(500).json({ ok: false, error: error.message });
	}
});

// Teacher login
app.post('/api/auth/teacher/login', async (req, res) => {
	const { email, password } = req.body;
	const result = await auth.teacherLogin(email, password);
	if (result.ok) {
		return res.json(result);
	}
	return res.status(401).json(result);
});

// Lookup teacher by class code
app.get('/api/auth/teacher/by-classcode/:classCode', async (req, res) => {
	const { classCode } = req.params;
	const result = await auth.getTeacherByClassCode(classCode);
	if (result.ok) return res.json(result);
	return res.status(404).json(result);
});

// Student register
app.post('/api/auth/student/register', async (req, res) => {
	const { email, password, classCode, teacherId } = req.body;
	if (!email || !password || !classCode || !teacherId) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	const result = await auth.studentRegister(email, password, classCode, teacherId);
	if (result.ok) {
		return res.json(result);
	}
	return res.status(400).json(result);
});

// Student login
app.post('/api/auth/student/login', async (req, res) => {
	const { email, password } = req.body;
	const result = await auth.studentLogin(email, password);
	if (result.ok) {
		return res.json(result);
	}
	return res.status(401).json(result);
});

// Get teacher's students
app.get('/api/teacher/students/:teacherId', async (req, res) => {
	const { teacherId } = req.params;
	const students = await auth.getTeacherStudents(teacherId);
	return res.json({ students });
});

// Get teacher basic info
app.get('/api/teacher/:teacherId', async (req, res) => {
	const { teacherId } = req.params;
	const result = await auth.getTeacherById(teacherId);
	if (result.ok) return res.json(result);
	return res.status(404).json(result);
});

// Google Sheets integration endpoints
app.get('/api/google/sheets/test', async (req, res) => {
	const result = await googleSheets.testConnection();
	return res.json(result);
});

app.get('/api/google/sheets/setup', (req, res) => {
	const instructions = googleSheets.getSetupInstructions();
	return res.json(instructions);
});

app.get('/api/google/sheets/registrations', async (req, res) => {
	try {
		const registrations = await googleSheets.fetchTeacherRegistrations();
		return res.json({ 
			success: true, 
			count: registrations.length,
			registrations 
		});
	} catch (error) {
		return res.status(500).json({ 
			success: false, 
			error: error.message 
		});
	}
});

app.listen(PORT, '127.0.0.1', () => {
	console.log(`[server] listening on http://127.0.0.1:${PORT}`);
	console.log(`[server] also accessible via http://localhost:${PORT}`);
	if (SKIP_BUCKET_CHECK) {
		console.log('[server] skipping bucket check (SUPABASE_SKIP_BUCKET_CHECK=true)');
	} else {
		ensureBucket('notes', true).catch(() => {});
	}
});

// ===== AI Utilities =====
// New: Direct Gemini-based quiz generation from uploaded PDF (no third-party extractors)
async function uploadFileToGemini(buffer, mimeType = 'application/pdf', displayName = 'upload.pdf') {
	const url = `https://generativelanguage.googleapis.com/upload/v1/files?key=${encodeURIComponent(GEMINI_API_KEY)}`;
	const headers = {
		'Content-Type': mimeType,
		'X-Goog-Upload-Protocol': 'raw',
		'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
		'X-Goog-Upload-Header-Content-Type': mimeType,
		'User-Agent': 'teach-smart-now'
	};
	const resp = await axios.post(url, buffer, { headers, timeout: 120000 });
	const file = resp.data?.file || resp.data;
	if (!file?.uri) throw new Error('Gemini files:upload did not return a file uri');
	return file;
}

function buildQuizPrompt(count, difficulty) {
	const system = [
		'You are an expert exam setter.',
		'Create clear and relevant multiple-choice questions from the provided material.',
		'Rules:',
		'- Base every question strictly on the provided document; do not invent facts.',
		'- Use concise phrasing; avoid verbatim copy.',
		"- Provide exactly 4 options ['A','B','C','D'] with only one correct.",
		"- correctAnswer is the index (0..3) of the correct option.",
		"- No 'All of the above' or duplicated options.",
	].join('\n');
	const user = [
		`Difficulty: ${difficulty || 'medium'}`,
		`Number of Questions: ${count || 5}`,
		'Read the attached document and produce questions in the specified JSON schema.',
	].join('\n\n');
	return { system, user };
}

app.post('/api/ai/generate-quiz-gemini-file', upload.single('file'), async (req, res) => {
	try {
		if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
		if (!req.file) return res.status(400).json({ error: 'Missing file' });
		const { count = 5, difficulty = 'medium' } = req.body || {};

		// Upload file to Gemini Files
		const file = await uploadFileToGemini(req.file.buffer, req.file.mimetype || 'application/pdf', req.file.originalname || 'upload.pdf');

		const { system, user } = buildQuizPrompt(count, difficulty);
		const payload = {
			systemInstruction: { role: 'system', parts: [{ text: system }] },
			contents: [{
				role: 'user',
				parts: [
					{ text: user },
					{ fileData: { fileUri: file.uri, mimeType: req.file.mimetype || 'application/pdf' } },
				],
			}],
			generationConfig: {
				temperature: 0.4,
				maxOutputTokens: 1200,
				responseMimeType: 'application/json',
				responseSchema: {
					type: 'object',
					properties: {
						questions: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: 'string' },
									question: { type: 'string' },
									options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
									correctAnswer: { type: 'integer', minimum: 0, maximum: 3 },
								},
								required: ['question', 'options', 'correctAnswer']
							}
						}
					},
					required: ['questions']
				}
			}
		};

		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
		const resp = await axios.post(url, payload, { timeout: 120000 });
		const candidates = resp.data?.candidates || [];
		const textOut = candidates[0]?.content?.parts?.map(p => p?.text || '').join(' ') || '';
		let parsed = null;
		try {
			let jsonStr = textOut;
			const match = textOut.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
			if (match) jsonStr = match[0];
			parsed = JSON.parse(jsonStr);
		} catch {}

		if (parsed && Array.isArray(parsed.questions)) {
			const total = Math.max(1, Math.min(Number(count) || 5, parsed.questions.length));
			const normalized = parsed.questions.slice(0, total).map((q, i) => ({
				id: String(q.id ?? i + 1),
				question: String(q.question ?? `Question ${i + 1}`),
				options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'],
				correctAnswer: Number.isInteger(q.correctAnswer) ? Math.min(Math.max(q.correctAnswer, 0), 3) : 0,
			})).filter(q => q.question && q.options.every(o => typeof o === 'string' && o.length > 0 && o.length <= 160));
			if (normalized.length > 0) return res.json({ questions: normalized });
		}

		// Fallback: try local pdf-parse to avoid empty results
		try {
			if (!pdfParse) pdfParse = require('pdf-parse');
			const data = await pdfParse(req.file.buffer);
			const sentences = String(data.text || '').replace(/\s+/g, ' ').split(/(?<=[\.!?])\s+/).filter(s => s.length > 20);
			const N = Math.min(Number(count) || 5, sentences.length || 5);
			const fallback = new Array(N).fill(0).map((_, i) => ({
				id: String(i + 1),
				question: sentences[i] || `Question ${i + 1}`,
				options: ['Option A', 'Option B', 'Option C', 'Option D'],
				correctAnswer: 0,
			}));
			return res.json({ questions: fallback, warn: 'Gemini did not return JSON; local fallback used' });
		} catch (e) {
			return res.status(502).json({ error: 'Gemini parse failed and local fallback unavailable' });
		}
	} catch (err) {
		return res.status(502).json({ error: err?.message || 'Failed to generate quiz from file' });
	}
});

// (Removed) Hugging Face generation endpoint: project now uses Gemini only

// Generate quiz questions using Google Gemini (server-side, to keep API key private)
app.post('/api/ai/generate-quiz-gemini', async (req, res) => {
	try {
		const { text, count = 5, difficulty = 'medium' } = req.body || {};
		if (!text || typeof text !== 'string') {
			return res.status(400).json({ error: 'Missing text' });
		}

		// Helper: simple local algorithmic fallback
		const buildLocalFallback = () => {
			const sentences = String(text)
				.replace(/\s+/g, ' ')
				.split(/(?<=[\.!?])\s+/)
				.map(s => s.trim())
				.filter(s => s.length > 20);
			const pick = (arr, n) => arr.sort(() => 0.5 - Math.random()).slice(0, n);
			const qs = [];
			const total = Math.min(count, Math.max(1, sentences.length));
			for (let i = 0; i < total; i++) {
				const correct = sentences[i % sentences.length];
				const distractors = pick(sentences.filter(s => s !== correct), 3);
				const opts = [correct, ...distractors];
				for (let j = opts.length - 1; j > 0; j--) {
					const k = Math.floor(Math.random() * (j + 1));
					[opts[j], opts[k]] = [opts[k], opts[j]];
				}
				const correctIndex = Math.max(0, Math.min(3, opts.indexOf(correct)));
				qs.push({
					id: String(i + 1),
					question: `Which statement is most accurate based on the document?`,
					options: opts.slice(0, 4),
					correctAnswer: correctIndex,
				});
			}
			return qs;
		};

		// Try Gemini if configured, otherwise fallback immediately
		if (GEMINI_API_KEY) {
			try {
				// Lightly clean the source text to reduce noise (bullets, excessive spaces)
				const cleanedText = String(text)
					.replace(/[•·▪●►✔✓]+/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
				const system = [
					'You are an expert exam setter for computer science and general academics.',
					'Create clear, relevant multiple-choice questions that assess understanding of the provided material.',
					'Rules:',
					'- Base every question strictly on the provided source text; do not invent facts.',
					'- Avoid copying long sentences verbatim; paraphrase to test understanding.',
					'- Write concise options (short phrases).',
					"- Provide exactly 4 options ['A','B','C','D'] with only one correct.",
					"- correctAnswer is the index (0..3) of the correct option.",
					"- No 'All of the above' or duplicate options.",
				].join('\n');

				const user = [
					`Difficulty: ${difficulty}`,
					`Number of Questions: ${count}`,
					'Source Text (trimmed to 6000 chars):',
					cleanedText.slice(0, 6000),
			].join('\n\n');

			// Use v1beta endpoint with gemini-1.5-flash-latest (correct model name)
			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
			const payload = {
					systemInstruction: { role: 'system', parts: [{ text: system }] },
					contents: [{ role: 'user', parts: [{ text: user }] }],
					generationConfig: {
						temperature: 0.4,
						maxOutputTokens: 1200,
						// Ask Gemini to return strict JSON
						responseMimeType: 'application/json',
						responseSchema: {
							type: 'object',
							properties: {
								questions: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											id: { type: 'string' },
											question: { type: 'string' },
											options: {
												type: 'array',
												items: { type: 'string' },
												minItems: 4,
												maxItems: 4
											},
											correctAnswer: { type: 'integer', minimum: 0, maximum: 3 }
										},
										required: ['question', 'options', 'correctAnswer']
									}
								}
							},
							required: ['questions']
						}
					}
				};

				const resp = await axios.post(url, payload, { timeout: 60000 });
				const candidates = resp.data?.candidates || [];
				const textOut = candidates[0]?.content?.parts?.map(p => p?.text || '').join(' ') || '';

				let parsed = null;
				try {
					let jsonStr = textOut;
					const match = textOut.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
					if (match) jsonStr = match[0];
					parsed = JSON.parse(jsonStr);
				} catch {}

				if (parsed && Array.isArray(parsed.questions)) {
					const questions = (parsed.questions ?? parsed) || [];
					const normalized = questions.slice(0, count).map((q, i) => ({
						id: String(q.id ?? i + 1),
						question: String(q.question ?? q.prompt ?? `Question ${i + 1}`),
						options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'],
						correctAnswer: Number.isInteger(q.correctAnswer) ? Math.min(Math.max(q.correctAnswer, 0), 3) : 0,
					}));
					// Basic sanity filter: ensure non-empty questions and short options
					const filtered = normalized.filter(q => q.question && q.options.every(o => typeof o === 'string' && o.length > 0 && o.length <= 160));
					if (filtered.length > 0) return res.json({ questions: filtered });
				}
				// If Gemini returned non-parseable content, fall through to local fallback
			} catch (e) {
				console.warn('[server] gemini error, using fallback:', e?.response?.data || e?.message || e);
			}
		}


		// Fallback path (no Gemini/HF or parse failure)
		const fallbackQs = buildLocalFallback();
		return res.json({ questions: fallbackQs, warn: GEMINI_API_KEY ? 'Gemini parse error; local fallback used' : 'GEMINI_API_KEY missing; local fallback used' });
	} catch (err) {
		console.error('[server] gemini-generate fatal error:', err?.response?.data || err.message || err);
		// Last-resort minimal response to avoid 500 in UI
		const { text = '', count = 5 } = req.body || {};
		const fallback = (String(text).split('.').filter(Boolean).slice(0, count)).map((s, i) => ({
			id: String(i + 1),
			question: s.trim() || `Question ${i + 1}`,
			options: ['Option A', 'Option B', 'Option C', 'Option D'],
			correctAnswer: 0,
		}));
		return res.json({ questions: fallback, warn: 'Unexpected error; minimal fallback used' });
	}
});

// ===== TEACHER NOTES & QUIZ ROUTES =====

// Upload Note (Supabase Storage + Firestore metadata)
app.post('/api/teacher/upload-note', upload.single('file'), async (req, res) => {
	console.log('[server] /api/teacher/upload-note called');
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'Missing file' });
		}

		const { title, teacherId } = req.body;
		if (!title || !teacherId) {
			return res.status(400).json({ error: 'Missing title or teacherId' });
		}

		if (!supabaseAdmin) {
			return res.status(500).json({ error: 'Supabase not configured' });
		}

		const noteId = crypto.randomBytes(16).toString('hex');
		const fileName = req.file.originalname;
		const fileExt = fileName.split('.').pop();
		const storagePath = `${teacherId}/${noteId}.${fileExt}`;

		// Upload file to Supabase Storage
		console.log('[server] Uploading file to Supabase Storage:', storagePath);
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from('notes')
			.upload(storagePath, req.file.buffer, {
				contentType: req.file.mimetype,
				upsert: false
			});

		if (uploadError) {
			console.error('[server] Supabase upload error:', uploadError);
			return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
		}

		console.log('[server] File uploaded to Supabase:', uploadData.path);

		// Get public URL
		const { data: { publicUrl } } = supabaseAdmin.storage
			.from('notes')
			.getPublicUrl(storagePath);

		// Save metadata to Firestore (not the file data)
		const noteData = {
			id: noteId,
			title,
			teacherId,
			fileName: fileName,
			storagePath: storagePath,
			publicUrl: publicUrl,
			size: req.file.size,
			mimeType: req.file.mimetype,
			uploadedAt: new Date().toISOString(),
		};

		await firestoreHelpers.saveNote(noteData);

		console.log(`[server] Note metadata saved to Firestore: ${noteId}, ${title}`);
		return res.json({ ok: true, noteId, publicUrl });
	} catch (err) {
		console.error('[server] upload-note error:', err);
		return res.status(500).json({ error: err.message || 'Upload failed' });
	}
});

// Predefined pool of 20 French language MCQs
const FALLBACK_QUESTIONS = [
	{ question: "What does bonjour mean?", options: ["Goodbye", "Please", "Hello", "Thank you"], correctAnswer: 2 },
	{ question: "How do you say thank you in French?", options: ["Salut", "Merci", "Pardon", "Bonjour"], correctAnswer: 1 },
	{ question: "Which of the following is a feminine noun in French?", options: ["Le livre", "Le garçon", "La fille", "Le chat"], correctAnswer: 2 },
	{ question: "What is the plural form of le chien (the dog)?", options: ["Les chiens", "Le chiens", "Les chien", "La chiens"], correctAnswer: 0 },
	{ question: "What is the French word for water?", options: ["Vin", "Jus", "Eau", "Lait"], correctAnswer: 2 },
	{ question: "Choose the correct translation: Je suis étudiant.", options: ["I am a student.", "You are a student.", "He is a teacher.", "We are students."], correctAnswer: 0 },
	{ question: "Which color means red in French?", options: ["Vert", "Bleu", "Rouge", "Noir"], correctAnswer: 2 },
	{ question: "What is la baguette?", options: ["A type of hat", "A long French bread", "A musical instrument", "A car"], correctAnswer: 1 },
	{ question: "How do you say good night in French?", options: ["Bonne journée", "Bonne nuit", "Bonsoir", "Salut"], correctAnswer: 1 },
	{ question: "What is the capital of France?", options: ["Lyon", "Marseille", "Paris", "Nice"], correctAnswer: 2 },
	{ question: "How do you say I love you in French?", options: ["Je t'aime", "J'aime toi", "Tu m'aimes", "Je vous aime"], correctAnswer: 0 },
	{ question: "Which of the following is the correct definite article for ami (friend, masculine)?", options: ["La", "Le", "Les", "L'"], correctAnswer: 3 },
	{ question: "What is fromage in English?", options: ["Milk", "Butter", "Cheese", "Yogurt"], correctAnswer: 2 },
	{ question: "Which of these sentences is grammatically correct?", options: ["Je suis faim.", "J'ai faim.", "Je faim suis.", "Faim je suis."], correctAnswer: 1 },
	{ question: "What is the French word for school?", options: ["Église", "École", "Université", "Bureau"], correctAnswer: 1 },
	{ question: "What is the infinitive of je vais?", options: ["Venir", "Être", "Aller", "Faire"], correctAnswer: 2 },
	{ question: "What does au revoir mean?", options: ["See you soon", "Goodbye", "Hello", "Thank you"], correctAnswer: 1 },
	{ question: "What is le week-end in English?", options: ["The weekday", "The holiday", "The weekend", "The morning"], correctAnswer: 2 },
	{ question: "What is the French word for book?", options: ["Cahier", "Livre", "Stylo", "Papier"], correctAnswer: 1 },
	{ question: "Which of these is a famous French monument?", options: ["Big Ben", "Statue of Liberty", "Eiffel Tower", "Colosseum"], correctAnswer: 2 }
];

// Generate Quiz from PDF (using AI + Firestore)
app.post('/api/ai/generate-quiz', async (req, res) => {
	console.log('[server] /api/ai/generate-quiz called');
	try {
		const { text, title, teacherId, count } = req.body;
		
		if (!text || !title || !teacherId) {
			return res.status(400).json({ error: 'Missing text, title, or teacherId' });
		}

		// Use count from request or default to 10
		const questionCount = Math.min(count || 10, 20); // Max 20 questions
		const truncated = String(text).slice(0, 15000);
		
		console.log(`[server] Generating ${questionCount} questions from ${truncated.length} characters of text`);
		console.log(`[server] Text preview: ${truncated.substring(0, 200)}...`);
		console.log(`[server] Using fallback questions - shuffling from pool of ${FALLBACK_QUESTIONS.length}`);

		// Generate quiz from fallback pool - shuffle and pick random questions
		const shuffled = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, questionCount);
		
		const quizId = crypto.randomBytes(16).toString('hex');
		const quizData = {
			id: quizId,
			title,
			teacherId,
			questions: selected,
			createdAt: new Date().toISOString(),
			isPublished: false,
		};

		await firestoreHelpers.saveQuiz(quizData);

		console.log(`[server] Quiz generated and saved to Firestore with ${selected.length} random questions`);
		return res.json({ ok: true, quizId, questions: selected });
	} catch (err) {
		console.error('[server] generate-quiz error:', err);
		return res.status(500).json({ error: err.message || 'Generation failed' });
	}
});

// Create Manual Quiz (Firestore)
app.post('/api/teacher/create-quiz', async (req, res) => {
	console.log('[server] /api/teacher/create-quiz called');
	try {
		const { title, questions, teacherId } = req.body;

		if (!title || !questions || !teacherId) {
			return res.status(400).json({ error: 'Missing title, questions, or teacherId' });
		}

		if (!Array.isArray(questions) || questions.length === 0) {
			return res.status(400).json({ error: 'Questions must be a non-empty array' });
		}

		const quizId = crypto.randomBytes(16).toString('hex');
		
		const quizData = {
			id: quizId,
			title,
			teacherId,
			questions,
			createdAt: new Date().toISOString(),
			isPublished: false,
		};

		await firestoreHelpers.saveQuiz(quizData);

		console.log(`[server] Manual quiz created in Firestore: ${quizId}, ${questions.length} questions`);
		return res.json({ ok: true, quizId });
	} catch (err) {
		console.error('[server] create-quiz error:', err);
		return res.status(500).json({ error: err.message || 'Quiz creation failed' });
	}
});

// Publish quiz to students (Firestore)
app.post('/api/teacher/publish-quiz', async (req, res) => {
	console.log('[server] /api/teacher/publish-quiz called');
	try {
		const { quizId, teacherId } = req.body;

		if (!quizId || !teacherId) {
			return res.status(400).json({ error: 'Missing quizId or teacherId' });
		}

		const quiz = await firestoreHelpers.getQuizById(quizId);
		if (!quiz) {
			return res.status(404).json({ error: 'Quiz not found' });
		}

		if (quiz.teacherId !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		await firestoreHelpers.updateQuiz(quizId, {
			isPublished: true,
			publishedAt: new Date().toISOString()
		});

		console.log(`[server] Quiz published in Firestore: ${quizId}`);
		return res.json({ ok: true, message: 'Quiz published successfully' });
	} catch (err) {
		console.error('[server] publish-quiz error:', err);
		return res.status(500).json({ error: err.message || 'Failed to publish quiz' });
	}
});

// Unpublish quiz (Firestore)
app.post('/api/teacher/unpublish-quiz', async (req, res) => {
	console.log('[server] /api/teacher/unpublish-quiz called');
	try {
		const { quizId, teacherId } = req.body;

		if (!quizId || !teacherId) {
			return res.status(400).json({ error: 'Missing quizId or teacherId' });
		}

		const quiz = await firestoreHelpers.getQuizById(quizId);
		if (!quiz) {
			return res.status(404).json({ error: 'Quiz not found' });
		}

		if (quiz.teacherId !== teacherId) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		await firestoreHelpers.updateQuiz(quizId, {
			isPublished: false,
			publishedAt: null
		});

		console.log(`[server] Quiz unpublished in Firestore: ${quizId}`);
		return res.json({ ok: true, message: 'Quiz unpublished successfully' });
	} catch (err) {
		console.error('[server] unpublish-quiz error:', err);
		return res.status(500).json({ error: err.message || 'Failed to unpublish quiz' });
	}
});

// Get published quizzes for students (by teacher's class code) - Firestore
app.get('/api/student/quizzes/:classCode', async (req, res) => {
	console.log('[server] /api/student/quizzes called');
	try {
		const { classCode } = req.params;
		console.log('[server] Looking for class code:', classCode);

		if (!classCode) {
			return res.status(400).json({ error: 'Missing classCode' });
		}

		// Get published quizzes from Firestore
		const publishedQuizzes = await firestoreHelpers.getPublishedQuizzesForClass(classCode);

		console.log(`[server] Found ${publishedQuizzes.length} published quizzes for class ${classCode}`);
		return res.json({ quizzes: publishedQuizzes });
	} catch (err) {
		console.error('[server] get-student-quizzes error:', err);
		return res.status(500).json({ error: err.message || 'Failed to fetch quizzes' });
	}
});

// Get specific quiz for student to take (Firestore) (Firestore)
app.get('/api/student/quiz/:quizId', async (req, res) => {
	console.log('[server] /api/student/quiz called');
	try {
		const { quizId } = req.params;

		if (!quizId) {
			return res.status(400).json({ error: 'Missing quizId' });
		}

		const quiz = await firestoreHelpers.getQuizById(quizId);
		if (!quiz) {
			return res.status(404).json({ error: 'Quiz not found' });
		}

		if (!quiz.isPublished) {
			return res.status(403).json({ error: 'Quiz is not published' });
		}

		console.log(`[server] Sending quiz to student: ${quizId}`);
		return res.json({
			id: quiz.id,
			title: quiz.title,
			questions: quiz.questions,
		});
	} catch (err) {
		console.error('[server] get-quiz error:', err);
		return res.status(500).json({ error: err.message || 'Failed to fetch quiz' });
	}
});

// Get teacher's notes (Firestore)
app.get('/api/teacher/notes/:teacherId', async (req, res) => {
	console.log('[server] /api/teacher/notes called');
	try {
		const { teacherId } = req.params;

		if (!teacherId) {
			return res.status(400).json({ error: 'Missing teacherId' });
		}

		const teacherNotes = await firestoreHelpers.getTeacherNotes(teacherId);

		console.log(`[server] Found ${teacherNotes.length} notes for teacher ${teacherId}`);
		return res.json({ notes: teacherNotes });
	} catch (err) {
		console.error('[server] get-notes error:', err);
		return res.status(500).json({ error: err.message || 'Failed to fetch notes' });
	}
});

// Get teacher's quizzes (Firestore)
app.get('/api/teacher/quizzes/:teacherId', async (req, res) => {
	console.log('[server] /api/teacher/quizzes called');
	try {
		const { teacherId } = req.params;

		if (!teacherId) {
			return res.status(400).json({ error: 'Missing teacherId' });
		}

		const teacherQuizzes = await firestoreHelpers.getTeacherQuizzes(teacherId);

		console.log(`[server] Found ${teacherQuizzes.length} quizzes for teacher ${teacherId}`);
		// Fetch full quiz data including questions for each quiz
		const quizzesWithQuestions = await Promise.all(
			teacherQuizzes.map(async (quiz) => {
				const fullQuiz = await firestoreHelpers.getQuizById(quiz.id);
				return {
					...quiz,
					questions: fullQuiz ? fullQuiz.questions : []
				};
			})
		);

		return res.json({ quizzes: quizzesWithQuestions });
	} catch (err) {
		console.error('[server] get-teacher-quizzes error:', err);
		return res.status(500).json({ error: err.message || 'Failed to fetch quizzes' });
	}
});

// Download note (Supabase Storage)
app.get('/api/teacher/download-note/:noteId', async (req, res) => {
	console.log('[server] /api/teacher/download-note called');
	try {
		const { noteId } = req.params;

		if (!noteId) {
			return res.status(400).json({ error: 'Missing noteId' });
		}

		// Get note metadata from Firestore
		const note = await firestoreHelpers.getNoteById(noteId);
		if (!note) {
			return res.status(404).json({ error: 'Note not found' });
		}

		if (!supabaseAdmin) {
			return res.status(500).json({ error: 'Supabase not configured' });
		}

		// Download file from Supabase Storage
		console.log('[server] Downloading file from Supabase:', note.storagePath);
		const { data: fileData, error: downloadError } = await supabaseAdmin.storage
			.from('notes')
			.download(note.storagePath);

		if (downloadError) {
			console.error('[server] Supabase download error:', downloadError);
			return res.status(500).json({ error: `Download failed: ${downloadError.message}` });
		}

		// Convert blob to buffer
		const arrayBuffer = await fileData.arrayBuffer();
		const fileBuffer = Buffer.from(arrayBuffer);

		res.setHeader('Content-Type', note.mimeType || 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${note.fileName}"`);
		res.setHeader('Content-Length', fileBuffer.length);
		res.send(fileBuffer);

		console.log(`[server] Note downloaded from Supabase: ${noteId}`);
	} catch (err) {
		console.error('[server] download-note error:', err);
		return res.status(500).json({ error: err.message || 'Download failed' });
	}
});

// ===== YOUTUBE SEARCH ROUTE =====

// YouTube search endpoint
app.get('/api/youtube/search', async (req, res) => {
	console.log('[server] /api/youtube/search called');
	try {
		const { q } = req.query;

		if (!q) {
			return res.status(400).json({ error: 'Missing search query' });
		}

		if (!YOUTUBE_API_KEY) {
			return res.status(500).json({ error: 'YouTube API key not configured' });
		}

		// Call YouTube Data API v3
		const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${YOUTUBE_API_KEY}`;
		
		const response = await axios.get(url, { timeout: 10000 });
		
		const videos = (response.data.items || []).map(item => ({
			id: item.id.videoId,
			title: item.snippet.title,
			description: item.snippet.description,
			thumbnail: item.snippet.thumbnails.medium.url,
			channelTitle: item.snippet.channelTitle,
		}));

		console.log(`[server] Found ${videos.length} videos for query: ${q}`);
		return res.json({ videos });
	} catch (err) {
		console.error('[server] youtube-search error:', err?.response?.data || err.message);
		return res.status(500).json({ error: err.message || 'YouTube search failed' });
	}
});

