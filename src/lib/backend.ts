// Lightweight client wrappers for backend API endpoints proxied at /api
// All functions return a tuple { ok, data?, error? } to avoid throwing in UI flows

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function getJson<T>(url: string): Promise<ApiResult<T>> {
	try {
		const res = await fetch(url, { credentials: 'same-origin' });
		if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText}` };
		const data = (await res.json()) as T;
		return { ok: true, data };
	} catch (e) {
		return { ok: false, error: (e as Error)?.message || 'network error' };
	}
}

async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			credentials: 'same-origin',
		});
		if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText}` };
		const data = (await res.json()) as T;
		return { ok: true, data };
	} catch (e) {
		return { ok: false, error: (e as Error)?.message || 'network error' };
	}
}

export const backend = {
	health: () => getJson<{ ok: boolean }>(`/api/health`),
	debugEnv: () => getJson<{ PORT: number; SUPABASE_URL: string; HAS_SERVICE_ROLE: boolean; HAS_GEMINI: boolean }>(`/api/debug/env`),
	storage: {
		publicUrl: (bucket: string, path: string) => getJson<{ publicUrl: string }>(`/api/storage/public-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`),
		signedDownload: (bucket: string, path: string, expiresInSec = 3600) => getJson<{ signedUrl: string; expiresIn: number }>(`/api/storage/signed-download?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expiresIn=${expiresInSec}`),
		signedUpload: (bucket: string, path: string) => postJson<{ bucket: string; path: string; token: string; signedUrl: string }>(`/api/storage/signed-upload`, { bucket, path }),
	},
	ai: {
			extractText: async (file: File): Promise<ApiResult<{ text: string }>> => {
				// Use multipart route exclusively
				try {
					const form = new FormData();
					form.append('file', file);
					const res = await fetch('/api/ai/extract-text', { method: 'POST', body: form, credentials: 'same-origin' });
					if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText}` };
					const data = (await res.json()) as { text: string };
					return { ok: true, data };
				} catch (e) {
					return { ok: false, error: (e as Error)?.message || 'network error' };
				}
			},
			generateQuizGemini: (payload: { text: string; count?: number; difficulty?: string }) =>
				postJson<{ questions: Array<{ id: string; question: string; options: string[]; correctAnswer: number }> }>(`/api/ai/generate-quiz-gemini`, payload),
	},
};

export default backend;
