<script lang="ts">
	import { goto } from '$app/navigation';
	import { shortDate } from '#lib/format.ts';
	import { me } from '#lib/me.svelte.ts';
	import type { Absence } from '#lib/rotation.ts';
	import { pop } from '#lib/transitions.ts';
	import AbsenceDialog from '#lib/components/AbsenceDialog.svelte';
	import Calendar from '#lib/components/Calendar.svelte';
	import DayDialog from '#lib/components/DayDialog.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Draft = Omit<Absence, 'id'> & { id?: number };

	let editing = $state<Draft | null>(null);
	/** The day whose details are open. */
	let viewing = $state<string | null>(null);
	/** Picking time off: the first day is chosen, waiting for the last. */
	let start = $state<string | null>(null);

	function draft(from: string, to: string) {
		const [s, e] = to < from ? [to, from] : [from, to];
		editing = { person_id: me.id ?? 0, start_date: s, end_date: e, note: '' };
		start = null;
	}

	function tapDay(day: string) {
		if (start) draft(start, day);
		else viewing = day;
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (start = null)} />

<Calendar
	{...data.calendar}
	people={data.people}
	today={data.today}
	currentWeek={data.current}
	range={start ? [start, start] : null}
	onmonth={(m) => goto(m === data.today.slice(0, 7) ? '/calendar' : `/calendar?m=${m}`, { reset: false })}
	onday={tapDay}
	onrange={draft}
	onabsence={(a) => (editing = { ...a })}
/>

<div class="hint">
	{#if start}
		<p in:pop>From {shortDate(start)} — tap the last day away</p>
		<div class="actions">
			<button class="btn" onclick={() => draft(start!, start!)}>Just this day</button>
			<button class="btn ghost" onclick={() => (start = null)}>Cancel</button>
		</div>
	{:else}
		<p class="label">Tap a day, or drag across days, to add time off</p>
	{/if}
</div>

{#if viewing}
	<DayDialog
		day={viewing}
		absences={data.calendar.absences}
		people={data.people}
		onclose={() => (viewing = null)}
		onedit={(a) => {
			viewing = null;
			editing = { ...a };
		}}
		onstart={(day) => {
			viewing = null;
			start = day;
		}}
	/>
{/if}

{#if editing}
	<AbsenceDialog people={data.people} absence={editing} onclose={() => (editing = null)} />
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		min-height: 48px;
		margin-top: 16px;
	}

	.hint p {
		margin: 0;
	}

	.actions {
		display: flex;
		gap: 12px;
		padding: 4px;
	}
</style>
