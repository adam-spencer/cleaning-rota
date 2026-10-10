<script lang="ts">
	import { bitmapPath } from '#lib/icons.ts';

	let { rows, size = 24, label }: { rows: string[]; size?: number; label?: string } = $props();

	const d = $derived(bitmapPath(rows));
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {rows[0]?.length ?? 1} {rows.length}"
	shape-rendering="crispEdges"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path {d} fill="currentColor" />
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
