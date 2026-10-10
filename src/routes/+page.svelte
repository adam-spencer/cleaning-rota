<script lang="ts">
	import { goto } from '$app/navigation';
	import { addDays, mondayOf, type Absence } from '#lib/rotation.ts';
	import { shortDate } from '#lib/format.ts';
	import { pop } from '#lib/transitions.ts';
	import AbsenceDialog from '#lib/components/AbsenceDialog.svelte';
	import DayDialog from '#lib/components/DayDialog.svelte';
	import Brace from '#lib/components/Brace.svelte';
	import Calendar from '#lib/components/Calendar.svelte';
	import ChoreList from '#lib/components/ChoreList.svelte';
	import { me } from '#lib/me.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Draft = Omit<Absence, 'id'> & { id?: number };

	let dir = $state(1);
	let editing = $state<Draft | null>(null);
	/** The day whose details are open. */
	let viewing = $state<string | null>(null);
	/** Picking time off: the first day is chosen, waiting for the last. */
	let start = $state<string | null>(null);
	let weeksBox = $state({ top: 0, height: 0 });

	const cal = $derived(data.calendar);
	const rowIndex = $derived(
		Math.round((Date.parse(data.week) - Date.parse(cal.gridStart)) / (7 * 86_400_000))
	);
	const braceVisible = $derived(rowIndex >= 0 && rowIndex < cal.weeks);
	const rowHeight = $derived(weeksBox.height / cal.weeks);

	function show(week: string, month: string) {
		const params = new URLSearchParams();
		if (week !== data.current) params.set('week', week);
		if (month !== data.today.slice(0, 7) || params.size) params.set('m', month);
		goto(params.size ? `/?${params}` : '/', { reset: false });
	}

	function selectWeek(week: string, month = cal.month) {
		if (week === data.week && month === cal.month) return;
		dir = week >= data.week ? 1 : -1;
		show(week, month);
	}

	function stepWeek(by: number) {
		const week = addDays(data.week, 7 * by);
		dir = by;
		// Keep the calendar on the month the newly selected week mostly falls in.
		show(week, addDays(week, 3).slice(0, 7));
	}

	function goToday() {
		dir = data.current >= data.week ? 1 : -1;
		show(data.current, data.today.slice(0, 7));
	}

	function changeMonth(month: string) {
		// Point at this week if it's in that month, otherwise the month's first week.
		const week = data.today.startsWith(month) ? data.current : mondayOf(`${month}-01`);
		selectWeek(week, month);
	}

	function draft(from: string, to: string) {
		const [s, e] = to < from ? [to, from] : [from, to];
		editing = { person_id: me.id ?? 0, start_date: s, end_date: e, note: '' };
		start = null;
	}

	/** First click on a week selects it; clicking a day in the selected week opens that day. */
	function clickDay(day: string) {
		if (start) draft(start, day);
		else if (mondayOf(day) === data.week) viewing = day;
		else selectWeek(mondayOf(day));
	}

	function keydown(e: KeyboardEvent) {
		if (e.key === 'Escape') start = null;
		if (editing || viewing || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select'))) return;
		if (e.key === 'ArrowLeft') stepWeek(-1);
		if (e.key === 'ArrowRight') stepWeek(1);
	}
</script>

<svelte:window onkeydown={keydown} />

{#if data.empty}
	<section class="empty">
		<p>Nobody's on the rota yet.</p>
		<a class="btn solid" href="/setup">Set up the house</a>
	</section>
{:else}
	<div class="home">
		<section class="cal">
			<Calendar
				{...cal}
				people={data.people}
				today={data.today}
				currentWeek={data.current}
				onmonth={changeMonth}
				range={start ? [start, start] : null}
				onday={clickDay}
				onrange={draft}
				onabsence={(a) => (editing = { ...a })}
				bind:weeksBox
			/>
			<div class="below">
				{#if start}
					<p in:pop>From {shortDate(start)} — click the last day away</p>
					<button class="btn" onclick={() => draft(start!, start!)}>Just this day</button>
					<button class="btn ghost" onclick={() => (start = null)}>Cancel</button>
				{:else}
					<p class="label">Drag across days to add time off</p>
				{/if}
			</div>
		</section>

		<div class="brace" style:padding-top="{weeksBox.top}px" aria-hidden="true">
			{#if braceVisible && weeksBox.height}
				<Brace height={weeksBox.height} point={(rowIndex + 0.5) * rowHeight} />
			{/if}
		</div>

		<section class="list" style:--top="{weeksBox.top}px" style:--rows="{weeksBox.height}px">
			<ChoreList week={data.week} currentWeek={data.current} assignments={data.assignments} {dir} onweek={stepWeek} ontoday={goToday} />
		</section>
	</div>
{/if}

{#if viewing}
	<DayDialog
		day={viewing}
		absences={cal.absences}
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
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 48px 0;
		color: var(--mid);
	}

	.cal,
	.brace {
		display: none;
	}

	@media (min-width: 900px) {
		.home {
			display: grid;
			grid-template-columns: minmax(340px, 440px) 20px minmax(0, 1fr);
			gap: 28px;
			align-items: start;
		}

		.cal,
		.brace {
			display: block;
		}

		.below {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 12px;
			min-height: 48px;
			margin-top: 12px;
			padding: 4px;
		}

		.below p {
			margin: 0;
			font-size: 15px;
		}

		.below .btn {
			font-size: 12px;
		}

		/* Centre the chores against the calendar's week rows, where the brace points. */
		.list {
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-height: calc(var(--top) + var(--rows));
			padding-top: var(--top);
		}
	}
</style>
