import { useState } from 'react';
import { backend } from '@/lib/backend';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Check = {
	name: string;
	status: 'idle' | 'ok' | 'fail';
	detail?: string;
};

export default function BackendTest() {
	const [checks, setChecks] = useState<Check[]>([
		{ name: 'Backend /api/health', status: 'idle' },
		{ name: 'Backend /api/debug/env', status: 'idle' },
		{ name: 'Firestore read: notes', status: 'idle' },
		{ name: 'Firestore read: quizzes', status: 'idle' },
		{ name: 'Supabase getPublicUrl (first note)', status: 'idle' },
		{ name: 'YouTube API (1 result)', status: 'idle' },
	]);
	const [running, setRunning] = useState(false);

	const run = async () => {
		setRunning(true);
		const update = (index: number, patch: Partial<Check>) =>
			setChecks((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

		// 0: /api/health
		{
			const r = await backend.health();
			update(0, r.ok ? { status: 'ok' } : { status: 'fail', detail: r.error });
		}

		// 1: /api/debug/env
		{
			const r = await backend.debugEnv();
			if (r.ok) {
				const { HAS_SERVICE_ROLE, HAS_GEMINI } = r.data;
				update(1, {
					status: 'ok',
					detail: `serviceRole:${HAS_SERVICE_ROLE} gemini:${HAS_GEMINI}`,
				});
			} else update(1, { status: 'fail', detail: r.error });
		}

		// Gather first note path for Supabase URL test
		let firstNotePath: string | null = null;

		// 2: Firestore notes
		try {
			const snap = await getDocs(collection(db, 'notes'));
			const count = snap.size;
			if (count > 0) {
				const d = snap.docs[0].data() as { path?: string; name?: string };
				firstNotePath = String(d.path || d.name || '');
			}
			update(2, { status: 'ok', detail: `count=${count}` });
		} catch (e) {
			update(2, { status: 'fail', detail: (e as Error)?.message });
		}

		// 3: Firestore quizzes
		try {
			const snap = await getDocs(collection(db, 'quizzes'));
			update(3, { status: 'ok', detail: `count=${snap.size}` });
		} catch (e) {
			update(3, { status: 'fail', detail: (e as Error)?.message });
		}

		// 4: Supabase public URL for first note
		try {
			if (firstNotePath) {
				const { data } = supabase.storage.from('notes').getPublicUrl(firstNotePath);
				update(4, { status: 'ok', detail: data?.publicUrl ? 'url:ok' : 'no-url' });
			} else {
				update(4, { status: 'ok', detail: 'no notes' });
			}
		} catch (e) {
			update(4, { status: 'fail', detail: (e as Error)?.message });
		}

		// 5: YouTube API minimal check (best-effort; may fail due to quota)
			try {
				// Use the same API key string as StudentDashboard if present; otherwise this check may fail (expected)
				const key = '';
				const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=education&type=video&key=${encodeURIComponent(key)}`;
			const res = await fetch(url);
			if (res.ok) update(5, { status: 'ok' });
			else update(5, { status: 'fail', detail: `${res.status}` });
		} catch (e) {
			update(5, { status: 'fail', detail: (e as Error)?.message });
		}

		setRunning(false);
	};

	const color = (s: Check['status']) =>
		s === 'ok' ? 'text-green-600' : s === 'fail' ? 'text-red-600' : 'text-muted-foreground';

	return (
		<Card className="ml-4 border-dashed border-2">
			<CardContent className="py-3">
				<div className="flex items-center gap-3">
					<Button size="sm" onClick={run} disabled={running}>
						{running ? 'Running…' : 'Run checks'}
					</Button>
					<ul className="text-sm space-y-1">
						{checks.map((c) => (
							<li key={c.name} className={color(c.status)}>
								{c.name}: {c.status}
								{c.detail ? <span className="text-xs text-muted-foreground"> — {c.detail}</span> : null}
							</li>
						))}
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
