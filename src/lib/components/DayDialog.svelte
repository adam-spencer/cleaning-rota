<script lang="ts">
	import { dateRange, shortDate } from '#lib/format.ts';
	import type { Absence, Person } from '#lib/rotation.ts';
	import Dialog from './Dialog.svelte';
	import Shape from './Shape.svelte';

	let {
		day,
		absences,
		people,
		onclose,
		onedit,
		onstart
	}: {
		day: string;
		absences: Absence[];
		people: Person[];
		onclose: () => void;
		onedit: (absence: Absence) => void;
		/** Start picking time off beginning on this day. */
		onstart: (day: string) => void;
	} = $props();

	const peopleById = $derived(new Map(people.map((p) => [p.id, p])));
	const away = $derived(absences.filter((a) => a.start_date <= day && a.end_date >= day));
</script>

<Dialog title={shortDate(day)} {onclose}>
	{#if away.length}
		<ul>
			{#each away as a (a.id)}
				{@const person = peopleById.get(a.person_id)}
				<li>
					<button class="item" onclick={() => onedit(a)}>
						{#if person}<Shape shape={person.shape} colour={person.colour} />{/if}
						<span class="who">{person?.name}</span>
						<span class="dates">{dateRange(a.start_date, a.end_date)}</span>
						{#if a.note}<span class="note">{a.note}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="nobody">Everyone's home.</p>
	{/if}
	<button class="btn solid" onclick={() => onstart(day)}>+ Time off from here</button>
</Dialog>

<style>
	ul {
		list-style: none;
		margin: 0 0 20px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.item {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 10px;
		width: 100%;
		padding: 8px;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}

	.item:hover {
		background: var(--paper-2);
	}

	.who {
		font-weight: 600;
	}

	.dates {
		margin-left: auto;
		font-family: var(--font-head);
		font-size: 13px;
		color: var(--mid);
	}

	.note {
		flex-basis: 100%;
		padding-left: 24px;
		font-size: 15px;
		color: var(--mid);
	}

	.nobody {
		margin: 0 0 20px;
		color: var(--mid);
	}
</style>
