<script lang="ts">
	import { squiggle } from '#lib/squiggle.ts';
	import { fade } from 'svelte/transition';
	import { pencil } from '#lib/transitions.ts';

	// A pencil scribble that fills its box; `key` keeps its shape stable.
	// `draw` animates it stroke by stroke (duration 0 shows it already finished).
	let {
		key,
		draw = { delay: 0, duration: 0 },
		height = 34
	}: { key: string; draw?: { delay: number; duration: number }; height?: number } = $props();

	let width = $state(0);
	const d = $derived(width ? squiggle(key, width, height) : '');
</script>

<div class="scribble" style:height="{height}px" bind:clientWidth={width} aria-hidden="true" out:fade={{ duration: 120 }}>
	{#if d}
		<svg {width} {height} viewBox="0 0 {width} {height}">
			<path class="graphite" {d} pathLength="1" in:pencil={{ delay: draw.delay + 40, duration: draw.duration }} />
			<path {d} pathLength="1" in:pencil={draw} />
		</svg>
	{/if}
</div>

<style>
	.scribble {
		position: absolute;
		left: -4px;
		right: -4px;
		top: 50%;
		translate: 0 -50%;
		pointer-events: none;
	}

	svg {
		display: block;
		overflow: visible;
	}

	path {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: miter;
		stroke-miterlimit: 3;
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
		opacity: 0.85;
	}

	/* A fainter, offset second pass gives it a graphite texture. */
	.graphite {
		stroke-width: 1.2;
		opacity: 0.35;
		translate: 0.6px 1.4px;
	}
</style>
