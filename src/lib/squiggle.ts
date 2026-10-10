// Hand-drawn scribbles for crossing things out, in a 100×20 box.

function mulberry32(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hash(s: string): number {
	let h = 0;
	for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
	return h;
}

/**
 * A jagged pencil zigzag across a `width`×`height` box (in pixels): straight strokes
 * between uneven peaks about every 9px, a slight drift up or down, and ends that
 * overshoot a little. The same key always gives the same scribble.
 */
export function squiggle(key: string, width: number, height: number): string {
	const rand = mulberry32(hash(key));
	const mid = height / 2;
	const amp = height * 0.42;
	const points = Math.max(12, Math.round(width / 9));
	const step = width / points;
	const drift = (rand() - 0.5) * height * 0.25;
	let d = `M${(-2 - rand() * 4).toFixed(1)} ${(mid + (rand() - 0.5) * 3).toFixed(1)}`;
	for (let i = 1; i <= points; i++) {
		const up = i % 2 === 0 ? 1 : -1;
		// Uneven spacing and peak heights so it looks dashed off by hand.
		const x = i * step + (rand() - 0.5) * step * 0.6 + (i === points ? 3 + rand() * 4 : 0);
		const y = mid + drift * (i / points) + up * amp * (0.55 + rand() * 0.5);
		d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
	}
	return d;
}
