<script lang="ts">
	import { SHAPES, isShape } from '#lib/icons.ts';
	import Pixel from './Pixel.svelte';

	let { shape, colour, size = 14 }: { shape: string; colour: string; size?: number } = $props();
</script>

<span style:color={colour}><Pixel rows={SHAPES[isShape(shape) ? shape : 'square']} {size} /></span>

<style>
	span {
		display: inline-block;
		flex: none;
		line-height: 0;
	}
</style>
