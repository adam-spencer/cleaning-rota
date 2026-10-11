<script lang="ts">
	import { pixelSquiggle } from '#lib/squiggle.ts';
	import { fade } from 'svelte/transition';
	import { draw as reveal } from '#lib/transitions.ts';

	// A pixelated pencil scribble that fills its box; `key` keeps its shape stable.
	// `draw` reveals it a column at a time (duration 0 shows it already finished).
	let {
		key,
		draw = { delay: 0, duration: 0 },
		height = 34,
		cell = 3
	}: { key: string; draw?: { delay: number; duration: number }; height?: number; cell?: number } = $props();

	let width = $state(0);
	const s = $derived(width ? pixelSquiggle(key, width, height, cell) : null);
</script>

<div class="scribble" style:height="{height}px" bind:clientWidth={width} aria-hidden="true" out:fade={{ duration: 120 }}>
	{#if s}
		<svg
			width={s.cols * cell}
			height={s.rows * cell}
			viewBox="0 0 {s.cols} {s.rows}"
			shape-rendering="crispEdges"
			style:left="{s.x}px"
			style:top="{s.y}px"
			in:reveal={{ ...draw, frames: s.cols }}
		>
			<path class="grain" d={s.grain} />
			<path d={s.ink} />
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
		position: absolute;
		display: block;
	}

	path {
		fill: var(--ink);
		opacity: 0.85;
	}

	/* Some pixels come out lighter, like graphite catching on the paper. */
	.grain {
		opacity: 0.4;
	}
</style>
