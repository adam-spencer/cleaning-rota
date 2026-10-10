<script lang="ts">
	import type { Person } from '#lib/rotation.ts';
	import { me } from '#lib/me.svelte.ts';
	import { pop } from '#lib/transitions.ts';
	import Shape from './Shape.svelte';
	import Dialog from './Dialog.svelte';

	let { people }: { people: Person[] } = $props();
</script>

{#if me.asking}
	<Dialog title="Who are you?" onclose={() => me.cancel()}>
		{#if people.length}
			<p class="hint">So the house knows who changed what. You'll only be asked once on this device.</p>
			<div class="grid">
				{#each people as person, i (person.id)}
					<button
						class="btn person"
						class:current={me.id === person.id}
						onclick={() => me.set(person.id)}
						in:pop={{ delay: 60 + i * 40 }}
					>
						<Shape shape={person.shape} colour={person.colour} size={18} />
						<span>{person.name}</span>
					</button>
				{/each}
			</div>
		{:else}
			<p class="hint">Nobody lives here yet! Add housemates in setup first.</p>
			<a class="btn solid" href="/setup" onclick={() => me.cancel()}>Go to setup</a>
		{/if}
	</Dialog>
{/if}

<style>
	.hint {
		margin: 0 0 20px;
		color: var(--mid);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 16px;
		padding: 4px;
	}

	.person {
		flex-direction: column;
		padding: 14px 8px 10px;
		font-size: 15px;
		overflow-wrap: anywhere;
	}

	.person.current {
		background: var(--ink);
		color: var(--paper);
	}
</style>
