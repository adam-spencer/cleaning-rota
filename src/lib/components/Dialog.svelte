<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { wipe } from '#lib/transitions.ts';

	let {
		title,
		onclose,
		children
	}: { title: string; onclose: () => void; children: Snippet } = $props();

	function keydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function focusFirst(node: HTMLElement) {
		(node.querySelector('input, select, textarea, button:not(.close)') as HTMLElement | null)?.focus();
	}
</script>

<svelte:window onkeydown={keydown} />

<div class="backdrop" transition:fade={{ duration: 120 }} onclick={onclose} role="presentation"></div>
<div class="dialog px-box" role="dialog" aria-modal="true" aria-label={title} transition:wipe={{ duration: 220 }} {@attach focusFirst}>
	<header>
		<h2>{title}</h2>
		<button class="btn ghost icon close" onclick={onclose} aria-label="Close">✕</button>
	</header>
	{@render children()}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--ink) 35%, transparent);
	}

	.dialog {
		position: fixed;
		z-index: 41;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
		width: min(440px, calc(100vw - 40px));
		max-height: calc(100dvh - 40px);
		overflow: auto;
		padding: 20px;
		background: var(--paper);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	h2 {
		font-size: 20px;
	}
</style>
