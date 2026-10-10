// Full-screen pixel dissolve used between pages: the old page breaks into blocks of
// background colour in random order, then the new page is revealed block by block.

const CELL = 14;

let canvas: HTMLCanvasElement | null = null;
let cols = 0;
let rows = 0;

export function attachDissolve(node: HTMLCanvasElement) {
	canvas = node;
	return () => {
		canvas = null;
	};
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function shuffled(n: number): Uint32Array {
	const order = new Uint32Array(n);
	for (let i = 0; i < n; i++) order[i] = i;
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	return order;
}

function run(fill: boolean, duration: number): Promise<void> {
	const c = canvas;
	// Hidden tabs get no animation frames, so skip rather than hold up navigation.
	if (!c || reduced() || document.hidden) {
		c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
		return Promise.resolve();
	}
	if (fill) {
		// One canvas pixel per block; CSS scales it up with crisp edges.
		cols = Math.ceil(innerWidth / CELL);
		rows = Math.ceil(innerHeight / CELL);
		c.width = cols;
		c.height = rows;
		c.style.width = `${cols * CELL}px`;
		c.style.height = `${rows * CELL}px`;
	}
	const ctx = c.getContext('2d')!;
	ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
	const order = shuffled(cols * rows);
	const start = performance.now();
	let done = 0;

	return new Promise((resolve) => {
		// Never let a stalled animation block a page change.
		const fallback = setTimeout(() => {
			if (!fill) ctx.clearRect(0, 0, cols, rows);
			resolve();
		}, duration + 400);
		const frame = (now: number) => {
			const target = Math.min(order.length, Math.ceil(((now - start) / duration) * order.length));
			for (; done < target; done++) {
				const i = order[done];
				const x = i % cols;
				const y = (i / cols) | 0;
				if (fill) ctx.fillRect(x, y, 1, 1);
				else ctx.clearRect(x, y, 1, 1);
			}
			if (done < order.length) requestAnimationFrame(frame);
			else {
				clearTimeout(fallback);
				resolve();
			}
		};
		requestAnimationFrame(frame);
	});
}

export const dissolveOut = () => run(true, 240);
export const dissolveIn = () => run(false, 300);
