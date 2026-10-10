<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	// A pixel-art "{" whose arms always span the full height; only its point moves.
	let { height, point }: { height: number; point: number } = $props();

	const U = 4; // one "pixel" of the brace

	const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	// svelte-ignore state_referenced_locally
	const tween = new Tween(point, { duration: reduced ? 0 : 380, easing: cubicOut });
	$effect(() => {
		tween.target = point;
	});

	const rects = $derived.by(() => {
		const h = Math.floor(height / U);
		if (h < 10) return [];
		// Snap the moving point to the pixel grid so it steps like a sprite.
		const c = Math.min(h - 5, Math.max(4, Math.round(tween.current / U)));
		return [
			[0, 0, 2, 1], // top arm
			[2, 1, 1, c - 3], // upper spine
			[3, c - 2, 1, 1],
			[4, c - 1, 1, 2], // point
			[3, c + 1, 1, 1],
			[2, c + 2, 1, h - c - 3], // lower spine
			[0, h - 1, 2, 1] // bottom arm
		];
	});
</script>

<svg width={5 * U} {height} aria-hidden="true">
	{#each rects as [x, y, w, h], i (i)}
		<rect x={x * U} y={y * U} width={w * U} height={h * U} />
	{/each}
</svg>

<style>
	svg {
		display: block;
		fill: var(--ink);
		shape-rendering: crispEdges;
		/* Drawn as "}", mirrored so the point aims back at the calendar. */
		transform: scaleX(-1);
	}
</style>
