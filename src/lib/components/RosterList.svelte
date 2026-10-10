<script lang="ts" generics="T extends { id: number; name: string }">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { send } from '#lib/api.ts';
	import { GLYPHS } from '#lib/icons.ts';
	import { pop, wipe } from '#lib/transitions.ts';
	import Pixel from './Pixel.svelte';

	let {
		kind,
		items,
		noun,
		placeholder,
		lead,
		extra = () => ({})
	}: {
		kind: 'people' | 'chores';
		items: T[];
		noun: string;
		placeholder: string;
		/** Shown at the start of each row. */
		lead?: Snippet<[T]>;
		/** Extra fields to send when adding, derived from the typed name. */
		extra?: (name: string) => Record<string, unknown>;
	} = $props();

	// Local copy so reordering moves instantly; resyncs whenever page data reloads.
	let list = $derived(items);
	let newName = $state('');
	let confirming = $state<number | null>(null);

	const url = $derived(`/api/roster/${kind}`);

	async function add(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		// Adding the very first housemate can't require picking who you are.
		if (await send('POST', url, { name, ...extra(name) }, { anonymous: kind === 'people' && items.length === 0 })) {
			newName = '';
		}
	}

	function rename(item: T, input: HTMLInputElement) {
		const name = input.value.trim();
		if (!name) input.value = item.name;
		else if (name !== item.name) send('PATCH', `${url}/${item.id}`, { name });
	}

	async function move(i: number, by: number) {
		const j = i + by;
		if (j < 0 || j >= list.length) return;
		const next = [...list];
		[next[i], next[j]] = [next[j], next[i]];
		list = next;
		if (!(await send('PUT', url, { ids: next.map((x) => x.id) }))) list = items;
	}

	function remove(item: T) {
		if (confirming !== item.id) {
			confirming = item.id;
			return;
		}
		confirming = null;
		send('DELETE', `${url}/${item.id}`);
	}
</script>

<ol class="list">
	{#each list as item, i (item.id)}
		<li class="row" animate:flip={{ duration: 180 }} in:wipe>
			<span class="num label">{i + 1}</span>
			{@render lead?.(item)}
			<input
				class="field name"
				value={item.name}
				aria-label="{noun} name"
				maxlength="32"
				onchange={(e) => rename(item, e.currentTarget)}
				onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			/>
			<div class="actions">
				<button class="btn ghost icon" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move {item.name} up">
					<Pixel rows={GLYPHS.up} size={14} />
				</button>
				<button
					class="btn ghost icon"
					onclick={() => move(i, 1)}
					disabled={i === list.length - 1}
					aria-label="Move {item.name} down"
				>
					<Pixel rows={GLYPHS.down} size={14} />
				</button>
				{#if confirming === item.id}
					<button class="btn solid sure" onclick={() => remove(item)} onblur={() => (confirming = null)} in:pop>
						Remove?
					</button>
				{:else}
					<button class="btn ghost icon" onclick={() => remove(item)} aria-label="Remove {item.name}">
						<Pixel rows={GLYPHS.cross} size={14} />
					</button>
				{/if}
			</div>
		</li>
	{/each}
</ol>

<form class="add" onsubmit={add}>
	<input class="field" bind:value={newName} {placeholder} maxlength="32" aria-label="New {noun} name" />
	<button class="btn solid" disabled={!newName.trim()}>
		<Pixel rows={GLYPHS.plus} size={14} /> Add
	</button>
</form>

<style>
	.list {
		list-style: none;
		margin: 0 0 20px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--paper);
	}

	.num {
		width: 18px;
		text-align: right;
		flex: none;
	}

	.name {
		flex: 1;
		min-width: 0;
	}

	.actions {
		display: flex;
		flex: none;
	}

	.sure {
		font-size: 13px;
		padding: 6px 8px;
	}

	.add {
		display: flex;
		gap: 12px;
	}

	.add .field {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.actions .btn.icon {
			min-width: 32px;
			padding: 4px;
		}
	}
</style>
