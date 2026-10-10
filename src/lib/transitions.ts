import type { TransitionConfig } from 'svelte/transition';

const reduced = () =>
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Quantise progress so motion moves in visible "frames", like a sprite. */
const step = (t: number, frames: number) => Math.round(t * frames) / frames;

/** Reveal top-to-bottom in chunky steps. */
export function wipe(_node: Element, { delay = 0, duration = 320, frames = 8 } = {}): TransitionConfig {
	if (reduced()) return { duration: 0 };
	return {
		delay,
		duration,
		css: (t) => `clip-path: inset(0 0 ${(1 - step(t, frames)) * 100}% 0)`
	};
}

/** Slide vertically by whole pixels-ish, for things being swapped in and out. */
export function slot(_node: Element, { delay = 0, duration = 260, y = 24, frames = 6 } = {}): TransitionConfig {
	if (reduced()) return { duration: 0 };
	return {
		delay,
		duration,
		css: (t) => {
			const s = step(t, frames);
			return `transform: translateY(${(1 - s) * y}px); opacity: ${s < 0.34 ? 0 : 1}`;
		}
	};
}

/** Pop in from small, stepped. */
export function pop(_node: Element, { delay = 0, duration = 180 } = {}): TransitionConfig {
	if (reduced()) return { duration: 0 };
	return {
		delay,
		duration,
		css: (t) => `transform: scale(${0.6 + 0.4 * step(t, 4)}); opacity: ${step(t, 4)}`
	};
}

/** Draw a line in from the left, a few pixels at a time. */
export function draw(_node: Element, { delay = 0, duration = 280, frames = 10 } = {}): TransitionConfig {
	if (reduced()) return { duration: 0 };
	return {
		delay,
		duration,
		css: (t) => `clip-path: inset(0 ${(1 - step(t, frames)) * 100}% 0 0)`
	};
}

/** Draw an SVG stroke along its length, like a pencil (use pathLength="1" on the path). */
export function pencil(_node: Element, { delay = 0, duration = 420 } = {}): TransitionConfig {
	if (reduced() || duration === 0) return { duration: 0 };
	return {
		delay,
		duration,
		easing: (t) => t * t * (3 - 2 * t),
		css: (t) => `stroke-dashoffset: ${1 - t}`
	};
}
