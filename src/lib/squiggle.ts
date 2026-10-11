// Hand-drawn scribbles for crossing things out, drawn on a grid of chunky pixels.

import { bitmapPath } from './icons.ts';

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
 * between uneven peaks about every 12px, starting and ending either way, a slight drift up or down, and ends that
 * overshoot a little.
 */
function zigzag(rand: () => number, width: number, height: number): [number, number][] {
	const mid = height / 2;
	const amp = height * 0.36;
	// A coin flip for which way the first stroke heads, and another for adding a peak,
	// so rows start and finish heading up or down independently.
	const flip = rand() < 0.5 ? 1 : -1;
	const points = Math.max(12, Math.round(width / 12)) + (rand() < 0.5 ? 1 : 0);
	const step = width / points;
	const drift = (rand() - 0.5) * height * 0.25;
	const pts: [number, number][] = [[-2 - rand() * 4, mid + (rand() - 0.5) * 3]];
	for (let i = 1; i <= points; i++) {
		const up = (i % 2 === 0 ? 1 : -1) * flip;
		// Uneven spacing and peak heights so it looks dashed off by hand.
		const x = i * step + (rand() - 0.5) * step * 0.6 + (i === points ? 3 + rand() * 4 : 0);
		const y = mid + drift * (i / points) + up * amp * (0.55 + rand() * 0.5);
		pts.push([x, y]);
	}
	return pts;
}

export interface PixelScribble {
	/** Top-left of the bitmap in pixels, relative to the box (the ends can overshoot it). */
	x: number;
	y: number;
	cols: number;
	rows: number;
	/** Solid cells, and a sprinkle of fainter ones for a bit of pencil grain (both in cell units). */
	ink: string;
	grain: string;
}

/**
 * The same zigzag snapped to a grid of `cell`-sized pixels, one pixel thick, with the
 * strokes stepped like pixel-art lines. The same key always gives the same scribble.
 */
export function pixelSquiggle(key: string, width: number, height: number, cell = 3): PixelScribble {
	const rand = mulberry32(hash(key));
	const pts = zigzag(rand, width, height).map(([x, y]) => [Math.round(x / cell), Math.round(y / cell)]);
	const cells = new Map<string, [number, number]>();
	for (let i = 1; i < pts.length; i++) {
		// Bresenham between consecutive points.
		let [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const dx = Math.abs(x1 - x0);
		const dy = -Math.abs(y1 - y0);
		const sx = x0 < x1 ? 1 : -1;
		const sy = y0 < y1 ? 1 : -1;
		let err = dx + dy;
		for (;;) {
			cells.set(`${x0},${y0}`, [x0, y0]);
			if (x0 === x1 && y0 === y1) break;
			const e2 = 2 * err;
			if (e2 >= dy) {
				err += dy;
				x0 += sx;
			}
			if (e2 <= dx) {
				err += dx;
				y0 += sy;
			}
		}
	}
	const all = [...cells.values()];
	const minX = Math.min(...all.map(([x]) => x));
	const minY = Math.min(...all.map(([, y]) => y));
	const cols = Math.max(...all.map(([x]) => x)) - minX + 1;
	const rows = Math.max(...all.map(([, y]) => y)) - minY + 1;
	const blank = () => Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
	const ink = blank();
	const grain = blank();
	for (const [x, y] of all) (rand() < 0.15 ? grain : ink)[y - minY][x - minX] = '#';
	const path = (g: string[][]) => bitmapPath(g.map((r) => r.join('')));
	return { x: minX * cell, y: minY * cell, cols, rows, ink: path(ink), grain: path(grain) };
}
