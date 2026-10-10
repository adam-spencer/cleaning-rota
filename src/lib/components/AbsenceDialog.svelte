<script lang="ts">
	import { send } from '#lib/api.ts';
	import { me } from '#lib/me.svelte.ts';
	import type { Absence, Person } from '#lib/rotation.ts';
	import Shape from './Shape.svelte';
	import Dialog from './Dialog.svelte';

	let {
		people,
		absence,
		onclose
	}: {
		people: Person[];
		/** An existing absence (has an id) to edit, or a draft range to create. */
		absence: Omit<Absence, 'id'> & { id?: number };
		onclose: () => void;
	} = $props();

	// The form edits its own copy of the absence it was opened with.
	// svelte-ignore state_referenced_locally
	let form = $state({ ...absence, person_id: absence.person_id || me.id || people[0]?.id });
	let busy = $state(false);
	let confirmDelete = $state(false);

	const editing = $derived(absence.id !== undefined);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		const ok = editing
			? await send('PATCH', `/api/absences/${absence.id}`, form)
			: await send('POST', '/api/absences', form);
		busy = false;
		if (ok) onclose();
	}

	async function remove() {
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		busy = true;
		if (await send('DELETE', `/api/absences/${absence.id}`)) onclose();
		busy = false;
	}
</script>

<Dialog title={editing ? 'Edit time away' : 'Add time away'} {onclose}>
	<form onsubmit={save}>
		<fieldset>
			<legend class="label">Who's away?</legend>
			<div class="people">
				{#each people as person (person.id)}
					<label class="btn person" class:solid={form.person_id === person.id}>
						<input type="radio" name="person" value={person.id} bind:group={form.person_id} class="visually-hidden" />
						<Shape shape={person.shape} colour={person.colour} size={18} />
						{person.name}
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="dates">
			<label>
				<span class="label">From</span>
				<input class="field" type="date" bind:value={form.start_date} required />
			</label>
			<label>
				<span class="label">To</span>
				<input class="field" type="date" bind:value={form.end_date} min={form.start_date} required />
			</label>
		</div>

		<label>
			<span class="label">Note (optional)</span>
			<input class="field" bind:value={form.note} maxlength="80" placeholder="e.g. Visiting family" />
		</label>

		<div class="buttons">
			{#if editing}
				<button type="button" class="btn" class:solid={confirmDelete} onclick={remove} disabled={busy}>
					{confirmDelete ? 'Really delete?' : 'Delete'}
				</button>
			{/if}
			<button class="btn solid save" disabled={busy || !form.person_id}>Save</button>
		</div>
	</form>
</Dialog>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}

	legend {
		margin-bottom: 10px;
	}

	.people {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		padding: 4px;
	}

	.person {
		font-size: 14px;
	}

	.person:has(:focus-visible) {
		outline: var(--px) dashed var(--ink);
		outline-offset: calc(var(--px) * 2);
	}

	label > .label {
		display: block;
		margin-bottom: 6px;
	}

	.dates {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px;
	}

	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 16px;
		padding: 4px;
	}
</style>
