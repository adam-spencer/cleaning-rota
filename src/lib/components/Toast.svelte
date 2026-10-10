<script lang="ts">
	import { toast } from '#lib/toast.svelte.ts';
	import { slot } from '#lib/transitions.ts';
</script>

<div class="wrap" aria-live="polite">
	{#if toast.message}
		<div class="toast px-box" transition:slot={{ y: 32 }}>{toast.message}</div>
	{/if}
</div>

<style>
	.wrap {
		position: fixed;
		z-index: 50;
		left: 0;
		right: 0;
		bottom: 24px;
		display: flex;
		justify-content: center;
		pointer-events: none;
		padding: 0 20px;
	}

	.toast {
		padding: 10px 16px;
		background: var(--ink);
		color: var(--paper);
		box-shadow:
			0 calc(var(--px) * -1) 0 0 var(--ink),
			0 var(--px) 0 0 var(--ink),
			calc(var(--px) * -1) 0 0 0 var(--ink),
			var(--px) 0 0 0 var(--ink);
	}
</style>
