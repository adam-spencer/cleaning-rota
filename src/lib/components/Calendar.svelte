<script lang="ts">
	import { MONTH_NAMES, shortDate } from '#lib/format.ts';
	import { GLYPHS } from '#lib/icons.ts';
	import { addDays, daysBetween, type Absence, type Person } from '#lib/rotation.ts';
	import { draw, slot } from '#lib/transitions.ts';
	import Pixel from './Pixel.svelte';

	let {
		month,
		gridStart,
		weeks: weekCount,
		absences,
		people,
		today,
		currentWeek,
		range = null,
		onmonth,
		onday,
		onrange,
		onabsence,
		weeksBox = $bindable({ top: 0, height: 0 })
	}: {
		month: string;
		gridStart: string;
		weeks: number;
		absences: Absence[];
		people: Person[];
		today: string;
		currentWeek: string;
		/** Days to highlight, e.g. while picking a range. */
		range?: [string, string] | null;
		onmonth: (month: string, dir: number) => void;
		onday: (day: string) => void;
		/** Finished dragging across several days. */
		onrange: (from: string, to: string) => void;
		onabsence: (absence: Absence) => void;
		/** Where the week rows sit inside this component, for lining things up beside it. */
		weeksBox?: { top: number; height: number };
	} = $props();

	let dir = $state(1);
	let dragFrom = $state<string | null>(null);
	let dragTo = $state<string | null>(null);
	let root: HTMLElement;
	let weeksEl: HTMLElement;

	const [year, monthNum] = $derived(month.split('-').map(Number));
	const peopleById = $derived(new Map(people.map((p) => [p.id, p])));

	const shown = $derived.by(() => {
		if (dragFrom && dragTo && dragFrom !== dragTo) return dragFrom < dragTo ? [dragFrom, dragTo] : [dragTo, dragFrom];
		return range;
	});

	const rows = $derived(
		Array.from({ length: weekCount }, (_, w) => {
			const weekStart = addDays(gridStart, w * 7);
			const weekEnd = addDays(weekStart, 6);
			const days = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d));

			// Stack overlapping absences so their lines never sit on top of each other.
			const laneEnds: number[] = [];
			const lines = absences
				.filter((a) => a.end_date >= weekStart && a.start_date <= weekEnd)
				.map((a) => {
					const from = Math.max(0, daysBetween(weekStart, a.start_date));
					const to = Math.min(6, daysBetween(weekStart, a.end_date));
					let lane = laneEnds.findIndex((end) => end < from);
					if (lane === -1) lane = laneEnds.length;
					laneEnds[lane] = to;
					return {
						absence: a,
						from,
						to,
						lane,
						left: a.start_date < weekStart,
						right: a.end_date > weekEnd
					};
				});
			const when = weekStart < currentWeek ? 'past' : weekStart > currentWeek ? 'future' : 'now';
			return { weekStart, days, lines, lanes: laneEnds.length, when };
		})
	);

	const thisMonth = $derived(today.slice(0, 7));

	function goThisMonth() {
		if (month === thisMonth) return;
		dir = thisMonth > month ? 1 : -1;
		onmonth(thisMonth, dir);
	}

	function goMonth(by: number) {
		dir = by;
		const d = new Date(Date.UTC(year, monthNum - 1 + by, 1));
		onmonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, by);
	}

	// One gesture model for mouse, touch and pen: press a day, optionally drag, release.
	// Different day = a range (onrange, on release); same day = a tap (onday, on click).
	// Taps wait for the click: on touch it arrives after pointerup and lands on whatever is
	// under the finger by then, so opening a dialog on pointerup lets it hit the backdrop.
	let ranged = false;

	function down(e: PointerEvent, day: string) {
		if (e.button !== 0) return;
		dragFrom = dragTo = day;
		ranged = false;
	}

	function move(e: PointerEvent) {
		if (!dragFrom) return;
		// Touch keeps targeting the day the finger went down on, so look up what's under it.
		const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-day]');
		if (el?.dataset.day) dragTo = el.dataset.day;
	}

	function up() {
		if (!dragFrom) return;
		const from = dragFrom;
		const to = dragTo ?? dragFrom;
		dragFrom = dragTo = null;
		if (from === to) return;
		ranged = true;
		onrange(from, to);
	}

	function click(day: string) {
		if (ranged) ranged = false;
		else onday(day);
	}

	$effect(() => {
		// Re-measure whenever the grid changes size.
		void weekCount;
		const measure = () => {
			if (!root || !weeksEl) return;
			weeksBox = { top: weeksEl.offsetTop - root.offsetTop, height: weeksEl.offsetHeight };
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(weeksEl);
		return () => ro.disconnect();
	});
</script>

<svelte:window onpointermove={move} onpointerup={up} onpointercancel={() => (dragFrom = dragTo = null)} />

<div class="calendar" bind:this={root}>
	<div class="monthbar">
		<button class="nav" onclick={() => goMonth(-1)} aria-label="Previous month"><Pixel rows={GLYPHS.left} size={12} /></button>
		<button class="title" onclick={goThisMonth} disabled={month === thisMonth} aria-label="Back to this month">
			{#key month}
				<h2 in:slot={{ y: 8 * dir, duration: 200 }}>{MONTH_NAMES[monthNum - 1]} {year}</h2>
			{/key}
		</button>
		<button class="nav" onclick={() => goMonth(1)} aria-label="Next month"><Pixel rows={GLYPHS.right} size={12} /></button>
	</div>

	<div class="dow" aria-hidden="true">
		{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d, i (i)}<span>{d}</span>{/each}
	</div>

	<div class="weeks" bind:this={weeksEl}>
		{#each rows as week (week.weekStart)}
			<div class="week {week.when}">
				{#each week.days as day, d (day)}
					{@const selected = shown && day >= shown[0] && day <= shown[1]}
					<button
						class="day"
						class:out={!day.startsWith(month)}
						class:today={day === today}
						class:selected
						style:grid-column={d + 1}
						data-day={day}
						aria-label={shortDate(day)}
						onpointerdown={(e) => down(e, day)}
						onclick={() => click(day)}
					>
						<span class="num">{Number(day.slice(8))}</span>
					</button>
				{/each}

				{#each week.lines as line (line.absence.id)}
					{@const person = peopleById.get(line.absence.person_id)}
					<button
						class="line"
						class:left={line.left}
						class:right={line.right}
						style:grid-column="{line.from + 1} / {line.to + 2}"
						style:--colour={person?.colour}
						style:--offset="{(line.lane - (week.lanes - 1) / 2) * 9}px"
						aria-label="{person?.name} away {shortDate(line.absence.start_date)} to {shortDate(line.absence.end_date)}"
						onclick={() => onabsence(line.absence)}
						in:draw={{ delay: 80 + line.from * 30 }}
					></button>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.calendar {
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	.monthbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.title {
		flex: 1;
		display: grid;
		min-height: 36px;
		align-items: center;
		padding: 0;
		border: 0;
		background: none;
		text-align: center;
		overflow: hidden;
		cursor: pointer;
	}

	.title:disabled {
		cursor: default;
	}

	.title:not(:disabled):hover h2 {
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}

	.title h2 {
		grid-area: 1 / 1;
		font-size: 18px;
	}

	.nav {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--mid);
	}

	.nav:hover {
		color: var(--ink);
	}

	.dow,
	.week {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--px);
	}

	.dow {
		margin-bottom: var(--px);
		font-family: var(--font-head);
		font-size: 12px;
		color: var(--mid);
		text-align: center;
	}

	.weeks {
		display: flex;
		flex-direction: column;
		gap: var(--px);
		/* Dragging across days selects them instead of scrolling the page. */
		touch-action: none;
	}

	.day {
		grid-row: 1;
		aspect-ratio: 1;
		display: flex;
		align-items: flex-start;
		padding: 4px 5px;
		border: 0;
		background: var(--day-future);
		cursor: pointer;
		transition: background-color 200ms steps(3);
	}

	.past .day {
		background: var(--day-past);
	}

	.now .day {
		background: var(--day-now);
		box-shadow: inset 0 0 0 2px var(--soft);
	}

	.day:hover {
		box-shadow: inset 0 0 0 2px var(--ink);
	}

	.day.selected {
		box-shadow: inset 0 0 0 var(--px) var(--ink);
	}

	.num {
		font-family: var(--font-head);
		font-size: 12px;
		line-height: 1;
		padding: 2px 3px;
	}

	.past .num,
	.future .num {
		color: var(--mid);
	}

	.out .num {
		opacity: 0.45;
	}

	.today .num {
		background: var(--ink);
		color: var(--paper);
		opacity: 1;
	}

	/* An absence: a coloured line through the days, with a generous invisible hit area. */
	.line {
		grid-row: 1;
		align-self: center;
		z-index: 1;
		height: 16px;
		margin: 0 12px;
		padding: 6px 0;
		border: 0;
		background: var(--colour) content-box;
		translate: 0 var(--offset);
		cursor: pointer;
	}

	/* Lines carrying on from (or into) another week run right to the edge. */
	.line.left {
		margin-left: 0;
	}

	.line.right {
		margin-right: 0;
	}

	.line:hover {
		padding: 5px 0;
	}
</style>
